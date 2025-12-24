# ---------- build ----------
FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o session-service ./cmd/api/main.go


# ---------- run ----------
FROM alpine:3.20
RUN apk add --no-cache ca-certificates
WORKDIR /root/
COPY --from=builder /app/session-service .
EXPOSE 8083
CMD ["./session-service"]