FROM --platform=linux/amd64 rust:bullseye AS builder

WORKDIR /usr/src/app

COPY . .

RUN cargo build --release

EXPOSE 8080

CMD ["./target/release/metrixfolio-api"]