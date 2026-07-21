# Monitoring Stack séparé

Ce projet propose désormais un stack de monitoring indépendant pour Prometheus et Grafana.
Le stack de monitoring est conçu pour être déployé séparément du stack applicatif, de la même manière que `docker-compose.sonar.yml` pour SonarQube.

## Principe

- Le stack applicatif principal reste dans `docker-compose.yml`.
- Le stack monitoring est isolé dans `docker-compose.monitoring.yml`.
- Les deux stacks partagent un réseau Docker commun : `jira_migration_app_network`.
- Les configurations Prometheus et Grafana sont montées dans des volumes locaux pour Portainer Standalone.

## Fichiers clés

- `docker-compose.monitoring.yml` : stack Prometheus + Grafana.
- `prometheus.yml` : configuration de scrape Prometheus.
- `grafana/provisioning/datasources/prometheus.yml` : datasource Grafana.
- `grafana/provisioning/dashboards/dashboards.yml` : provisioning de dashboard.
- `grafana/provisioning/dashboards/jira-migration.json` : dashboard d'exemple.

## Déploiement local via Docker Compose

1. Déployer l'application principale :

```powershell
docker compose up -d
```

2. Déployer le stack monitoring :

```powershell
docker compose -f docker-compose.monitoring.yml up -d
```

> Note : `docker compose` peut toujours monter les fichiers de configuration locaux sur un poste Docker Desktop. Toutefois, pour un déploiement en mode stack/Portainer et pour éviter les problèmes de montages locaux sous Windows, l'usage de `configs` Docker est recommandé.

## Déploiement via Portainer / Docker Stack

> Si vous utilisez Portainer en mode Standalone (Compose classique), n'utilisez pas `configs:`. Utilisez un fichier Compose avec des volumes et copiez vos fichiers de configuration dans les volumes sur l'hôte.

### 1. Vérifier le réseau partagé

Ton stack `jira-migration` doit utiliser le réseau externe :

- `jira_migration_app_network`

Si le réseau n'existe pas encore, crée-le dans Portainer ou avec :

```powershell
docker network create --driver bridge jira_migration_app_network
```

### 2. Utiliser le fichier `docker-compose.monitoring.yml`

Dans Portainer, va dans **Stacks → Add stack** et colle ce contenu :

```yaml
version: "3.9"

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: jira_prometheus
    ports:
      - "9099:9090"
    volumes:
      - prometheus_config:/etc/prometheus
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
    networks:
      - app_network
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: jira_grafana
    ports:
      - "3009:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-admin}
    volumes:
      - grafana_provisioning:/etc/grafana/provisioning
      - grafana_data:/var/lib/grafana
    depends_on:
      - prometheus
    networks:
      - app_network
    restart: unless-stopped

networks:
  app_network:
    external: true
    name: jira_migration_app_network

volumes:
  prometheus_config:
  prometheus_data:
  grafana_provisioning:
  grafana_data:
```

### 3. Copier les fichiers de configuration dans les volumes

Sur l'hôte Docker, retrouve les chemins des volumes créés :

```powershell
docker volume inspect <volume_name>
```

Pour chaque volume, copie le contenu correspondant :

- `prometheus_config` → `/etc/prometheus/prometheus.yml`
- `grafana_provisioning` → `/etc/grafana/provisioning`

### 4. Contenu du fichier `prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    monitor: 'jira-migration-monitor'

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'gateway'
    static_configs:
      - targets: ['gateway:5000']
    metrics_path: '/metrics'

  - job_name: 'parsing_service'
    static_configs:
      - targets: ['parsing-service:5001']
    metrics_path: '/metrics'

  - job_name: 'compatibility_service'
    static_configs:
      - targets: ['compatibility-service:5002']
    metrics_path: '/metrics'

  - job_name: 'knowledge_service'
    static_configs:
      - targets: ['knowledge-service:5003']
    metrics_path: '/metrics'

  - job_name: 'report_service'
    static_configs:
      - targets: ['report-service:5004']
    metrics_path: '/metrics'

  - job_name: 'worker'
    static_configs:
      - targets: ['worker:5005']
    metrics_path: '/metrics'
```

### 5. Contenu du provisioning Grafana

Sur l'hôte, crée le dossier `dashboards` dans `grafana_provisioning` et ajoute :

`grafana/provisioning/datasources/prometheus.yml`
```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
    jsonData:
      timeInterval: 15s
```

`grafana/provisioning/dashboards/dashboards.yml`
```yaml
apiVersion: 1

providers:
  - name: 'Jira Migration Dashboards'
    orgId: 1
    folder: 'Jira Migration'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
```

`grafana/provisioning/dashboards/jira-migration.json`
- utilise le fichier JSON déjà présent dans le dépôt `grafana/provisioning/dashboards/jira-migration.json`

### 6. Redéployer le stack

1. Redéploie le stack `jira-migration-monitoring` dans Portainer
2. Vérifie les logs si nécessaire

### 7. URL d’accès

- Prometheus : `http://<host>:9099`
- Grafana : `http://<host>:3009`

### 8. Important

Ne tente pas de scrapper `mongodb:27017` ou `redis:6379` directement sans exporter.

Pour surveiller MongoDB/Redis, il faut ajouter un exporter dédié.

## Remarques

- Le stack de monitoring doit rester séparé du stack applicatif pour réduire le périmètre opérationnel.
- Si le réseau n'existe pas, l'application principale doit le créer en premier ou créer manuellement le réseau externe avant de déployer le monitoring.
- Les fichiers de configuration Prometheus et Grafana sont chargés depuis le dépôt via Docker configs, ce qui évite les bind-mounts inutiles sur Windows non-administrateur.
