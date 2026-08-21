# Prometheus And Grafana Monitoring

This monitoring stack is intentionally small for local testing and demo
preparation. It is deployed separately from the application stack, while using
the same Docker network to scrape the application services.

## Local Run

From the project root:

```powershell
docker compose --env-file monitoring.env.example -f docker-compose.monitoring.yml up -d
```

Open:

- Prometheus targets: `http://localhost:9099/targets`
- Grafana: `http://localhost:3009`

The values in `monitoring.env.example` are local examples only. In Portainer,
the same variables are entered directly in the stack environment section.

## Low Storage Mode

The default Prometheus retention is limited to:

- `PROMETHEUS_RETENTION_TIME=24h`
- `PROMETHEUS_RETENTION_SIZE=128MB`

For very low disk space, use:

```env
PROMETHEUS_RETENTION_TIME=12h
PROMETHEUS_RETENTION_SIZE=64MB
```

To stop the stack:

```powershell
docker compose -f docker-compose.monitoring.yml down
```

To stop it and delete monitoring volumes:

```powershell
docker compose -f docker-compose.monitoring.yml down -v
```

## Application Metrics

The application services expose Prometheus metrics on their internal Docker
ports. The local monitoring stack and the Portainer monitoring stack both use
the same Docker network, so Prometheus scrapes the same targets in both
environments:

```yaml
targets:
  - gateway:5000
  - parsing-service:5001
  - compatibility-service:5002
  - knowledge-service:5003
  - report-service:5004
  - worker:5005
```

Prometheus scrapes these endpoints using
`monitoring/prometheus/prometheus.yml`. Start the application stack first so the
external Docker network `jira_migration_app_network` exists.

## Portainer Notes

For Portainer, create a separate stack from `docker-compose.monitoring.yml`.
No target rewrite is needed between Docker Desktop and Portainer as long as both
stacks are attached to `jira_migration_app_network`.
