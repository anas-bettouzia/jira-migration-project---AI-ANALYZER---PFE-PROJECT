# Architecture SOA De L'Application

## Positionnement

Le projet Jira Migration AI Analyzer suit une architecture SOA
Service-Oriented Architecture, et non une architecture microservices stricte.

L'application est decoupee en plusieurs services applicatifs specialises :

- gateway : point d'entree API, authentification et routage.
- parsing_service : extraction des donnees Jira Data Center.
- compatibility_service : analyse de compatibilite Jira Cloud.
- knowledge_service : recherche documentaire RAG.
- report_service : generation, traduction et export des rapports.
- worker : orchestration asynchrone du pipeline d'analyse.

Ces services communiquent par API HTTP internes et sont deployes dans des
conteneurs Docker distincts. Cependant, ils partagent majoritairement la meme
base MongoDB applicative. Ce partage de donnees caracterise davantage une
architecture SOA modulaire qu'une architecture microservices stricte.

## Justification SOA

Dans une architecture microservices stricte, chaque service possede
generalement sa propre base de donnees et reste autonome sur son modele de
persistance. Dans ce projet, MongoDB joue le role de base applicative commune
pour les utilisateurs, jobs, analyses, matrices de compatibilite et rapports.

Le knowledge_service dispose aussi d'un stockage specialise ChromaDB pour les
embeddings et les chunks documentaires utilises par le RAG. Ce stockage est
propre a la fonction de recherche semantique, mais il ne rend pas l'ensemble du
systeme microservices, car le coeur metier reste partage autour de MongoDB.

La formulation correcte pour le rapport est donc :

```text
Architecture SOA conteneurisee, composee de services applicatifs specialises,
orchestration asynchrone et base de donnees MongoDB partagee, avec un stockage
vectoriel ChromaDB dedie au RAG.
```

## Flux Metier Principal

```text
Utilisateur
  -> Frontend React
  -> Gateway Flask
  -> Worker
  -> Parsing Service
  -> Compatibility Service
  -> Knowledge Service / ChromaDB
  -> Report Service
  -> MongoDB
  -> Frontend React
```

Le worker coordonne le pipeline complet :

1. reception du fichier Jira exporte ;
2. creation d'un job d'analyse ;
3. appel du parsing_service ;
4. appel du compatibility_service ;
5. enrichissement par le knowledge_service lorsque necessaire ;
6. generation du rapport par le report_service ;
7. stockage du resultat dans MongoDB ;
8. consultation et export depuis l'interface.

## Deploiement

Le deploiement est gere avec Docker et Portainer. Le repository Bitbucket sert
de source officielle du code. Les variables d'environnement sensibles ne sont
pas versionnees dans le depot : elles sont definies directement dans les stacks
Portainer ou conservees localement pour les tests.

SonarQube, Prometheus et Grafana sont deployes comme stacks separes :

- SonarQube : controle qualite, dette technique, bugs, vulnerabilites et
  Quality Gate.
- Prometheus : collecte des metriques exposees par les services Flask.
- Grafana : visualisation des metriques applicatives.

Ces stacks restent separes du stack applicatif mais peuvent partager le reseau
Docker `jira_migration_app_network` afin de communiquer avec les services.
