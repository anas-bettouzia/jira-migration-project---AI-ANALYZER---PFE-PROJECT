# Bamboo And SonarQube Plan

Ce document decrit le pipeline Bamboo cible pour analyser le projet apres un
push Bitbucket et avant le redeploiement Portainer.

## Objectif

Mettre en valeur une chaine DevOps coherente avec les contraintes de
l'entreprise :

- depot officiel : Bitbucket Server ;
- CI cible : Bamboo ;
- qualite code : SonarQube ;
- deploiement : Portainer ;
- aucun besoin de Docker Desktop sur le PC consultant.

## Variables Bamboo

Creer ces variables dans le plan Bamboo.

Variables simples :

```text
SONAR_HOST_URL=http://docker.itspectrum:9000
SONAR_PROJECT_KEY=jira-migration-ai-analyzer
```

Variable securisee :

```text
SONAR_TOKEN=<token SonarQube projet>
```

Le token doit etre masque dans Bamboo et ne doit jamais apparaitre dans le depot.

## Plan Recommande

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

Si l'agent Bamboo est Windows et possede Node, Python et SonarScanner :

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

## Si SonarScanner N'est Pas Installe

Demander a l'administrateur Bamboo d'installer SonarScanner CLI sur l'agent.
L'agent Bamboo peut lancer l'analyse sans Docker Desktop si SonarScanner CLI est
installe comme outil systeme.

Si l'agent Bamboo dispose de Docker cote serveur, une alternative possible est :

```bash
docker run --rm \
  -e SONAR_HOST_URL="$SONAR_HOST_URL" \
  -e SONAR_TOKEN="$SONAR_TOKEN" \
  -v "$PWD:/usr/src" \
  sonarsource/sonar-scanner-cli
```

Cette option depend de la politique interne. Elle n'est pas necessaire si
SonarScanner CLI est installe sur l'agent.

## Politique Quality Gate

Pour la soutenance et la premiere mise en production interne :

- bloquer sur bugs et vulnerabilites ;
- revoir les hotspots de securite ;
- accepter temporairement une dette de maintenabilite raisonnable ;
- traiter les code smells critiques par priorite apres stabilisation.

Politique cible :

```text
Quality Gate Passed -> build deployable
Quality Gate Failed -> build non deployable ou validation manuelle obligatoire
```

## Integration Avec Portainer

Bamboo ne remplace pas Portainer.

Bamboo prepare et valide le code. Portainer reste le point de deploiement des
stacks et contient les variables d'environnement necessaires a l'application.

Flux cible :

```text
Bitbucket push
  -> Bamboo build
  -> SonarQube scan
  -> Quality Gate
  -> image build / tag
  -> Portainer redeploy
```

## Commande De Verification Locale

Avant de demander l'integration Bamboo, valider localement :

```powershell
$env:SONAR_TOKEN="your_project_token"

docker run --rm `
  -e SONAR_HOST_URL="http://host.docker.internal:9000" `
  -e SONAR_TOKEN="$env:SONAR_TOKEN" `
  -v "${PWD}:/usr/src" `
  sonarsource/sonar-scanner-cli
```

Le resultat attendu est un Quality Gate `Passed` dans SonarQube.

## Etat Actuel Du Depot

Les scripts CI locaux ont ete retires du depot afin de garder uniquement les
fichiers utiles au projet. L'integration Bamboo reste decrite sous forme de
commandes dans ce document et pourra etre configuree directement dans les taches
du plan Bamboo.

Les fichiers `.env` ne sont pas partages dans le repository. Les fichiers
`*.env.example` servent uniquement de modeles locaux. En environnement
Portainer, les variables sont renseignees directement dans la configuration de
la stack.

## Points A Presenter Au Jury

- Le projet ne depend pas de GitHub Actions car le depot officiel est Bitbucket.
- Bamboo est le choix naturel dans l'ecosysteme Atlassian de l'entreprise.
- SonarQube apporte une preuve mesurable de qualite et de securite.
- Portainer conserve le controle operationnel du deploiement.
- La chaine DevOps respecte les contraintes internes de l'entreprise.
