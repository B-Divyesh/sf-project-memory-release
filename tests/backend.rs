use std::{
    io::{Read, Write},
    net::{TcpListener, TcpStream},
    path::Path,
    process::{Child, Command, Stdio},
    thread,
    time::{Duration, Instant},
};

use uuid::Uuid;

fn open_port() -> u16 {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind an available port");
    listener.local_addr().expect("read local address").port()
}

fn request(
    port: u16,
    method: &str,
    path: &str,
    workspace_key: Option<&str>,
    body: Option<&str>,
) -> std::io::Result<(u16, String)> {
    let mut stream = TcpStream::connect(("127.0.0.1", port))?;
    stream.set_read_timeout(Some(Duration::from_secs(2)))?;
    let body = body.unwrap_or("");
    let workspace = workspace_key
        .map(|key| format!("X-Workspace-Key: {key}\r\n"))
        .unwrap_or_default();
    let content_type = if body.is_empty() {
        ""
    } else {
        "Content-Type: application/json\r\n"
    };
    write!(
        stream,
        "{method} {path} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n{workspace}{content_type}Content-Length: {}\r\n\r\n{body}",
        body.len()
    )?;
    stream.flush()?;
    let mut response = String::new();
    stream.read_to_string(&mut response)?;
    let status = response
        .split_whitespace()
        .nth(1)
        .and_then(|value| value.parse().ok())
        .unwrap_or_default();
    let response_body = response
        .split_once("\r\n\r\n")
        .map(|(_, body)| body.to_owned())
        .unwrap_or_default();
    Ok((status, response_body))
}

fn wait_for_health(port: u16) {
    let deadline = Instant::now() + Duration::from_secs(8);
    while Instant::now() < deadline {
        if let Ok((200, _)) = request(port, "GET", "/health", None, None) {
            return;
        }
        thread::sleep(Duration::from_millis(40));
    }
    panic!("server did not become healthy");
}

fn start_server(port: u16, data_dir: Option<&Path>, current_dir: &Path) -> Child {
    let mut command = Command::new(env!("CARGO_BIN_EXE_project-memory-release"));
    command
        .env_clear()
        .env("PORT", port.to_string())
        .current_dir(current_dir)
        .stdout(Stdio::null())
        .stderr(Stdio::piped());
    if let Some(data_dir) = data_dir {
        command.env("DATA_DIR", data_dir);
    }
    let child = command.spawn().expect("start the product binary");
    wait_for_health(port);
    child
}

fn stop_server(mut child: Child) -> String {
    child.kill().expect("stop the product binary");
    let output = child.wait_with_output().expect("collect product output");
    String::from_utf8(output.stderr).expect("startup log is UTF-8")
}

// @claim:sqlite-restart-persistence
#[test]
fn claim_sqlite_restart_persistence_keeps_workspace_records() {
    let directory = std::env::temp_dir().join(format!("pmr-restart-{}", Uuid::new_v4()));
    std::fs::create_dir_all(&directory).expect("create test data directory");
    let workspace_key = "restart-workspace-key-123456789";
    let first_port = open_port();
    let first = start_server(first_port, Some(&directory), &directory);
    let (status, _) = request(
        first_port,
        "POST",
        "/api/entries",
        Some(workspace_key),
        Some(r#"{"kind":"ADR","title":"Keep restart state","body":"The same data directory keeps this source.","sourcePath":"docs/adr/restart.md","sourceRevision":"a1b2c3d"}"#),
    )
    .expect("create a real workspace source");
    assert_eq!(status, 200);
    stop_server(first);

    let second_port = open_port();
    let second = start_server(second_port, Some(&directory), &directory);
    let (status, body) = request(second_port, "GET", "/api/state", Some(workspace_key), None)
        .expect("read the same real workspace after restart");
    assert_eq!(status, 200);
    assert!(body.contains("Keep restart state"));
    stop_server(second);
    std::fs::remove_dir_all(directory).expect("remove test data directory");
}

#[test]
fn default_startup_logging_reports_configuration_with_only_port() {
    let directory = std::env::temp_dir().join(format!("pmr-startup-log-{}", Uuid::new_v4()));
    std::fs::create_dir_all(&directory).expect("create isolated working directory");
    let server = start_server(open_port(), None, &directory);
    let logs = stop_server(server);
    assert!(logs.contains("configuration ready"));
    assert!(logs.contains("\"port_source\":\"supplied\""));
    assert!(logs.contains("\"data_dir_source\":\"local-default\""));
    std::fs::remove_dir_all(directory).expect("remove isolated working directory");
}
