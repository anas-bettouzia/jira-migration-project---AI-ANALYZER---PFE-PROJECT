# Monitoring Stack séparé

Ce projet propose désormais un stack de monitoring indépendant pour Prometheus et Grafana.
Le stack de monitoring est conçu pour être déployé séparément du stack applicatif, de la même manière que `docker-compose.sonar.yml` pour SonarQube.

## Principe

- Le stack applicatif principal reste dans `docker-compose.yml`.
- Le stack monitoring est isolé dans `docker-compose.monitoring.yml`.
- Les deux stacks partagent un réseau Docker commun : `jira_migration_app_network`.
- Les configurations Prometheus et Grafana sont fournies via des `configs` Docker plutôt que des montages de volumes locaux.

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

1. Créer ou vérifier le réseau partagé si nécessaire :

```powershell
docker network create --driver overlay jira_migration_app_network
```

2. Déployer le stack monitoring :

```powershell
docker stack deploy -c docker-compose.monitoring.yml jira_migration_monitoring
```

3. Vérifier que le stack principal expose bien les services suivants sur le réseau partagé :

- `gateway` sur `gateway:5000`
- `parsing_service` sur `parsing-service:5001`
- `compatibility_service` sur `compatibility-service:5002`
- `knowledge_service` sur `knowledge-service:5003`
- `report_service` sur `report-service:5004`
- `worker` sur `worker:5005`

## URL d'accès

- Prometheus : `http://localhost:9090`
- Grafana : `http://localhost:3000`

Identifiants Grafana par défaut :

- utilisateur : `admin`
- mot de passe : `${GRAFANA_ADMIN_PASSWORD:-admin}`

## Remarques

- Le stack de monitoring doit rester séparé du stack applicatif pour réduire le périmètre opérationnel.
- Si le réseau n'existe pas, l'application principale doit le créer en premier ou créer manuellement le réseau externe avant de déployer le monitoring.
- Les fichiers de configuration Prometheus et Grafana sont chargés depuis le dépôt via Docker configs, ce qui évite les bind-mounts inutiles sur Windows non-administrateur.
