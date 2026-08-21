# SonarQube Quality Gate

Ce projet utilise SonarQube comme point de controle qualite pour la plateforme
Jira Migration AI Analyzer.

L'objectif n'est pas de modifier le comportement metier de l'application, mais
d'ajouter une couche DevOps mesurable autour du code : maintenabilite,
fiabilite, dette technique, duplications et revue des hotspots de securite.

## Chaine Cible

```text
Bitbucket -> Bamboo -> Build & lint -> SonarQube Quality Gate -> Docker images -> Portainer
```

Dans cette architecture :

- Bitbucket reste le depot officiel de l'entreprise.
- Bamboo lance l'analyse apres chaque push ou build planifie.
- SonarQube centralise les metriques qualite et le Quality Gate.
- Portainer reste responsable du deploiement des stacks applicatives.

## Pourquoi Un Stack Separe

SonarQube est volontairement separe du stack applicatif.

Cela evite de melanger :

- les services metier de l'application SOA ;
- la base MongoDB et les workers d'analyse ;
- l'outil qualite utilise par l'equipe technique.

En entreprise, le stack SonarQube peut donc vivre a cote du stack principal, par
exemple avec une URL interne comme :

```text
http://docker.itspectrum:9000
```

ou plus tard via un reverse proxy interne :

```text
http://sonarqube.itspectrum
```

## Variables D'environnement

Le fichier suivant sert uniquement de modele local :

```text
sonar.env.example
```

Variables attendues dans l'environnement local ou directement dans la stack
Portainer :

```env
SONARQUBE_IMAGE_TAG=community
SONAR_PORT=9000
SONAR_JDBC_USERNAME=sonar
SONAR_JDBC_PASSWORD=change_me_before_use
```

En production interne, les valeurs sensibles sont definies directement dans
Portainer ou dans Bamboo selon leur usage. Elles ne doivent pas etre partagees
dans le depot Git.

Le token d'analyse doit etre stocke comme variable securisee Bamboo :

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

Premier acces SonarQube sur une instance neuve :

```text
admin / admin
```

Changer immediatement le mot de passe, puis creer un token projet.

## Lancement Dans Portainer

Sur le PC de l'entreprise, Docker Desktop n'est pas necessaire.

Les etapes sont :

1. Ouvrir Portainer.
2. Creer un nouveau stack separe, par exemple `jira-migration-sonarqube`.
3. Coller le contenu de `docker-compose.sonar.yml`.
4. Ajouter les variables d'environnement directement dans la configuration de la stack.
5. Deployer le stack.
6. Ouvrir SonarQube depuis le reseau interne.

Prerequis possibles cote serveur Linux, a demander a l'administrateur si
SonarQube ne demarre pas :

```text
vm.max_map_count=524288
fs.file-max=131072
ulimit -n 131072
ulimit -u 8192
```

## Analyse Locale

Depuis la racine du depot :

```powershell
$env:SONAR_TOKEN="your_project_token"

docker run --rm `
  -e SONAR_HOST_URL="http://host.docker.internal:9000" `
  -e SONAR_TOKEN="$env:SONAR_TOKEN" `
  -v "${PWD}:/usr/src" `
  sonarsource/sonar-scanner-cli
```

Si SonarScanner est installe directement sur la machine :

```powershell
sonar-scanner -D"sonar.host.url=http://localhost:9000" -D"sonar.token=$env:SONAR_TOKEN"
```

Important : lancer la commande depuis la racine du projet, la ou se trouve
`sonar-project.properties`.

## Analyse Depuis Bamboo

Sur le PC de l'entreprise, l'analyse ne doit pas dependre de Docker Desktop.

Bamboo doit :

- recuperer le code depuis Bitbucket ;
- installer les dependances necessaires ;
- executer le lint et le build ;
- lancer SonarScanner depuis l'agent Bamboo ;
- bloquer ou signaler le build si le Quality Gate echoue.

Le detail du pipeline est documente dans :

```text
docs/bamboo-sonarqube-plan.md
```

## Perimetre Analyse

SonarQube analyse :

- les services Python du backend SOA ;
- le gateway ;
- le worker ;
- le code React / TypeScript dans `front/src` ;
- les tests backend dans `back/tests`.

Le frontend utilise :

```text
front/tsconfig.sonar.json
```

Ce fichier permet a SonarQube d'analyser le TypeScript sans dependre de toutes
les options les plus recentes utilisees par Vite.

## Elements Exclus

Les fichiers generes ou non pertinents sont exclus :

- `node_modules`
- `dist`
- environnements virtuels Python
- `__pycache__`
- rapports generes
- donnees ChromaDB generees
- uploads temporaires
- images et assets binaires

## Faux Positifs Revus

Deux exceptions sont documentees dans `sonar-project.properties` :

- Tailwind CSS v4 : SonarQube 9.9 ne reconnait pas encore certaines directives
  recentes comme `@custom-variant`.
- Fichier i18n : les mots comme "password", "mot de passe" ou placeholders de
  formulaire sont des textes affiches a l'utilisateur, pas des secrets.

Les regles restent actives ailleurs dans le codebase.

## Resultat Local Valide

L'analyse locale a ete validee avec :

- Quality Gate : Passed
- Reliability : A
- Security : A
- Security Review : A
- New Bugs : 0
- New Vulnerabilities : 0
- New Security Hotspots : 0 apres revue des faux positifs

Les code smells restants sont principalement de la dette de maintenabilite.
Ils peuvent etre traites progressivement, sans risque metier, apres la phase de
stabilisation fonctionnelle.

## Couverture Future

La couverture est desactivee dans le Quality Gate local tant que Bamboo ne
genere pas encore les rapports.

Quand la couverture sera ajoutee :

- Python : `back/coverage.xml`
- Frontend : `front/coverage/lcov.info`

Ensuite :

1. supprimer `sonar.coverage.exclusions=**` ;
2. activer les chemins de rapports dans `sonar-project.properties` ;
3. ajouter les etapes de tests dans Bamboo.

## Depannage Rapide

Erreur `Not authorized` :

- verifier que `SONAR_TOKEN` est defini dans le terminal courant ;
- verifier que le scan est lance depuis la racine du projet ;
- regenerer un token projet si necessaire.

Erreur `Project root configuration file: NONE` :

- la commande est lancee depuis un sous-dossier ;
- revenir a la racine du depot avant de lancer le scanner.

SonarQube ne demarre pas dans Portainer :

- verifier les variables `SONAR_JDBC_USERNAME` et `SONAR_JDBC_PASSWORD` ;
- demander a l'administrateur de verifier les parametres systeme Linux listes
  dans la section Portainer.
