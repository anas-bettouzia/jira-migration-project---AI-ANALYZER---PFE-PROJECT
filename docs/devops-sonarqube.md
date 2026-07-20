# SonarQube Quality Gate

Ce projet utilise SonarQube comme point de contrôle qualité pour la plateforme
Jira Migration AI Analyzer.

L'objectif n'est pas de modifier le comportement métier de l'application, mais
d'ajouter une couche DevOps mesurable autour du code : maintenabilité,
fiabilité, dette technique, duplications et revue des hotspots de sécurité.

## Chaîne Cible

```text
Bitbucket -> Bamboo -> Build & lint -> SonarQube Quality Gate -> Docker images -> Portainer
```

Dans cette architecture :

- Bitbucket reste le dépôt officiel de l'entreprise.
- Bamboo lance l'analyse après chaque push ou build planifié.
- SonarQube centralise les métriques qualité et le Quality Gate.
- Portainer reste responsable du déploiement des stacks applicatives.

## Pourquoi Un Stack Séparé

SonarQube est volontairement séparé du stack applicatif.

Cela évite de mélanger :

- les services métier de l'application ;
- la base MongoDB et les workers d'analyse ;
- l'outil qualité utilisé par l'équipe technique.

En entreprise, le stack SonarQube peut donc vivre à côté du stack principal, par
exemple avec une URL interne comme :

```text
http://docker.itspectrum:9000
```

ou plus tard via un reverse proxy interne :

```text
http://sonarqube.itspectrum
```

## Variables D'environnement

Créer un fichier local ou des variables Portainer à partir de :

```text
sonar.env.example
```

Variables attendues :

```env
SONARQUBE_IMAGE_TAG=community
SONAR_PORT=9000
SONAR_JDBC_USERNAME=sonar
SONAR_JDBC_PASSWORD=change_me_before_use
```

`SONARQUBE_IMAGE_TAG` fixe la version SonarQube utilisee par le stack.
`SONAR_PORT` expose l'interface SonarQube sur le serveur Portainer.
En production interne, remplacer `SONAR_JDBC_PASSWORD` par un mot de passe fort.
Ne jamais commiter de token SonarQube dans le dépôt.

Le token d'analyse doit être stocké comme variable sécurisée Bamboo :

```text
SONAR_TOKEN
```

## Lancement Local

Sur un poste personnel avec Docker Desktop :

```powershell
$env:SONAR_JDBC_PASSWORD="change_me_before_use"
docker compose -f docker-compose.sonar.yml up -d
```

Interface :

```text
http://localhost:9000
```

Premier accès SonarQube sur une instance neuve :

```text
admin / admin
```

Changer immédiatement le mot de passe, puis créer un token projet pour :

```text
jira-migration-ai-analyzer
```

## Lancement Dans Portainer

Sur le PC de l'entreprise, Docker Desktop n'est pas nécessaire.

Les étapes sont :

1. Ouvrir Portainer.
2. Créer un nouveau stack séparé, par exemple `jira-migration-sonarqube`.
3. Coller le contenu de `docker-compose.sonar.yml`.
4. Ajouter les variables d'environnement :
   - `SONARQUBE_IMAGE_TAG`
   - `SONAR_PORT`
   - `SONAR_JDBC_USERNAME`
   - `SONAR_JDBC_PASSWORD`
5. Déployer le stack.
6. Ouvrir SonarQube depuis le réseau interne :

```text
http://docker.itspectrum:9000
```

Pré-requis possibles côté serveur Linux, à demander à l'administrateur si
SonarQube ne démarre pas :

```text
vm.max_map_count=524288
fs.file-max=131072
ulimit -n 131072
ulimit -u 8192
```

## Analyse Locale

Depuis la racine du dépôt :

```powershell
$env:SONAR_TOKEN="your_project_token"

docker run --rm `
  -e SONAR_HOST_URL="http://host.docker.internal:9000" `
  -e SONAR_TOKEN="$env:SONAR_TOKEN" `
  -v "${PWD}:/usr/src" `
  sonarsource/sonar-scanner-cli
```

Si SonarScanner est installé directement sur la machine :

```powershell
sonar-scanner -D"sonar.host.url=http://localhost:9000" -D"sonar.token=$env:SONAR_TOKEN"
```

Important : lancer la commande depuis la racine du projet, là où se trouve
`sonar-project.properties`.

## Analyse Depuis Bamboo

Sur le PC de l'entreprise, l'analyse ne doit pas dépendre de Docker Desktop.

Bamboo doit :

- récupérer le code depuis Bitbucket ;
- installer les dépendances nécessaires ;
- exécuter le lint et le build ;
- lancer SonarScanner depuis l'agent Bamboo ;
- bloquer ou signaler le build si le Quality Gate échoue.

Le détail du pipeline est documenté dans :

```text
docs/bamboo-sonarqube-plan.md
```

## Périmètre Analysé

SonarQube analyse :

- les services Python du backend ;
- le gateway ;
- les workers ;
- le code React / TypeScript dans `front/src` ;
- les tests backend dans `back/tests`.

Le frontend utilise :

```text
front/tsconfig.sonar.json
```

Ce fichier permet à SonarQube d'analyser le TypeScript sans dépendre de toutes
les options les plus récentes utilisées par Vite.

## Éléments Exclus

Les fichiers générés ou non pertinents sont exclus :

- `node_modules`
- `dist`
- environnements virtuels Python
- `__pycache__`
- rapports générés
- données ChromaDB générées
- uploads temporaires
- images et assets binaires

## Faux Positifs Revus

Deux exceptions sont documentées dans `sonar-project.properties` :

- Tailwind CSS v4 : SonarQube 9.9 ne reconnaît pas encore certaines directives
  récentes comme `@custom-variant`.
- Fichier i18n : les mots comme "password", "mot de passe" ou placeholders de
  formulaire sont des textes affichés à l'utilisateur, pas des secrets.

Les règles restent actives ailleurs dans le codebase.

## Résultat Local Validé

L'analyse locale a été validée avec :

- Quality Gate : Passed
- Reliability : A
- Security : A
- Security Review : A
- New Bugs : 0
- New Vulnerabilities : 0
- New Security Hotspots : 0 après revue des faux positifs

Les code smells restants sont principalement de la dette de maintenabilité.
Ils peuvent être traités progressivement, sans risque métier, après la phase de
stabilisation fonctionnelle.

## Couverture Future

La couverture est désactivée dans le Quality Gate local tant que Bamboo ne
génère pas encore les rapports.

Quand la couverture sera ajoutée :

- Python : `back/coverage.xml`
- Frontend : `front/coverage/lcov.info`

Ensuite :

1. supprimer `sonar.coverage.exclusions=**` ;
2. activer les chemins de rapports dans `sonar-project.properties` ;
3. ajouter les étapes de tests dans Bamboo.

## Dépannage Rapide

Erreur `Not authorized` :

- vérifier que `SONAR_TOKEN` est défini dans le terminal courant ;
- vérifier que le scan est lancé depuis la racine du projet ;
- régénérer un token projet si nécessaire.

Erreur `Project root configuration file: NONE` :

- la commande est lancée depuis un sous-dossier ;
- revenir à la racine du dépôt avant de lancer le scanner.

SonarQube ne démarre pas dans Portainer :

- vérifier les variables `SONAR_JDBC_USERNAME` et `SONAR_JDBC_PASSWORD` ;
- demander à l'administrateur de vérifier les paramètres système Linux listés
  dans la section Portainer.
