# Serveur Agent FC Online — local et préparation PostgreSQL géré

## Fonctionnement

Node 24 exécute le moteur autoritaire et une base PostgreSQL embarquée PGlite. Le navigateur transmet des commandes authentifiées ; il ne décide ni de l’argent, ni des propriétaires, ni du résultat des matchs. Un seul processus détient la base locale ; un verrou refuse une seconde ouverture simultanée. Les commandes et échéances sont sérialisées dans des transactions, avec identifiants de commande et de transaction commerciale uniques.

`npm run online:dev` lance API et Vite. URL du jeu : `http://127.0.0.1:4175/`. API : `http://127.0.0.1:4180/api/online`. `/health` indique l’état et les connecteurs configurés ; il ne prouve pas qu’un achat ou une notification réelle a été testé. Vite et son aperçu sur 4174 transmettent `/api/online` au serveur. L’API locale écoute sur 127.0.0.1 ; en production, le conteneur écoute sur 0.0.0.0 derrière une entrée HTTPS.

Les comptes locaux utilisent scrypt avec sel, des jetons aléatoires dont seul le hash est conservé, expiration à 30 jours, limites de débit et révocation à la déconnexion. Les comptes classiques reçoivent un code de récupération privé, à conserver : la récupération remplace le code et révoque toutes les anciennes sessions. Aucun email n’est collecté. Sign in with Apple natif est implémenté avec nonce à usage unique, vérification JWT et échange du code côté serveur ; les clés privées Apple et la clé de chiffrement restent à configurer. Le Trousseau conserve la session sur iPhone. La suppression demande une nouvelle preuve Apple ou le mot de passe classique.

## Règles présentes

| Élément | Comportement |
| --- | --- |
| Ligue | Publique ou privée avec code, 10 agences ; publique à partir de 1 humain et départ automatique après 90 s, privée à partir de 2 humains ; bots identifiés aux places libres |
| Clients | 2 mandats par défaut, troisième emplacement permanent via 250 diamants ; un seul client représenté par club dans toute la ligue |
| Départ | 60 pièces, aucun client, 30 enchères d’ouverture pendant 24 h de préparation |
| Revenus de jeu | Commissions et allocation de 15 pièces par semaine ; aucune vente de pièces contre des gemmes |
| Marché | 15 nouveaux joueurs de niveaux variés par semaine, en trois vagues de cinq ; chaque lot dure 24 h |
| Enchère | Mise supérieure à la précédente, budget et place réservés ; la première mise reçue à ce montant précède les autres, une égalité est refusée |
| Remplacement | L’ancien client est conservé si la mise perd ; remplacement atomique à la victoire, sans duplication du joueur |
| Clubs | 8 besoins hebdomadaires, candidatures par poste résolues ensemble ; choix Sécurité/Équilibre/Ambition, commissions 3/5/8 pièces |
| Offres entre agents | Choix d’un client adverse et d’un montant en pièces ; acceptation ou refus gratuit par son agent, expiration sans vente après 24 h |
| Échange volontaire | Montant libre de 1 à 100 000 pièces, limité aux fonds disponibles ; fonds/place réservés, un échange par paire d’agents et par semaine |
| Absence | Après 48 h et si activé : entraînement, renouvellement, candidatures prudentes ; aucune vente automatique |
| Saison | 24 h de préparation puis 28 soirées, une journée par soir à 21 h Europe/Paris, changement d’heure géré |
| Sport | 96 clubs des cinq championnats ; aller simple (876 rencontres) ; trois coupes à 16 clubs, six soirées de groupes puis quarts/demis/finale en match unique (165 rencontres) |
| Classement | Valeur des clients + commissions × 2 + trophées × 15 + buts ; divisions Bronze, Argent, Or, Diamant, Légende |
| Mondial | Cycles communs de 28 jours, meilleur score d’une saison terminée par compte volontaire ; trois premiers récompensés une seule fois par cycle |
| Reset | Pièces, mandats et progression compétitive remis au départ ; compte, gemmes, cosmétiques et pass en cours conservés |
| Pass | Saison de 28 jours, 28 paliers de 100 XP, voies gratuite et premium ; trois missions quotidiennes à 35 XP et trois hebdomadaires à 150 XP |

L’exclusivité du club est contrôlée au dépôt d’une mise, au recrutement et à la proposition/clôture d’un placement. Une mise en tête réserve également le club. Un client échangé conserve son club : seul le mandat change de propriétaire. Les offres anciennes de débauchage automatique sont annulées par la migration. Les bots respectent deux emplacements. Une ancienne agence humaine ayant déjà trois clients conserve ses clients mais doit revenir au quota autorisé avant tout nouveau recrutement.

Le calendrier est une simulation raccourcie, pas le calendrier réel UEFA. Les scores viennent du moteur partagé `src/engine/matchEngine.js`, avec graine privée par monde. Une rencontre est calculée une fois, puis partagée. Le navigateur ne reçoit pas la graine ni les rapports de scouting privés des adversaires. L’interface interroge une révision opaque toutes les cinq secondes lorsqu’elle est visible ; un état inchangé répond 304 et ne recharge pas la saison complète. Les échéances invalident cette révision même avant le passage de l’ordonnanceur. Ce n’est pas Supabase Realtime.

Le rattrapage des échéances après interruption est chronologique et dédoublonné. L’ordonnanceur vérifie uniquement les mondes dont la prochaine échéance est atteinte, toutes les 30 secondes ; une lecture ou une commande rattrape aussi les échéances. Les archives et messages ont des limites, mais les historiques comptables, commandes et tables opérationnelles demandent encore une politique de rétention mesurée avant lancement à grande échelle.

## Données et sauvegarde

Répertoire par défaut : `~/.local/share/agentfc-online`. Surcharge possible avec `AGENTFC_DATA_DIR`. Ne pas placer cette base ouverte dans iCloud. Arrêter proprement le serveur avant de copier intégralement le répertoire vers une sauvegarde privée ; conserver une copie avant toute migration. Le fichier `.lock` adjacent protège le processus vivant, il n’est pas un export de données. Une base de test distincte s’obtient avec un autre répertoire, sans effacer les comptes de la base courante.

Le schéma `agentfc_online` est privé et ses tables ne doivent pas être exposées à une API Data publique. Le SQL active RLS sans règle d’accès client et révoque les droits publics. Les 16 tables ont été créées dans le projet dédié Agent FC Online (`xyzvooefdyotbqkiluuc`, compte Sec, organisation pirates-match). RLS et l’absence de droits pour anon/authenticated ont été vérifiés à distance ; un test de révision a été annulé par rollback sans laisser de compte. La connexion Node → PostgreSQL géré et le runtime HTTPS Render ont ensuite été vérifiés par un parcours authentifié, y compris concurrence et redémarrage. L’authentification de jeu reste celle du serveur ; Supabase Auth n’est pas utilisé par ces comptes.

## Achats, publicités et notifications

Le troisième emplacement coûte **250 diamants**, payés une seule fois pour le compte. La commande authentifiée `unlock_third_client` vérifie le solde, débite 250 et enregistre le droit permanent dans la même transaction. Le tarif envoyé par le client est ignoré ; une répétition de commande ne redébite pas le compte. Le droit est conservé entre les saisons. Aucun nouveau produit Apple dédié n’est nécessaire : l’ancienne proposition à 5,99 € a été remplacée par cette règle. Les packs de diamants existants restent validés par transactions Apple signées. Le nom technique `wallet.gems` est conservé pour préserver les soldes.

Les cinq produits existants livrent respectivement 80/250/650/1 700/4 500 gemmes. `no_ads_pack` reste non consommable. Les prix sont ceux de StoreKit, sans prix de secours inventé. Les produits prévus sont `agentfc_pass_season` et `agentfc_pass_season_plus`, abonnements non renouvelables liés à la saison de 28 jours (cibles France : 4,99 € / 9,99 €). Les deux produits doivent encore être créés dans App Store Connect. Premium+ ajoute dix paliers une seule fois ; après un achat Premium, le prix Premium+ est un achat supplémentaire, indiqué dans l’interface. L’ancien `agentfc_pass_8weeks` reste reconnu et ses droits de 56 jours sont conservés. Les avantages influencent la compétition sans plafond d’achat, conformément au choix de l’utilisateur. Le pass payant peut aussi attribuer des pièces d’enchères, choix explicitement validé par l’utilisateur ; les packs de diamants ne convertissent pas directement les diamants en pièces. Les valeurs de balance restent à calibrer en bêta.

L’achat en ligne porte l’`appAccountToken` du compte. Le serveur vérifie le JWS Apple avec la bibliothèque officielle et ses certificats racines, le bundle et le type du produit. Seul le commit serveur autorise ensuite `finishPurchase`. Rejeu, mauvaise attribution de compte et remboursements sont traités ; une révocation reçue avant livraison laisse une trace empêchant le recrédit d’un ancien reçu. Un remboursement de gemmes déjà dépensées crée un solde à régulariser sur les prochaines livraisons. Le paquet livré ne contient plus le jeu solo.

Sans Pubs est également vérifié via les droits StoreKit de l’installation pour respecter un ancien achat sans `appAccountToken`. Les consommables terminés de l’ancienne version ne sont pas réinventés en crédits de compte. Les essais sur appareil réel restent nécessaires.

Configuration serveur, dans l’environnement privé du processus :

| Variable | Usage |
| --- | --- |
| `AGENTFC_API_PORT` | Port local, 4180 par défaut |
| `AGENTFC_DATA_DIR` | Base persistante distincte |
| `AGENTFC_ALLOWED_ORIGINS` | Origines exactes séparées par virgule ; valeurs locales et `capacitor://localhost` par défaut |
| `AGENTFC_APPLE_ENVIRONMENT` | `Sandbox` pour les achats de test, Production sinon |
| `AGENTFC_ADMOB_SSV_ENABLED` | `true` uniquement après configuration du callback HTTPS public et essai Google SSV |
| `AGENTFC_APNS_KEY_PATH` | Chemin privé du fichier Apple `.p8`, jamais dans le bundle ou Git |
| `AGENTFC_APNS_KEY_ID` / `AGENTFC_APNS_TEAM_ID` | Clé APNs et équipe de signature Apple |
| `VITE_AGENTFC_API_URL` | Origine HTTPS du futur serveur, fournie au build de l’interface iOS |

Callbacks à configurer une fois l’hébergement prêt : `/api/online/apple/notifications` (Apple V2) et `/api/online/ads/ssv` (AdMob). Ils ne sont pas joignables depuis Apple/Google sur localhost. Les spots récompensés en ligne sont donc désactivés localement. La récompense de deux gemmes exige signature Google, nonce lié au compte et transaction unique ; maximum trois gains par jour. Aucun callback JS seul ne donne de gemmes en ligne.

Les ID AdMob iOS fournis sont dans `src/config/iosAds.json`. Le consentement précède les requêtes publicitaires. Une interstitielle automatique peut être réservée à partir de sept soirées, au maximum une fois par semaine et au bureau. Les annonces ne sont pas exécutées pendant les tests automatisés.

La cloche conserve les événements personnels dans le jeu. Le code APNs regroupe les événements, applique les préférences, limite les tentatives et retire les jetons invalides. Aucune clé APNs n’est configurée ici : aucun push iPhone réel n’est annoncé comme validé. Les événements de buts et résultats sont issus du lot de simulation du soir ; il ne s’agit pas d’un match temps réel étalé sur 90 minutes.

## Chat, assistance et outils locaux

Chat privé par ligue, 300 caractères, fréquence limitée, filtrage de base des liens/HTML/termes interdits, blocage et signalement. Deux signalements distincts masquent automatiquement un message. L’assistance accepte un message privé et son suivi. Le filtre n’est pas une modération exhaustive.

Après arrêt du serveur, le propriétaire de la machine peut traiter la file sans endpoint administrateur public :

```sh
node server/online/moderate.mjs list
node server/online/moderate.mjs hide MESSAGE_ID
node server/online/moderate.mjs restore MESSAGE_ID
node server/online/moderate.mjs answer TICKET_ID 'Réponse au joueur'
```

L’horloge de développement est un fichier privé, sans commande HTTP :

```sh
node server/online/dev-clock.mjs 28
```

Cela ajoute 28 heures au temps de test courant. Le parcours navigateur du 29 octobre utilise une ligue de test avancée de 28 h pour vérifier clôture et première soirée. `reset` remet le décalage à zéro, mais ne rembobine aucun résultat : l’utiliser avec une nouvelle base de test, pas pour faire revenir une saison déjà jouée dans le passé.

## État de validation et suite

`test:online` couvre une saison complète (1 041 rencontres), capacité, fonds réservés, enchères concurrentes, remplacement atomique, concurrence de dossiers clubs, offres volontaires entre agences, isolation des ligues, commandes rejouées, chat, blocage/signalement, assistance privée, classement volontaire et récompenses, transactions vérifiées/simulées, signatures SSV et refunds. Il démarre son propre serveur HTTP et une base en mémoire. Les vérifications de signature Google utilisent une clé de test ; le test Apple ne prétend pas fabriquer un vrai reçu Apple. Une vérification séparée sur disque a confirmé la persistance et le refus d’un second écrivain.

Un parcours réel dans le navigateur a créé deux comptes, rejoint une ligue commune, échangé des messages, démarré avec huit bots, misé, reçu le client à la clôture, lancé son entraînement, envoyé une candidature club et ouvert son résultat sportif. Les contrôles visuels couvrent 320 px en russe, 390 px en français et un écran large.

Le projet gratuit dédié Agent FC Online existe ; ses 16 tables privées sont appliquées et le runtime Render s’y connecte avec TLS vérifié. Aucun projet d’une autre application n’a été modifié. `postgres-store.mjs` adapte le contrat de transactions à node-postgres, avec TLS vérifié, pool de cinq connexions et verrou PostgreSQL partagé entre workers. La connexion privée est en service et le parcours HTTPS a vérifié persistance et concurrence sur PostgreSQL ; les comptes locaux n’ont pas été transférés. Restent à valider la charge de production, les échéances à heure réelle, les sauvegardes régulières et leur restauration distante, la rétention, la modération exploitée, les intégrations Apple/Google réelles et la mise à jour d’un iPhone contenant une carrière 2.5. Les différences d’opposition entre ligues à deux et dix humains doivent aussi être mesurées pour calibrer le classement mondial.

## Profils, ventes et libérations

`player-profile.mjs` conserve les caractéristiques et compétences par joueur. `tickWorld` complète les anciennes sauvegardes de façon déterministe ; les champs privés de potentiel et de progression restent réservés au propriétaire ou aux rapports de scouting achevés. Les six compétences alimentent l'adaptateur du moteur sportif ; l'XP des matchs complète l'entraînement, sans dépasser le potentiel.

Les commandes authentifiées `list_client`, `withdraw_listing` et `release_client` utilisent les mêmes transactions et identifiants de requête que les enchères. Une annonce n'accorde pas de pièces. Une vente passe toujours par `offer_deal` puis `respond_deal`. Libérer exige `confirm: true`, vérifie la propriété et les réservations, annule l'annonce et les candidatures, puis remet le joueur aux enchères sans dupliquer son identité. Les invariants vérifient les enchères uniques de joueurs libres, la propriété des annonces et l'intégrité des caractéristiques.

La dernière soirée du calendrier est la fin effective de saison. Les besoins clubs, annonces, transactions et enchères sont bornés à cette échéance ; la dernière semaine de candidatures est résolue avant le match final. La compatibilité des anciennes échéances est traitée au prochain tick, sans réécrire les résultats passés.

`npm run test:online-players` démarre une base en mémoire et un vrai serveur HTTP pour tester migration stable, attributs, progression, plafond, confidentialité, commissions proposées/résolues, prix de vente, absence de création monétaire, retrait/expiration, réservations, confirmation, unicité des enchères, concurrence vente/libération, requêtes répétées et suppression de compte. Le test n'utilise ni la partie locale de l'aperçu ni les comptes de production.


## Pass et blasons fournis (29 octobre)

`pass-catalog.mjs` reprend les 28 récompenses du PDF : 55 pièces / 9 diamants gratuits et 85 pièces / 23 diamants dans la voie payante, avec cosmétiques. `season-pass.mjs` suit l’XP uniquement depuis les actions validées et les événements du serveur. Les missions changent à minuit à Paris (heure d’été comprise). Avancer un palier coûte cinq diamants et n’est autorisé qu’à partir du jour 20. Chaque palier se récupère manuellement une fois par voie, même si la requête est rejouée. Une fenêtre de récupération demeure jusqu’à minuit après le dernier match ; le propriétaire ne peut pas relancer la ligue avant cette échéance.

`prepare_pass_purchase` mémorise le contexte de saison avant StoreKit. La livraison exige une transaction Apple vérifiée, le bon type, le bon compte et un identifiant unique. Une transaction arrivant trop tard ou en doublon de droit devient un crédit de pass activable, sans réinitialiser la saison. Premium+ ne cumule jamais deux avances de dix paliers. Les remboursements retirent les gains devenus inéligibles, sans dépenser l’argent déjà réservé dans une enchère : la dette restante est compensée par les revenus suivants. L’annulation du remboursement est idempotente. Les anciens packs, Sans Pubs, diamants et le troisième emplacement permanent restent inchangés.

Les 18 SVG reçus sont dans `src/assets/online/badges/` ; le générateur source du PDF est conservé dans `design/online/supplied/blasonEquipe.ts` et adapté en `suppliedBadgeRenderer.js`. Les couleurs, motifs et formes sont contrôlés côté serveur. Les motifs premium et le rond nécessitent leur déblocage ; les couleurs et six motifs de base sont gratuits. Cadres, fonds, stickers, effets et titres réclamés sont conservés dans la collection. La dorure immédiate du blason, du nom et du classement expire avec le pass. Les agences IA conservent des motifs gratuits, sans faux premium. Le personnage 3D ne figure que dans une fenêtre de conseil ouverte volontairement.

Validation spécifique : `npm run test:online-pass`. Les fixtures Premium et reçus utilisés dans ce test sont isolés en mémoire : ce test ne prouve pas un achat Apple Sandbox sur iPhone. Aucun abonnement, produit, tarif ou callback externe n’a été publié.

## Connexion Apple et notifications du 30 octobre

Les variables privées supplémentaires sont listées dans [`.env.example`](.env.example). Le callback des changements de compte Apple est `/api/online/auth/apple/notifications`, distinct des transactions StoreKit. Les jetons de rafraîchissement sont chiffrés AES-256-GCM ; conserver une sauvegarde sûre de la clé de chiffrement. Un retrait de consentement révoque les sessions ; la suppression demandée dans le jeu purge les accès et met la révocation Apple en file de reprise.

Les notifications distinguent échauffement 30 minutes avant le match, marché/ouverture/fin imminente d’une enchère suivie, résultats, buts, offres, fin d’entraînement et chat (désactivé par défaut). Le joueur choisit les catégories ; l’autorisation iOS est proposée dans le contexte d’une ligue. Les réponses APNs invalidant un jeton le retirent, les erreurs transitoires sont reprises trois fois. Les délais sont calculés côté serveur. Les transports Apple utilisés par les tests sont simulés.

La variable `AGENTFC_DATABASE_URL` active PostgreSQL géré sans appliquer de DDL au démarrage. Le Dockerfile est déployé sur le service gratuit Render Sec `agentfc-online-beta`, en staging et relié au PostgreSQL privé Supabase. Par défaut les en-têtes X-Forwarded-For sont ignorés ; `AGENTFC_TRUST_PROXY_HOPS` ne s’active qu’après restriction de l’accès Node à un nombre connu de proxies. Sinon tous les joueurs derrière l’entrée partageraient la même limite IP, ou un client direct pourrait usurper une adresse.

La sortie exige encore une stratégie StoreKit Sandbox/App Review isolée : l’adaptateur vérifie actuellement un environnement Apple par déploiement. Ne jamais accepter des reçus Sandbox non filtrés dans l’économie compétitive publique. Voir [le dossier App Store](../../APPSTORE-READINESS-2026-10-30.md).


## Points de carrière et géographie

À la fin d’une saison complète, `ranking-points.mjs` attribue 100, 75, 55, 40, 30, 22, 16, 12, 8 ou 5 points selon la place dans la ligue. Les bots occupent leur place sportive mais ne figurent pas dans le classement mondial. La clé `(league_id, season, account_id)` empêche un double gain. Une saison courte ou chevauchant une saison déjà créditée pour le compte ne produit pas de gain supplémentaire. Le reset des clients/pièces n’efface pas les points.

`GET /api/online/leaderboard?scope=world|region|country` accepte `region=EU|AF|AS|AM|OC`, `country=FR` et `page=0`. Authentification requise. Le résultat fournit 50 lignes au maximum, le total, la place du compte et ses dix dernières saisons. Seuls les comptes ayant choisi l’affichage public figurent dans les résultats publics. Le pays facultatif vient des préférences du compte, sans GPS, avec changement limité à une fois tous les 28 jours ; la région est dérivée côté serveur du référentiel Unicode CLDR. Aucun solde ni identifiant de connexion n’est exposé dans les lignes publiques.

Tests : `test:rankings`, `test:career-extras`, `test:backup`, `test:store-ui`. Le dernier couvre le blocage StoreKit sans bloquer le pass gratuit ou les diamants déjà gagnés. Le tutoriel d’essai ne distribue aucun avantage économique. Après la fenêtre de récompenses, `leave_finished` permet de choisir une nouvelle ligue en conservant carrière, diamants et droits du compte.

## Sauvegarde et hébergement vérifié

`backup.mjs` gère un export atomique des 16 tables. `scripts/backup-online.mjs` écrit hors dépôt en mode 0600 et refuse une restauration dans une base locale déjà existante. Ne pas déposer un export dans Git ni dans un canal public. Un export du jeu n’inclut pas les rôles, Auth et Storage Supabase.

Le service de bêta et les résultats HTTPS réels sont décrits dans [RENDER-DEPLOYMENT.md](../../RENDER-DEPLOYMENT.md). Le health check exécute `SELECT 1`, en plus d’exposer les capacités configurées. Les logs facultatifs `AGENTFC_LOG_HTTP=true` enregistrent route, statut et durée sans corps, tokens ni adresses IP. Le modèle Blueprint propose un contrôle HTTP ; le service créé via l’intégration utilise encore TCP. Les alertes et le plan de restauration de production restent à configurer.

La migration `agentfc_account_lookup_indexes` ajoute cinq index de recherche par compte, également présents dans `schema.sql`. Après application sur la bêta, le diagnostic de clés étrangères non indexées a disparu. Les informations d’index inutilisés sont conservées tant que le trafic réel ne justifie pas un retrait. Les permissions RLS n’ont pas été élargies.
