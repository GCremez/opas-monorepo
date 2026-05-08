# opas-infra

Local development environment and infrastructure configuration for Opas.

## Quick start

```bash
# Start all local services
docker compose up -d

# Verify everything is healthy
docker compose ps
```

## Services

| Service | URL | Credentials |
|---|---|---|
| PostgreSQL | `localhost:5432` | `opas / opas` |
| Redis | `localhost:6379` | — |
| RabbitMQ | `localhost:5672` | `opas / opas` |
| RabbitMQ UI | `http://localhost:15672` | `opas / opas` |
| Presidio Analyzer | `http://localhost:5001` | — |
| LocalStack (S3) | `http://localhost:4566` | `test / test` |
| Prometheus | `http://localhost:9090` | — |
| Grafana | `http://localhost:3001` | `admin / admin` |

## pgvector

The PostgreSQL image (`pgvector/pgvector:pg16`) has the `vector` extension pre-installed.
It is enabled automatically via `docker/postgres/init.sql`.

## Stopping / resetting

```bash
# Stop services (keep data)
docker compose stop

# Full reset — destroys all volumes
docker compose down -v
```

## Adding a service

Add it to `docker-compose.yml`. Keep all dev-only services here — do not add them to production infra configs.
