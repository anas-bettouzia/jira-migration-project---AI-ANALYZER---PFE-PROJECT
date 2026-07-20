# Bamboo And SonarQube Plan

Ce document décrit le pipeline Bamboo cible pour analyser le projet après un
push Bitbucket et avant le redéploiement Portainer.

## Objectif

Mettre en valeur une chaîne DevOps cohérente avec les contraintes de
l'entreprise :

- dépôt officiel : Bitbucket Server ;
- CI : Bamboo ;
- qualité code : SonarQube ;
- déploiement : Portainer ;
- aucun besoin de Docker Desktop sur le PC consultant.

## Variables Bamboo

Créer ces variables dans le plan Bamboo.

Variables simples :

```text
SONAR_HOST_URL=http://docker.itspectrum:9000
SONAR_PROJECT_KEY=jira-migration-ai-analyzer
```

Variable sécurisée :

```text
SONAR_TOKEN=<token SonarQube projet>
```

Le token doit être masqué dans Bamboo et ne doit jamais apparaître dans le dépôt.

## Plan Recommandé

```text
Stage 1 - Checkout
  Bitbucket checkout

Stage 2 - Frontend validation
  npm ci
  npm run lint
  npm run build

Stage 3 - Backend validation
  python -m py_compile ...

Stage 4 - SonarQube analysis
  sonar-scanner

Stage 5 - Quality Gate
  fail or warn according to project policy

Stage 6 - Docker build and Portainer redeploy
  enabled after Quality Gate validation
```

## Script Windows Agent

Si l'agent Bamboo est Windows et possède Node, Python et SonarScanner :

```bat
cd front
npm ci
npm run lint
npm run build
cd ..

python -m py_compile back/gateway/app.py back/worker/tasks/analysis_task.py

sonar-scanner ^
  -Dsonar.host.url=%SONAR_HOST_URL% ^
  -Dsonar.token=%SONAR_TOKEN%
```

## Script Linux Agent

Si l'agent Bamboo est Linux :

```bash
cd front
npm ci
npm run lint
npm run build
cd ..

python -m py_compile back/gateway/app.py back/worker/tasks/analysis_task.py

sonar-scanner \
  -Dsonar.host.url="$SONAR_HOST_URL" \
  -Dsonar.token="$SONAR_TOKEN"
```

## Si SonarScanner N'est Pas Installé

Demander à l'administrateur Bamboo d'installer SonarScanner CLI sur l'agent.

L'agent Bamboo peut lancer l'analyse sans Docker Desktop si SonarScanner CLI est
installé comme outil système.

Si l'agent Bamboo dispose de Docker côté serveur, une alternative possible est :

```bash
docker run --rm \
  -e SONAR_HOST_URL="$SONAR_HOST_URL" \
  -e SONAR_TOKEN="$SONAR_TOKEN" \
  -v "$PWD:/usr/src" \
  sonarsource/sonar-scanner-cli
```

Cette option dépend de la politique interne. Elle n'est pas nécessaire si
SonarScanner CLI est installé sur l'agent.

## Politique Quality Gate

Pour la soutenance et la première mise en production interne :

- bloquer sur bugs et vulnérabilités ;
- revoir les hotspots de sécurité ;
- accepter temporairement une dette de maintenabilité raisonnable ;
- traiter les code smells critiques par priorité après stabilisation.

Politique cible :

```text
Quality Gate Passed -> build deployable
Quality Gate Failed -> build non deployable ou validation manuelle obligatoire
```

## Intégration Avec Portainer

Bamboo ne remplace pas Portainer.

Bamboo prépare et valide le code. Portainer reste le point de déploiement des
stacks.

Flux cible :

```text
Bitbucket push
  -> Bamboo build
  -> SonarQube scan
  -> Quality Gate
  -> image build / tag
  -> Portainer redeploy
```

## Commande De Vérification Locale

Avant de demander l'intégration Bamboo, valider localement :

```powershell
$env:SONAR_TOKEN="your_project_token"

docker run --rm `
  -e SONAR_HOST_URL="http://host.docker.internal:9000" `
  -e SONAR_TOKEN="$env:SONAR_TOKEN" `
  -v "${PWD}:/usr/src" `
  sonarsource/sonar-scanner-cli
```

Le résultat attendu est un Quality Gate `Passed` dans SonarQube.

## Points À Présenter Au Jury

- Le projet ne dépend pas de GitHub Actions car le dépôt officiel est Bitbucket.
- Bamboo est le choix naturel dans l'écosystème Atlassian de l'entreprise.
- SonarQube apporte une preuve mesurable de qualité et de sécurité.
- Portainer conserve le contrôle opérationnel du déploiement.
- La chaîne DevOps respecte les contraintes internes de l'entreprise.
## Scripts CI Fournis

Deux scripts sont fournis pour preparer l'integration Bamboo sans modifier le code applicatif:

- `scripts/ci/run-sonar.ps1` pour un agent Bamboo Windows.
- `scripts/ci/run-sonar.sh` pour un agent Bamboo Linux.

Ils executent la meme sequence:

```text
Frontend validation -> Backend syntax validation -> SonarQube analysis
```

Variables requises dans Bamboo:

```text
SONAR_HOST_URL=http://docker.itspectrum:9000
SONAR_TOKEN=<token SonarQube masque dans Bamboo>
```

Tache Bamboo pour un agent Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\ci\run-sonar.ps1
```

Tache Bamboo pour un agent Linux:

```bash
chmod +x scripts/ci/run-sonar.sh
./scripts/ci/run-sonar.sh
```

Prerequis de l'agent Bamboo:

- `node`
- `npm`
- `python` ou `python3`
- `sonar-scanner`

Le script Linux utilise `python`, puis bascule automatiquement vers `python3` si `python` n'est pas disponible. Le script Windows peut aussi utiliser une variable optionnelle `PYTHON_BIN` si l'agent a un chemin Python specifique.
