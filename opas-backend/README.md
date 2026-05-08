# opas-backend

Java 21 + Spring Boot 3.x backend for the Opas platform.

## Requirements

- Java 21 (Temurin)
- Maven 3.9+
- Docker & Docker Compose

## Local development

```bash
# Start dependencies (PostgreSQL, Redis, RabbitMQ, Presidio sidecar)
cd ../opas-infra
docker compose up -d

# Copy env template and fill in secrets
cp .env.example .env.local

# Run backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

## Environment variables

See `.env.example`. Never commit real secrets. All secrets go to AWS Secrets Manager in production.

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL JDBC URL |
| `REDIS_URL` | Redis connection URL |
| `ANTHROPIC_API_KEY` | Claude API key |
| `JWT_PRIVATE_KEY` | RS256 private key (PEM) |
| `JWT_PUBLIC_KEY` | RS256 public key (PEM) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `PRESIDIO_SIDECAR_URL` | Internal URL of PII scrubbing service |
| `S3_BUCKET_NAME` | Upload bucket name |

## Running tests

```bash
mvn verify
```

Integration tests use Testcontainers — Docker must be running.

## API docs

Once running, OpenAPI docs available at: `http://localhost:8080/swagger-ui.html`

## Architecture

See `../opas-infra` for the full system diagram and `docker-compose.yml`.
