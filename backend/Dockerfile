# Multi-stage build for the Rust/Axum API.
FROM rust:1.95.0-bookworm AS builder

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cache dependency compilation separately from application code.
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    touch src/lib.rs && \
    cargo build --release && \
    rm -rf src

COPY src ./src
RUN touch src/main.rs src/lib.rs && \
    cargo build --release && \
    strip target/release/online-shopping-api

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 -s /usr/sbin/nologin appuser

WORKDIR /app
COPY --from=builder /app/target/release/online-shopping-api /app/online-shopping-api
RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:4000/api/health || exit 1

CMD ["/app/online-shopping-api"]
