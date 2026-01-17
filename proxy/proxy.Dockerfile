FROM rust:1.92-slim-bookworm AS builder

WORKDIR /build

# Copy workspace files and .git for version hash
COPY . .

# Build the server in release mode
RUN cargo build --release -p pdp10-proxy

# Runtime stage
FROM gcr.io/distroless/cc-debian12

WORKDIR /app

COPY --from=builder /build/target/release/pdp10-proxy /app/pdp10-proxy

ENTRYPOINT ["./pdp10-proxy"]
