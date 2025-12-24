# ---------- build ----------
FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o arenas-service ./cmd/api/main.go

# ---------- run ----------
FROM alpine:3.20
RUN apk add --no-cache ca-certificates
WORKDIR /root/
COPY --from=builder /app/arenas-service .
EXPOSE 8081
CMD ["./arenas-service"]