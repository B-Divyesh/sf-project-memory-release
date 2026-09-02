FROM node:22-alpine AS frontend
WORKDIR /build
ARG BUILD_SHA=dev
COPY package.json package-lock.json tsconfig.json vite.config.ts ./
RUN npm ci
COPY frontend ./frontend
ENV VITE_BUILD_SHA=$BUILD_SHA
RUN npm run build

FROM rust:1-slim AS backend
WORKDIR /build
ARG BUILD_SHA=dev
RUN apt-get update && apt-get install -y --no-install-recommends pkg-config libsqlite3-dev && rm -rf /var/lib/apt/lists/*
COPY Cargo.toml Cargo.lock build.rs ./
COPY migrations ./migrations
COPY src ./src
RUN BUILD_SHA=$BUILD_SHA cargo build --release --locked

FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates libsqlite3-0 && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 --create-home appuser \
    && mkdir -p /app/data && chown -R appuser:appuser /app
WORKDIR /app
COPY --from=backend /build/target/release/project-memory-release /app/project-memory-release
COPY --from=frontend /build/dist /app/dist
USER 10001
ENV PORT=8080
EXPOSE 8080
CMD ["/app/project-memory-release"]
