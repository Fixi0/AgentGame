# Agent FC — service Render de bêta

Le fichier `render.yaml` prépare **un seul service web Docker** :

- Nom : `agentfc-online-beta`.
- Région : Francfort, à proximité du PostgreSQL Supabase situé à Paris.
- Instance : **`free` pour les tests**, à la demande de l’utilisateur. Aucun passage payant automatique. L’option continue à 7 $/mois précédemment envisagée n’est pas demandée par cette configuration.
- L’offre gratuite peut se mettre en veille après 15 minutes sans trafic ; les tâches de matchs et notifications peuvent être retardées pendant cette veille. Elle sert à la bêta, pas à garantir les horaires de la version publique. Les quotas gratuits Render restent applicables.
- Aucun PostgreSQL Render, disque payant, worker séparé ou aperçu automatique n’est demandé.
- Déploiements automatiques désactivés : une modification du dépôt ne redémarre pas la bêta sans action explicite.
- Mode bêta, transactions StoreKit Production refusées et commerce désactivé ; publicités récompensées désactivées.
- Connexion privée à Supabase obligatoire avant démarrage. La bêta ne peut plus démarrer en production sur un PGlite éphémère.

Ce fichier est une configuration, **pas la preuve qu’un service Render est créé ou facturé**. Son schéma a été validé contre le JSON Schema officiel de Render.

## État vérifié le 30 octobre 2026

- Compte Render connecté ; workspace **My Workspace** (`tea-d76eg06slomc738h1mj0`) confirmé par l’utilisateur.
- Code serveur publié sur la branche dédiée [`codex/agentfc-server-beta`](https://github.com/Fixi0/AgentGame/tree/codex/agentfc-server-beta). La branche `main` et les services existants n’ont pas été modifiés.
- La demande payante initiale, puis la tentative explicite avec **`plan: free`**, ont toutes deux été refusées par Render : **HTTP 402, `billing_suspended`**. La liste vérifiée après l’essai gratuit ne contient aucun Agent FC. Aucun déploiement public ni build Docker distant n’a donc été exécuté.
- Action nécessaire sur téléphone : ouvrir [Billing](https://dashboard.render.com/billing) dans My Workspace et lever le blocage indiqué par Render. Ne pas reprendre ou modifier les autres applications pour contourner cette erreur.
- Supabase : projet `xyzvooefdyotbqkiluuc`, pooler confirmé `aws-1-eu-west-3.pooler.supabase.com:5432`. Connexion TLS avec chaîne et nom d’hôte vérifiés grâce au certificat public officiel Supabase.
- Le rôle dédié `agentfc_beta_runtime` possède les opérations de données sur les 15 tables privées du jeu, avec des politiques RLS réservées à ce rôle. Aucun accès au schéma Auth ; `anon` et `authenticated` n’ont pas accès au schéma du jeu. Aucun avertissement de sécurité Supabase après la migration.
- Le rôle est **NOLOGIN en attente de l’hébergement**. À la reprise, générer un nouveau secret, lui rendre LOGIN, vérifier la connexion et placer l’URI uniquement dans les variables privées Render. Ne pas utiliser le mot de passe administrateur.
- Test réel HTTP → PostgreSQL réussi avec deux instances API indépendantes : inscription/connexion, ligue privée et code d’accès, rejeu de commande, enchères concurrentes sous verrou partagé, chat, achats désactivés, persistance après redémarrage et invalidation de session à la déconnexion. Les comptes et ligues temporaires ont été supprimés ; base vérifiée à zéro compte/zéro ligue après nettoyage.

## Connexion et création du service

1. Relier le compte Render à Codex. L’installation de l’intégration ne prouve pas encore qu’une commande authentifiée peut accéder à un workspace ; vérifier la liste des workspaces/services avant toute création.
2. Publier le code serveur sur une branche dédiée de `Fixi0/AgentGame`, après exclusion des secrets et fichiers de test. Le dépôt est actuellement public : ne pas y déposer la connexion PostgreSQL ou une clé Apple. Ne pas remplacer `main` pour démarrer la bêta.
3. Créer le service à partir de cette branche et du Dockerfile, avec les valeurs ci-dessus. Vérifier le workspace et l’absence de service Agent FC existant pour éviter un doublon.
4. Renseigner `AGENTFC_DATABASE_URL` uniquement dans les secrets Render. Utiliser la connexion PostgreSQL/Supavisor compatible avec le réseau de l’hébergeur, avec TLS vérifié. Le schéma privé est déjà créé dans `xyzvooefdyotbqkiluuc` ; aucune migration automatique ni modification des autres projets n’est prévue au démarrage.
5. Attendre la réussite du build et vérifier `/api/online/health` : `managed-postgres`, `deploymentStage: staging`, commerce désactivé. Une réponse 200 seule ne remplace pas un parcours authentifié.
6. Tester inscription, connexion, création/reprise de ligue, mise concurrente et échéances sur ce serveur. Tester une restauration de sauvegarde et un redémarrage avant d’y accueillir des joueurs.
7. Relier ensuite une version de bêta du client à l’origine HTTPS réellement fournie par Render. Ne pas inventer l’URL à partir du nom du service et ne pas changer le client tant que l’API n’est pas vérifiée.

## Secrets et limites

Ne pas recopier de mot de passe ou de clé dans le chat. Utiliser le rôle serveur dédié ; ne pas réinitialiser le mot de passe administrateur PostgreSQL. Les clés Apple viendront ensuite dans les variables privées du serveur pour les essais iPhone.

Les en-têtes de proxy sont ignorés par défaut (`AGENTFC_TRUST_PROXY_HOPS=0`). Vérifier la chaîne d’entrée Render avant de modifier ce réglage, pour ne pas partager une seule limite IP entre tous les joueurs ni accepter une adresse usurpée.

La base de bêta doit être isolée de la future économie publique avant d’activer les achats Sandbox. `check:appstore` refuse un serveur dont `deploymentStage` n’est pas `production`, même si les autres capacités sont configurées. La bêta n’est donc pas automatiquement une version App Store.

Le Dockerfile a été réduit aux fichiers source du moteur/API nécessaires et utilise le manifeste verrouillé `server/online/package-lock.json`. Le fonctionnement PostgreSQL hébergé et les gardes de démarrage sont testés ; la compilation d’image Docker, le démarrage sur Render, la configuration du contrôle de santé HTTP et le parcours iPhone → Render restent à confirmer par le déploiement réel.

Le test opt-in `scripts/validate-managed-beta.mjs` permet de reproduire le parcours sur une base de bêta dédiée avec `NODE_ENV=production`, `AGENTFC_DEPLOY_STAGE=staging`, `AGENTFC_MANAGED_BETA_TEST=yes` et la connexion PostgreSQL fournie de manière privée. Il ne doit pas être exécuté sur une économie publique. Les horloges et échéances de production ne sont pas accélérées.

Références : [Blueprint Render](https://render.com/docs/blueprint-spec), [tarifs Render](https://render.com/pricing), [dossier de sortie App Store](APPSTORE-READINESS-2026-10-30.md).
