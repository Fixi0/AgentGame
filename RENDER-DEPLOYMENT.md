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

- Compte Render **Sec**, demandé par l’utilisateur : workspace **My Workspace** (`tea-dbi6eaqjnfac73cv0bmg`).
- Service gratuit créé : `srv-dbi6plmtlv9c739165bg`, Francfort, Docker, `plan: free`, déploiements automatiques désactivés. [Tableau Render](https://dashboard.render.com/web/srv-dbi6plmtlv9c739165bg).
- API publique : https://agentfc-online-beta.onrender.com/api/online/health. Déploiement `dep-dbi6qoutlv9c73919b3g` confirmé **live** ; image Docker compilée sur Render.
- Redéploiement de contrôle `dep-dbi7g3etlv9c7392urq0` confirmé **live**, commit exécuté `5a9684d50d94821a4d9b0cb9397faf3ff5094cde`. Les comptes rendus ajoutés ensuite à la branche ne sont pas redéployés automatiquement.
- Parcours HTTPS public → Render → Supabase validé : santé en mode `managed-postgres` et `staging`, origine iPhone autorisée, origine inconnue refusée, inscription/connexion, mauvaise authentification refusée, ligue privée avec code, rejeu de commande sans doublon, enchères concurrentes, chat et achat refusé lorsque le commerce est désactivé.
- Après le redéploiement réel, la session, la ligue et la meilleure enchère ont été retrouvées ; la déconnexion invalide la session. Nettoyage terminé, base vérifiée à **zéro compte et zéro ligue**. Aucun achat ni publicité réel exécuté.
- Connexion Node → pooler Supabase vérifiée en **TLS 1.3**, certificat autorisé et chiffrement AES-256-GCM. Le client vérifie la chaîne et le nom du serveur.
- Les capacités Apple, push APNs et commerce restent **désactivées/non configurées** : cette bêta serveur ne valide pas encore la connexion Apple ou la réception de notifications sur un iPhone physique.
- Code serveur publié sur la branche dédiée [`codex/agentfc-server-beta`](https://github.com/Fixi0/AgentGame/tree/codex/agentfc-server-beta). La branche `main` et les services existants n’ont pas été modifiés.
- Historique : sur l’ancien compte **Primary**, workspace `tea-d76eg06slomc738h1mj0`, les essais payant et gratuit étaient refusés avec **HTTP 402, `billing_suspended`**. Ce compte n’héberge aucun Agent FC et ses autres applications n’ont pas été modifiées.
- Supabase : projet `xyzvooefdyotbqkiluuc`, pooler confirmé `aws-1-eu-west-3.pooler.supabase.com:5432`. Connexion TLS avec chaîne et nom d’hôte vérifiés grâce au certificat public officiel Supabase.
- Le rôle dédié `agentfc_beta_runtime` possède les opérations de données sur les 16 tables privées du jeu, avec des politiques RLS réservées à ce rôle. Aucun accès au schéma Auth ; `anon` et `authenticated` n’ont pas accès au schéma du jeu. Aucun avertissement de sécurité Supabase après la migration.
- Le rôle serveur a reçu un nouveau secret et est **LOGIN**. La connexion est stockée dans les variables privées du service Render Sec. Ne pas utiliser le mot de passe administrateur. Un premier démarrage a rencontré un refus d’authentification après la rotation ; la connexion TLS a ensuite été revérifiée et le déploiement relancé avec succès.
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

Le Dockerfile a été réduit aux fichiers source du moteur/API nécessaires et utilise le manifeste verrouillé `server/online/package-lock.json`. Le fonctionnement PostgreSQL hébergé, les gardes de démarrage, la compilation Docker et le démarrage Render sont vérifiés. Le service créé via l’intégration utilise actuellement le contrôle de santé **TCP par défaut** ; le champ HTTP n’est pas exposé par l’outil de création. Le Blueprint prévoit `/api/online/health`, à appliquer dans les réglages Render avant la sortie publique. Le parcours sur iPhone physique reste à vérifier.

Le test opt-in `scripts/validate-managed-beta.mjs` permet de reproduire le parcours sur une base de bêta dédiée avec `NODE_ENV=production`, `AGENTFC_DEPLOY_STAGE=staging`, `AGENTFC_MANAGED_BETA_TEST=yes` et la connexion PostgreSQL fournie de manière privée. Il ne doit pas être exécuté sur une économie publique. Les horloges et échéances de production ne sont pas accélérées.

Références : [Blueprint Render](https://render.com/docs/blueprint-spec), [tarifs Render](https://render.com/pricing), [dossier de sortie App Store](APPSTORE-READINESS-2026-10-30.md).


## Classements et contrôle final

Le déploiement actif ci-dessus comprend les points de carrière durables et les filtres Monde / Europe, Afrique, Asie, Amériques, Océanie / pays. `season_points` est une table privée supplémentaire ; le rôle runtime possède sa politique RLS dédiée. Advisor sécurité vérifié : aucun diagnostic.

Le classement distant a été testé avec deux résultats de saison artificiels, réservés au test de requête : filtres, confidentialité, changement de pays limité, attribution de points falsifiée refusée. Le calcul de vrais résultats sur 28 soirées est couvert séparément par les tests moteur. Après nettoyage ciblé, la base distante est revenue à zéro compte, zéro ligue et zéro résultat de carrière ; aucun faux score public n’est conservé.

Mesure limitée, serveur chaud : 50 consultations d’état, concurrence 5, 50 réponses 304, durée totale 1 031 ms, médiane 76 ms et p95 225 ms. Ce test ne mesure pas une capacité de production. Les journaux structurés d’URL/statut/durée sont activés, sans corps ni jetons. Aucun log de niveau erreur observé depuis le dernier déploiement lors de la vérification finale.

Le build `npm run build:beta` et `npm run ios:beta` cible explicitement cette API. `ios:release` conserve les contrôles de sortie et refuse cette configuration staging. La connexion Apple, les pushs et les vrais achats ne sont pas activés par ces commandes.

Sauvegarde : `scripts/backup-online.mjs` exporte les 16 tables dans un fichier privé, hors dépôt. La restauration refuse un dossier déjà existant et cible une nouvelle base locale dédiée. Le test de restauration peuplée a préservé compte, portefeuille et points de carrière ; une sauvegarde distante vide prise avant migration a également été restaurée localement. Cela ne valide pas une restauration complète du cluster Supabase, de ses rôles, d’Auth ou de Storage. Organiser et contrôler une sauvegarde régulière avant d’ouvrir à de vrais joueurs.

Dernier contrôle : cinq index de compte ajoutés au PostgreSQL privé, suppression réelle des comptes classiques de QA et révocation vérifiées, puis nettoyage ciblé à zéro compte/zéro ligue. Advisor sécurité sans diagnostic, plus de clé étrangère sans index ; seules des informations d’index non encore utilisés restent. Aucun changement de plan, de clés ou du runtime Render.
