use std::{
    collections::{HashMap, VecDeque},
    net::SocketAddr,
    path::{Path, PathBuf},
    sync::Arc,
    time::{Duration, Instant},
};

use axum::{
    extract::{Path as AxumPath, Request, State},
    http::{header, HeaderMap, HeaderValue, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::{
    migrate::MigrateError,
    sqlite::{SqliteConnectOptions, SqlitePoolOptions},
    Row, SqlitePool,
};
use tokio::signal;
use tower_http::{
    services::{ServeDir, ServeFile},
    trace::TraceLayer,
};
use tracing::{info, warn};
use uuid::Uuid;

#[derive(Clone)]
struct AppState {
    pool: SqlitePool,
    build_sha: String,
}

#[derive(Clone, Default)]
struct RateLimiter {
    requests: Arc<tokio::sync::Mutex<HashMap<String, VecDeque<Instant>>>>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Entry {
    id: String,
    kind: String,
    title: String,
    body: String,
    source_path: String,
    source_revision: String,
    updated_at: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Release {
    id: String,
    version: String,
    notes: String,
    content: String,
    created_at: String,
    stale_count: i64,
}

#[derive(Serialize)]
struct ProjectState {
    entries: Vec<Entry>,
    releases: Vec<Release>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct EntryInput {
    kind: String,
    title: String,
    body: String,
    source_path: String,
    source_revision: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReleaseInput {
    version: String,
    notes: String,
    entry_ids: Vec<String>,
}

#[derive(Serialize)]
struct ErrorBody {
    error: String,
}

type ApiResult<T> = Result<Json<T>, (StatusCode, Json<ErrorBody>)>;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .json()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();
    let port = std::env::var("PORT")
        .ok()
        .and_then(|v| v.parse::<u16>().ok())
        .unwrap_or(8080);
    let build_sha = option_env!("BUILD_SHA").unwrap_or("dev").to_owned();
    let (data_dir, supplied) = data_directory();
    std::fs::create_dir_all(&data_dir).expect("create data directory");
    let database_path = data_dir.join("project-memory-release.sqlite3");
    let pool = open_database_with_retry(
        &database_path,
        30,
        Duration::from_secs(2),
        Duration::from_secs(5),
    )
    .await
    .expect("initialize SQLite");
    info!(port, data_dir = %data_dir.display(), data_dir_source = if supplied { "supplied" } else { "generated-default" }, "configuration ready");

    let state = AppState { pool, build_sha };
    let api = Router::new()
        .route("/state", get(get_state))
        .route("/entries", post(create_entry))
        .route("/entries/{id}", put(update_entry).delete(delete_entry))
        .route("/releases", post(create_release))
        .route("/demo/session", post(demo_session))
        .layer(middleware::from_fn_with_state(
            RateLimiter::default(),
            rate_limit,
        ));
    let dist = std::env::var("DIST_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("dist"));
    let index = dist.join("index.html");
    let files = ServeDir::new(&dist).not_found_service(ServeFile::new(&index));
    let app = Router::new()
        .route("/health", get(health))
        .nest("/api", api)
        .route_service("/", ServeFile::new(&index))
        .route_service("/demo", ServeFile::new(&index))
        .route_service("/workspace", ServeFile::new(&index))
        .route_service("/privacy", ServeFile::new(&index))
        .route_service("/terms", ServeFile::new(&index))
        .fallback_service(files)
        .with_state(state)
        .layer(middleware::from_fn(security_headers))
        .layer(TraceLayer::new_for_http());

    let address = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(address)
        .await
        .expect("bind server");
    info!(%address, "server listening");
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown())
        .await
        .expect("serve application");
}

#[derive(Debug)]
enum DatabaseStartupError {
    Connect(sqlx::Error),
    Migrate(MigrateError),
}

impl std::fmt::Display for DatabaseStartupError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Connect(error) => write!(formatter, "connect to SQLite: {error}"),
            Self::Migrate(error) => write!(formatter, "run database migrations: {error}"),
        }
    }
}

impl std::error::Error for DatabaseStartupError {}

async fn open_database_with_retry(
    database_path: &Path,
    attempts: usize,
    retry_delay: Duration,
    busy_timeout: Duration,
) -> Result<SqlitePool, DatabaseStartupError> {
    let attempts = attempts.max(1);
    for attempt in 1..=attempts {
        let options = sqlite_connect_options(database_path, busy_timeout);
        let pool = match SqlitePoolOptions::new()
            // The deployed service is deliberately single-replica and its database is
            // on an Azure Files mount. One connection avoids self-contention on that
            // network filesystem while still allowing the async service to queue work.
            .max_connections(1)
            .connect_with(options)
            .await
        {
            Ok(pool) => pool,
            Err(error) if sqlite_error_is_busy(&error) && attempt < attempts => {
                warn!(
                    attempt,
                    attempts, "SQLite is busy during connect; retrying startup"
                );
                tokio::time::sleep(retry_delay).await;
                continue;
            }
            Err(error) => return Err(DatabaseStartupError::Connect(error)),
        };

        match sqlx::migrate!().run(&pool).await {
            Ok(()) => return Ok(pool),
            Err(error) if migration_error_is_busy(&error) && attempt < attempts => {
                warn!(
                    attempt,
                    attempts, "SQLite is busy during migration; retrying startup"
                );
                pool.close().await;
                tokio::time::sleep(retry_delay).await;
            }
            Err(error) => {
                pool.close().await;
                return Err(DatabaseStartupError::Migrate(error));
            }
        }
    }

    unreachable!("the startup loop always returns on its final attempt")
}

fn sqlite_connect_options(database_path: &Path, busy_timeout: Duration) -> SqliteConnectOptions {
    let options = SqliteConnectOptions::new()
        .filename(database_path)
        .create_if_missing(true)
        .foreign_keys(true)
        .busy_timeout(busy_timeout);
    #[cfg(unix)]
    // Azure Files is mounted over SMB, where SQLite's default POSIX byte-range
    // locks can remain busy even with one pod. The dotfile VFS uses atomic
    // filesystem lock artifacts while retaining normal rollback journaling.
    let options = options.vfs("unix-dotfile");
    options
}

fn sqlite_error_is_busy(error: &sqlx::Error) -> bool {
    match error {
        sqlx::Error::Database(database) => matches!(database.code().as_deref(), Some("5" | "6")),
        _ => false,
    }
}

fn migration_error_is_busy(error: &MigrateError) -> bool {
    match error {
        MigrateError::Execute(error) | MigrateError::ExecuteMigration(error, _) => {
            sqlite_error_is_busy(error)
        }
        _ => false,
    }
}

fn data_directory() -> (PathBuf, bool) {
    if let Ok(dir) = std::env::var("DATA_DIR") {
        return (PathBuf::from(dir), true);
    }
    if Path::new("/data").is_dir() {
        (PathBuf::from("/data"), false)
    } else {
        (PathBuf::from("data"), false)
    }
}

async fn shutdown() {
    let ctrl_c = async { signal::ctrl_c().await.expect("install Ctrl+C handler") };
    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("install signal handler")
            .recv()
            .await;
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();
    tokio::select! { _ = ctrl_c => {}, _ = terminate => {} }
    info!("graceful shutdown started");
}

async fn security_headers(request: Request, next: Next) -> Response {
    let path = request.uri().path().to_owned();
    let mut response = next.run(request).await;
    let headers = response.headers_mut();
    headers.insert(
        header::X_CONTENT_TYPE_OPTIONS,
        HeaderValue::from_static("nosniff"),
    );
    headers.insert(
        header::REFERRER_POLICY,
        HeaderValue::from_static("strict-origin-when-cross-origin"),
    );
    headers.insert(
        "permissions-policy",
        HeaderValue::from_static("camera=(), microphone=(), geolocation=()"),
    );
    headers.insert("content-security-policy", HeaderValue::from_static("default-src 'self'; img-src 'self' data:; font-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self' https://api.sociobot.in; object-src 'none'; base-uri 'self'; form-action 'self' https://api.sociobot.in; frame-ancestors 'none'"));
    let cache_control = if path.starts_with("/api/") || path == "/health" {
        // Workspace state and health are dynamic; neither may be served from an
        // HTTP cache after a mutation or deployment.
        "no-store"
    } else if path.starts_with("/assets/") {
        // Vite gives every compiled asset a content hash. Public product art is
        // deployed with the same immutable release image, so it is versioned by
        // the container revision as well.
        "public, max-age=31536000, immutable"
    } else if path == "/sw.js"
        || path.ends_with(".html")
        || matches!(
            path.as_str(),
            "/" | "/demo" | "/workspace" | "/privacy" | "/terms"
        )
    {
        // Always revalidate the HTML shell and worker so a new release can
        // update its asset manifest and service-worker cache.
        "no-cache, max-age=0, must-revalidate"
    } else {
        "public, max-age=86400"
    };
    headers.insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static(cache_control),
    );
    response
}

async fn rate_limit(State(limiter): State<RateLimiter>, request: Request, next: Next) -> Response {
    let key = request
        .headers()
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.split(',').next())
        .unwrap_or("local")
        .trim()
        .to_owned();
    let now = Instant::now();
    let mut all = limiter.requests.lock().await;
    let queue = all.entry(key).or_default();
    while queue
        .front()
        .is_some_and(|time| now.duration_since(*time) > Duration::from_secs(1))
    {
        queue.pop_front();
    }
    if queue.len() >= 40 {
        drop(all);
        let mut response = (
            StatusCode::TOO_MANY_REQUESTS,
            Json(ErrorBody {
                error: "Too many requests. Wait one second and try again.".into(),
            }),
        )
            .into_response();
        response
            .headers_mut()
            .insert(header::RETRY_AFTER, HeaderValue::from_static("1"));
        return response;
    }
    queue.push_back(now);
    drop(all);
    next.run(request).await
}

async fn health(State(state): State<AppState>) -> Json<serde_json::Value> {
    Json(serde_json::json!({"status":"ok", "build_sha": state.build_sha}))
}

async fn get_state(State(state): State<AppState>, headers: HeaderMap) -> ApiResult<ProjectState> {
    let workspace = workspace_id(&headers)?;
    project_state(&state.pool, &workspace)
        .await
        .map(Json)
        .map_err(internal_error)
}

async fn project_state(pool: &SqlitePool, workspace: &str) -> Result<ProjectState, sqlx::Error> {
    let entry_rows = sqlx::query("SELECT id, kind, title, body, source_path, source_revision, updated_at FROM entries WHERE workspace_id = ? ORDER BY updated_at DESC").bind(workspace).fetch_all(pool).await?;
    let entries = entry_rows
        .into_iter()
        .map(|r| Entry {
            id: r.get(0),
            kind: r.get(1),
            title: r.get(2),
            body: r.get(3),
            source_path: r.get(4),
            source_revision: r.get(5),
            updated_at: r.get(6),
        })
        .collect();
    let release_rows = sqlx::query("SELECT r.id, r.version, r.notes, r.content, r.created_at, COALESCE(SUM(CASE WHEN e.id IS NULL OR e.source_revision != rs.source_revision THEN 1 ELSE 0 END), 0) stale_count FROM releases r LEFT JOIN release_sources rs ON rs.release_id = r.id LEFT JOIN entries e ON e.id = rs.entry_id WHERE r.workspace_id = ? GROUP BY r.id ORDER BY r.created_at DESC").bind(workspace).fetch_all(pool).await?;
    let releases = release_rows
        .into_iter()
        .map(|r| Release {
            id: r.get(0),
            version: r.get(1),
            notes: r.get(2),
            content: r.get(3),
            created_at: r.get(4),
            stale_count: r.get(5),
        })
        .collect();
    Ok(ProjectState { entries, releases })
}

async fn create_entry(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<EntryInput>,
) -> ApiResult<Entry> {
    let workspace = workspace_id(&headers)?;
    validate_entry(&input).map_err(bad_request)?;
    let entry = Entry {
        id: Uuid::new_v4().to_string(),
        kind: input.kind,
        title: input.title.trim().into(),
        body: input.body.trim().into(),
        source_path: input.source_path.trim().into(),
        source_revision: input.source_revision.trim().into(),
        updated_at: Utc::now().to_rfc3339(),
    };
    sqlx::query("INSERT INTO entries (id, workspace_id, kind, title, body, source_path, source_revision, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(&entry.id).bind(workspace).bind(&entry.kind).bind(&entry.title).bind(&entry.body).bind(&entry.source_path).bind(&entry.source_revision).bind(&entry.updated_at).execute(&state.pool).await.map_err(internal_error)?;
    Ok(Json(entry))
}

async fn update_entry(
    State(state): State<AppState>,
    headers: HeaderMap,
    AxumPath(id): AxumPath<String>,
    Json(input): Json<EntryInput>,
) -> ApiResult<Entry> {
    let workspace = workspace_id(&headers)?;
    validate_entry(&input).map_err(bad_request)?;
    let entry = Entry {
        id,
        kind: input.kind,
        title: input.title.trim().into(),
        body: input.body.trim().into(),
        source_path: input.source_path.trim().into(),
        source_revision: input.source_revision.trim().into(),
        updated_at: Utc::now().to_rfc3339(),
    };
    let result = sqlx::query("UPDATE entries SET kind = ?, title = ?, body = ?, source_path = ?, source_revision = ?, updated_at = ? WHERE id = ? AND workspace_id = ?")
        .bind(&entry.kind).bind(&entry.title).bind(&entry.body).bind(&entry.source_path).bind(&entry.source_revision).bind(&entry.updated_at).bind(&entry.id).bind(workspace).execute(&state.pool).await.map_err(internal_error)?;
    if result.rows_affected() == 0 {
        return Err(not_found("That source no longer exists."));
    }
    Ok(Json(entry))
}

async fn delete_entry(
    State(state): State<AppState>,
    headers: HeaderMap,
    AxumPath(id): AxumPath<String>,
) -> ApiResult<serde_json::Value> {
    let workspace = workspace_id(&headers)?;
    let result = sqlx::query("DELETE FROM entries WHERE id = ? AND workspace_id = ?")
        .bind(id)
        .bind(workspace)
        .execute(&state.pool)
        .await
        .map_err(internal_error)?;
    if result.rows_affected() == 0 {
        return Err(not_found("That source no longer exists."));
    }
    Ok(Json(serde_json::json!({"deleted": true})))
}

async fn create_release(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<ReleaseInput>,
) -> ApiResult<Release> {
    let workspace = workspace_id(&headers)?;
    let version = input.version.trim();
    if version.is_empty() || version.len() > 40 {
        return Err(bad_request("Enter a version with 1 to 40 characters."));
    }
    if input.notes.len() > 180 {
        return Err(bad_request("Keep the review note under 180 characters."));
    }
    if input.entry_ids.is_empty() {
        return Err(bad_request(
            "Select at least one approved source before releasing.",
        ));
    }
    let mut entries = Vec::with_capacity(input.entry_ids.len());
    for id in &input.entry_ids {
        let row = sqlx::query("SELECT id, kind, title, body, source_path, source_revision, updated_at FROM entries WHERE id = ? AND workspace_id = ?").bind(id).bind(&workspace).fetch_optional(&state.pool).await.map_err(internal_error)?;
        let Some(r) = row else {
            return Err(bad_request(
                "One selected source no longer exists. Reload and try again.",
            ));
        };
        entries.push(Entry {
            id: r.get(0),
            kind: r.get(1),
            title: r.get(2),
            body: r.get(3),
            source_path: r.get(4),
            source_revision: r.get(5),
            updated_at: r.get(6),
        });
    }
    let created_at = Utc::now().to_rfc3339();
    let content = compile_pack(version, &created_at[..10], &entries);
    let release = Release {
        id: Uuid::new_v4().to_string(),
        version: version.into(),
        notes: input.notes.trim().into(),
        content,
        created_at,
        stale_count: 0,
    };
    let mut tx = state.pool.begin().await.map_err(internal_error)?;
    let inserted = sqlx::query("INSERT INTO releases (id, workspace_id, version, notes, content, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(&release.id).bind(workspace).bind(&release.version).bind(&release.notes).bind(&release.content).bind(&release.created_at).execute(&mut *tx).await;
    if let Err(error) = inserted {
        if error.to_string().contains("UNIQUE") {
            return Err(bad_request(
                "That version already exists. Enter a new version.",
            ));
        }
        return Err(internal_error(error));
    }
    for entry in &entries {
        sqlx::query(
            "INSERT INTO release_sources (release_id, entry_id, source_revision) VALUES (?, ?, ?)",
        )
        .bind(&release.id)
        .bind(&entry.id)
        .bind(&entry.source_revision)
        .execute(&mut *tx)
        .await
        .map_err(internal_error)?;
    }
    tx.commit().await.map_err(internal_error)?;
    Ok(Json(release))
}

async fn demo_session() -> Json<ProjectState> {
    Json(sample_state())
}

fn compile_pack(version: &str, date: &str, entries: &[Entry]) -> String {
    let mut output =
        format!("---\ncontext-pack: {version}\nreleased: {date}\n---\n\n# Project context\n");
    for entry in entries {
        output.push_str(&format!(
            "\n## {} — {}\n{}\n\nSource: {} @ {}\nReference: project-memory://releases/{}#{}\n",
            entry.kind,
            entry.title,
            entry.body,
            entry.source_path,
            entry.source_revision,
            version,
            entry.id
        ));
    }
    output
}

fn sample_state() -> ProjectState {
    let entries = vec![
        Entry { id: "adr-042".into(), kind: "ADR".into(), title: "Keep tenant data in regional SQLite files".into(), body: "Each tenant has one encrypted SQLite file in its chosen region. Do not add a shared database dependency.".into(), source_path: "docs/adr/0042-regional-storage.md".into(), source_revision: "9f42c1a".into(), updated_at: "2026-08-18T10:00:00Z".into() },
        Entry { id: "term-release".into(), kind: "Glossary".into(), title: "Release train".into(), body: "The weekly window when approved customer-facing changes move to production.".into(), source_path: "docs/product/glossary.md".into(), source_revision: "c207bf4".into(), updated_at: "2026-08-19T14:20:00Z".into() },
        Entry { id: "decision-invite".into(), kind: "Product decision".into(), title: "Invite links expire after 72 hours".into(), body: "Team invite links expire after 72 hours. Support can revoke an unused link sooner.".into(), source_path: "docs/product/access-decisions.md".into(), source_revision: "b5e881d".into(), updated_at: "2026-08-20T09:45:00Z".into() },
    ];
    let release_entries = entries[..2].to_vec();
    let content = compile_pack("2026.08.21", "2026-08-21", &release_entries);
    ProjectState {
        entries,
        releases: vec![Release {
            id: "release-2026-08-21".into(),
            version: "2026.08.21".into(),
            notes: "Approved for the account migration work.".into(),
            content,
            created_at: "2026-08-21T15:30:00Z".into(),
            stale_count: 0,
        }],
    }
}

fn validate_entry(input: &EntryInput) -> Result<(), &'static str> {
    if !matches!(input.kind.as_str(), "ADR" | "Glossary" | "Product decision") {
        return Err("Choose ADR, Glossary, or Product decision.");
    }
    if input.title.trim().is_empty() || input.title.len() > 120 {
        return Err("Enter a title with 1 to 120 characters.");
    }
    if input.body.trim().is_empty() || input.body.len() > 4000 {
        return Err("Enter approved text with 1 to 4,000 characters.");
    }
    if input.source_path.trim().is_empty() || input.source_path.len() > 260 {
        return Err("Enter a source path with 1 to 260 characters.");
    }
    if input.source_revision.trim().is_empty()
        || input.source_revision.len() > 64
        || !input
            .source_revision
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || "._/-".contains(c))
    {
        return Err("Use a revision with letters, numbers, dots, slashes, dashes, or underscores.");
    }
    Ok(())
}

fn workspace_id(headers: &HeaderMap) -> Result<String, (StatusCode, Json<ErrorBody>)> {
    let key = headers
        .get("x-workspace-key")
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");
    if !(20..=128).contains(&key.len())
        || !key.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
    {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(ErrorBody {
                error:
                    "This browser has no valid workspace key. Reload the workspace to create one."
                        .into(),
            }),
        ));
    }
    let digest = Sha256::digest(key.as_bytes());
    Ok(format!("{digest:x}"))
}

fn bad_request(message: impl Into<String>) -> (StatusCode, Json<ErrorBody>) {
    (
        StatusCode::BAD_REQUEST,
        Json(ErrorBody {
            error: message.into(),
        }),
    )
}
fn not_found(message: impl Into<String>) -> (StatusCode, Json<ErrorBody>) {
    (
        StatusCode::NOT_FOUND,
        Json(ErrorBody {
            error: message.into(),
        }),
    )
}
fn internal_error(error: sqlx::Error) -> (StatusCode, Json<ErrorBody>) {
    warn!(%error, "database request failed");
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(ErrorBody {
            error: "The project database could not complete the request. Try again.".into(),
        }),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn compiles_vendor_neutral_references() {
        let entry = Entry {
            id: "adr-1".into(),
            kind: "ADR".into(),
            title: "Use SQLite".into(),
            body: "Keep state local.".into(),
            source_path: "docs/adr/1.md".into(),
            source_revision: "abc123".into(),
            updated_at: "now".into(),
        };
        let pack = compile_pack("1.0.0", "2026-09-02", &[entry]);
        assert!(pack.contains("project-memory://releases/1.0.0#adr-1"));
        assert!(pack.contains("docs/adr/1.md @ abc123"));
    }
    #[test]
    fn rejects_unscoped_revisions() {
        let input = EntryInput {
            kind: "ADR".into(),
            title: "A".into(),
            body: "B".into(),
            source_path: "a.md".into(),
            source_revision: "bad revision!".into(),
        };
        assert!(validate_entry(&input).is_err());
    }

    #[tokio::test]
    async fn startup_waits_for_a_locked_durable_database() {
        let directory =
            std::env::temp_dir().join(format!("project-memory-lock-{}", Uuid::new_v4()));
        std::fs::create_dir_all(&directory).unwrap();
        let database_path = directory.join("project-memory-release.sqlite3");
        let blocker_options = sqlite_connect_options(&database_path, Duration::ZERO);
        let blocker = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(blocker_options)
            .await
            .unwrap();
        sqlx::query("BEGIN EXCLUSIVE")
            .execute(&blocker)
            .await
            .unwrap();

        let startup_path = database_path.clone();
        let startup = tokio::spawn(async move {
            open_database_with_retry(
                &startup_path,
                20,
                Duration::from_millis(20),
                Duration::from_millis(10),
            )
            .await
        });
        tokio::time::sleep(Duration::from_millis(100)).await;
        assert!(
            !startup.is_finished(),
            "startup should wait while SQLite is locked"
        );

        sqlx::query("ROLLBACK").execute(&blocker).await.unwrap();
        blocker.close().await;
        let pool = tokio::time::timeout(Duration::from_secs(2), startup)
            .await
            .expect("startup should recover after the lock clears")
            .expect("startup task should not panic")
            .expect("database should initialize");
        let migration_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM _sqlx_migrations")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(migration_count, 1);
        pool.close().await;
        std::fs::remove_dir_all(directory).unwrap();
    }
}
