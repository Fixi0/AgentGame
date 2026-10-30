# Agent FC — préparation de la version 2.6

Vérification finale du **30 octobre 2026**. Cible : iPhone, jeu en ligne uniquement. **L’API de bêta est maintenant déployée et reliée à Supabase. Le code, les ressources et la compilation iPhone sans signature sont vérifiés. La version n’est pas prête à être soumise à Apple : clés Apple/APNs, achats Sandbox, signature et essais physiques restent nécessaires. Aucun build envoyé à Apple.**

L’utilisateur a choisi de se reconnecter à App Store Connect plus tard. Aucun produit, profil de signature ou réglage de ce compte n’a été publié pendant ce passage.

## Livré et amélioré

### Accueil et parties

- Accueil dans le style bleu/or du jeu, logo fourni, Anton et Barlow Semi Condensed, connexion classique et pont Apple natif. Le bouton Apple dans le navigateur indique sa disponibilité sur iPhone.
- Comptes classiques avec identifiant, agence, mot de passe et code de récupération privé affiché une fois ; aucune adresse email requise. Hachage des codes, rotation et révocation des sessions après récupération.
- Apple : nonce, vérification cryptographique, échange de code, jetons chiffrés et session iPhone dans le Trousseau. Le transport Apple réel n’est pas encore configuré sur Render.
- Partie rapide, ligue publique ou ligue privée nommée, invitation par code, copie avec solution de repli. Bouton Partager ajouté : utilise la feuille de partage de l’appareil, avec copie en secours.
- Dix agents ; lancement public avec bots après 90 s et au moins un humain, privé avec au moins deux humains. Bots identifiables.
- Tutoriel d’essai jouable en quatre étapes : prospect, entraînement, club, résultat. Il reste séparé de la compétition, sans crédit de pièces, diamant, client ou point. Sa fin est mémorisée sur le compte.
- Sortie d’une ligue terminée après la fenêtre de récompenses, pour choisir la suivante en conservant carrière, diamants et droits. Reset d’une ligue publique conserve sa visibilité publique.
- Français, anglais, espagnol, italien et russe : **626 messages explicites**, variables contrôlées et rendus React testés.

### Classement mondial, grandes zones et pays

Le classement de ligue est conservé. Un classement de **carrière permanent** est ajouté dans Ligue → Mondial, avec trois vues : Monde ; Europe, Afrique, Asie, Amériques, Océanie ; pays.

| Place à la fin de la ligue | Points de carrière |
| --- | ---: |
| 1 | 100 |
| 2 | 75 |
| 3 | 55 |
| 4 | 40 |
| 5 | 30 |
| 6 | 22 |
| 7 | 16 |
| 8 | 12 |
| 9 | 8 |
| 10 | 5 |

- Attribution à la fin de la saison, calculée par le serveur et enregistrée une seule fois par ligue/saison/compte. Les bots gardent leur place sportive mais ne participent pas au classement mondial.
- Points cumulés entre saisons, historique des dix derniers résultats et résumé de carrière dans le profil. Les resets et la sortie d’une ligue n’effacent pas ces points.
- Protection contre un double crédit, les saisons anormalement courtes et les saisons qui chevauchent une période déjà récompensée pour le compte.
- Pays facultatif, choisi dans le profil, sans GPS ; grande zone dérivée côté serveur du référentiel Unicode CLDR. Changement de pays limité à une fois tous les 28 jours.
- Présence publique volontaire. Un compte masqué conserve ses points ; aucune donnée de connexion ou de portefeuille n’est exposée dans les lignes publiques.
- Pagination de 50 agents, place personnelle retrouvable au-delà de la première page, total et filtres validés. Or/argent/bronze pour le podium, surbrillance de sa propre agence.
- Les cinq succès Game Center existants sont désormais alimentés par les victoires de championnat validées par le serveur. Un bouton dans Réglages permet l’authentification et la reprise de la file native ; cette partie nécessite encore un essai Apple sur appareil signé. Le classement de carrière est hébergé par notre serveur, indépendamment de Game Center.

Ce barème est la première règle implémentée pour la bêta. Il récompense la place finale ; les points de match de la ligue ne sont pas recopiés directement dans la carrière.

### Boutique, pass et visuel

- Deux clients inclus ; troisième emplacement permanent à **250 diamants**, contrôlé côté serveur.
- Pass de **28 jours et 28 paliers**, conforme aux récompenses du PDF, avec pièces également dans la voie payante selon le choix validé. Premium et Premium+ préparés ; prix réels fournis par StoreKit.
- Aperçu des récompenses premium déjà atteintes, temps restant, distinction entre collection permanente et dorure limitée à la saison. Premium+ après Premium reste présenté comme un achat supplémentaire au prix affiché.
- Fonds de profil et blason néon possédés réellement visibles sur l’agence. Aperçus de cosmétiques appliqués au blason/nom, quantités nulles retirées des contenus d’offres.
- Correction de la séparation entre achats Apple et économie du jeu : quand le commerce est désactivé, aucun achat StoreKit ne peut démarrer, mais les récompenses gratuites, l’équipement possédé et les dépenses de diamants déjà gagnés restent utilisables.
- Panneaux bleus, navigation active dorée, grands boutons orange/vert, icônes neutres fournies et portraits stables. Le mentor 3D reste uniquement dans une fenêtre de conseil ouverte volontairement.

## Serveur réellement déployé

| Élément | État vérifié |
| --- | --- |
| Render | Compte Sec, My Workspace, service `agentfc-online-beta`, Docker, Francfort, **free** |
| API | [Santé HTTPS](https://agentfc-online-beta.onrender.com/api/online/health), `managed-postgres`, `staging` |
| Déploiement actif | `dep-dbi7g3etlv9c7392urq0`, commit `5a9684d50d94821a4d9b0cb9397faf3ff5094cde` |
| Supabase | Agent FC Online, `xyzvooefdyotbqkiluuc`, Sec / pirates-match, Paris |
| PostgreSQL | Rôle runtime dédié, TLS vérifié, pool de cinq connexions, verrou partagé de transaction |
| Données privées | **16 tables**, RLS active partout ; aucun droit de schéma pour `anon` ou `authenticated` |
| Advisor sécurité | Aucun diagnostic lors du dernier contrôle |
| Clés Apple / APNs / commerce | Non configurés ou désactivés sur cette bêta |
| Déploiement automatique | Désactivé ; aucun changement de plan payant effectué |

Les achats, propriétaires, fonds réservés, attributs, résultats et points sont décidés par le serveur. Les commandes rejouées ne produisent pas de double débit. Le health check réalise une lecture PostgreSQL, pas seulement une réponse statique.

Le service Render utilise encore son contrôle de santé **TCP par défaut**. Le Blueprint et Docker prévoient `/api/online/health`, mais le réglage HTTP de la plateforme reste à appliquer dans le Dashboard. Les en-têtes de proxy sont ignorés (`AGENTFC_TRUST_PROXY_HOPS=0`) tant que la chaîne d’entrée n’est pas vérifiée. Avant montée en charge, vérifier cette chaîne et l’effet des limites d’authentification partagées derrière l’entrée Render.

L’offre gratuite se met en veille après 15 minutes sans trafic et peut prendre environ une minute à redémarrer. Cela peut retarder le calcul du soir et les notifications. Le client possède actuellement un délai réseau de 15 s : un premier accès après veille peut donc nécessiter Réessayer. Aucun maintien artificiel en éveil n’a été ajouté. Une disponibilité continue doit être choisie et testée avant la sortie publique. [Limites officielles Render Free](https://render.com/docs/free).

### Sauvegarde et données

Un export atomique des 16 tables est ajouté, avec fichier privé hors dépôt et restauration refusée sur une base déjà occupée. Le test avec données a préservé compte, portefeuille et points de carrière. L’export distant pris avant la migration, alors que les 15 anciennes tables étaient vides, a été restauré dans une nouvelle base locale ; l’ajout de la table de points reste compatible.

Cet export concerne le schéma du jeu. Il ne représente pas une sauvegarde complète du cluster Supabase, des rôles, d’Auth ou de Storage. Planifier un export régulier, sa conservation privée et un essai de restauration avec de vraies données avant ouverture.

Après retrait des seuls comptes de QA : **zéro compte, zéro ligue et zéro résultat de carrière distant**. Les deux faux résultats utilisés pour vérifier les requêtes du classement ont été supprimés. La partie locale existante n’a pas été déplacée ou effacée. Les autres projets Supabase et services Render n’ont pas été modifiés.

Taille finale mesurée : tables du jeu **696 320 octets** ; base complète **11 810 483 octets**. Cette base vide après QA ne permet pas d’estimer le nombre de joueurs supportés. Les mesures antérieures d’un état de saison (~38 ko au départ, ~0,93 Mo en fin de saison) restent des mesures locales, pas une capacité de production. Le verrou partagé reste adapté au pilote à mesurer ; il faudra le répartir par ligue si les attentes augmentent.

## Vérifications exécutées

**18 suites automatisées distinctes passent**, plus les contrôles du build. Les cinq suites antérieures encore pertinentes et les treize suites de régression finales sont conservées dans le fichier de validation.

| Contrôle | Résultat et portée |
| --- | --- |
| Saison complète | 28 soirées, 876 rencontres de championnat + 165 européennes ; clôture, reset et invariants |
| Concurrence / économie | Dix arrivées, emplacements, enchères concurrentes, fonds réservés, remplacement, clubs exclusifs et commandes rejouées |
| Joueurs | Profils/maillots cohérents, attributs, progression, potentiel, ventes sans création monétaire, libération confirmée, concurrence et suppression de compte |
| Pass | 28 paliers, missions Paris/heure d’été, récupération unique, Premium+, livraison tardive et remboursements avec fixtures |
| Comptes | HTTP local réel : inscription, connexion, récupération, sessions, renommage, suppression ; public/privé et lancement avec bots |
| Apple / APNs | Cryptographie, nonce, rejeu, révocation, préférences, échéances, dédoublonnage et reprise ; **transports externes simulés** |
| Publicités | IDs et formats fournis, consentement, concurrence, absence de gain sur annulation et nettoyage des listeners ; **aucune annonce réelle** |
| Classement | Cumul durable, attribution unique, protections temporelles, bots, confidentialité, filtres, pagination de 58 profils et historique |
| Parcours de carrière | Tutoriel sans récompense économique, cosmétiques possédés, sortie de saison, conservation des droits et succès Game Center autorisés |
| Boutique UI | Achat Apple/pass bloqué lorsque désactivé ; palier gratuit et place à 250 diamants accessibles avec des fonds déjà acquis |
| Réseau | Reprise de commande après coupure/500, 304 sur état inchangé, isolation des révisions compte/ligue |
| Sauvegarde | Restauration vide et peuplée, intégrité compte/solde/carrière, refus d’une base occupée ou d’un schéma inconnu |
| Traductions / React | 626 messages dans cinq langues, variables, rendus des écrans principaux, 86 fichiers JSX contrôlés |
| Web et paquet natif | **77 fichiers SHA-256**, graphe en ligne uniquement, mêmes empreintes dans `dist`, le projet iOS et l’app compilée |
| iPhone | **Release générique réussie, sans signature, Xcode 27.2 / SDK iOS 27.2**, sur le dernier paquet web |
| Simulateur | Service CoreSimulator toujours indisponible ; aucun parcours de jeu exécuté dans le simulateur pendant ce passage |

### Preuves sur le serveur public

Parcours HTTPS Render → PostgreSQL : santé, contrôle des origines, authentification, inscription/connexion, ligue privée/code, chat, enchères concurrentes, commande répétée et refus des achats non activés. Un redéploiement réel a confirmé la persistance d’une session, de la ligue et de sa meilleure enchère, puis l’invalidation de la session à la déconnexion.

La version avec classement a ensuite été testée sur PostgreSQL avec deux résultats artificiels de QA : Monde, pays et grandes zones, profil privé, changement de pays limité et tentative d’attribution de points côté client rejetée. Les vrais résultats de fin de saison sont vérifiés séparément dans les tests moteur. Les fixtures ne constituent pas des saisons publiques réellement jouées.

Mesure courte sur serveur chaud : **50 requêtes d’état, concurrence 5, 50 réponses 304**, total 1 031 ms ; médiane 76 ms, p95 225 ms. Ce contrôle ne mesure ni des milliers de joueurs, ni des notifications à heure réelle, ni un redémarrage après veille. Journaux de route/statut/durée activés sans corps ou jetons ; aucun journal de niveau erreur observé depuis le dernier déploiement lors du contrôle.

### Contrôle visuel interactif

Safari natif a permis de vérifier l’accueil, la connexion classique, le tutoriel complet sans changement de solde, l’activation volontaire du classement, le choix France, le verrou de changement de pays et les vues Monde / Europe / France. Le classement affiche correctement podium et agence personnelle à 390 × 844 et sur écran large ; les doublons de carte personnelle et les libellés singuliers ont été corrigés.

Le passage en russe a été observé. **Le dernier contrôle complet des nouvelles interfaces à 320 px n’a pas été achevé**, car le Mac s’est reverrouillé ; les derniers changements de boutique et le bouton Game Center ont été vérifiés par rendu React et compilation, sans nouvelle passe visuelle interactive. L’ancienne interface avait déjà été contrôlée à 320 px, ce qui ne remplace pas ce contrôle final.

L’accès au navigateur intégré de Work reste désactivé dans les réglages de l’utilisateur. Safari natif a été utilisé avec son autorisation après déverrouillage ; aucun réglage de sécurité de Work n’a été modifié.

## Bloquants avant TestFlight puis App Store

### 1. Signature, identité et clés Apple

Choisir la véritable équipe de l’app, les capacités Sign in with Apple / Push / Game Center et le profil de distribution pour `com.agentfc.Football-Agent-Simulator`. Une identité locale Apple Development existe ; cela ne confirme pas un profil de distribution pour cette app. Aucun identifiant d’équipe n’a été inventé ou injecté dans le projet.

Configurer côté serveur les clés Sign in with Apple et APNs, conserver la clé de chiffrement des jetons et enregistrer les callbacks :

- `/api/online/auth/apple/notifications` : changements de compte et consentement Apple.
- `/api/online/apple/notifications` : notifications StoreKit V2.
- `/api/online/ads/ssv` : validation des récompenses AdMob.

Installer un build signé. Tester réellement Apple, suppression/révocation, Trousseau, notifications autorisées/refusées, réception en arrière-plan et ouverture depuis un push. Les catégories échauffement (30 min avant), mercato, offres, buts, résultats, entraînement et chat sont préparées. Les buts viennent de notre simulation du soir.

### 2. Produits et isolation Sandbox

Créer ou vérifier les produits `agentfc_pass_season` (Premium, cible 4,99 € France) et `agentfc_pass_season_plus` (Premium+, cible 9,99 €, dix paliers d’avance). Type préparé : abonnement non renouvelable. Les cinq packs existants et `no_ads_pack` conservent leurs identifiants. Les prix affichés restent ceux de StoreKit.

Tester succès, annulation, achat en attente, coupure, relance pendant livraison, restauration et remboursement sur iPhone. **La bêta actuelle garde le commerce désactivé.** Le vérificateur accepte un environnement Apple par déploiement ; avant ouverture publique, finaliser une isolation Sandbox/TestFlight/App Review qui ne mélange pas l’argent de test avec l’économie compétitive réelle. Ne pas activer tous les reçus Sandbox dans les ligues publiques.

### 3. Hébergement de sortie et exploitation

Choisir une disponibilité continue pour respecter les rendez-vous du soir. Terminer santé HTTP Render, chaîne de proxy et limites, alertes d’erreur/latence/stockage, export régulier et restauration. Tester concurrence et reprise à une échéance avec des joueurs de bêta. La connexion privée reste dans les secrets Render ; aucune clé privilégiée ou connexion avec mot de passe dans `VITE_`, Git ou le bundle.

### 4. Mise à jour depuis la 2.5

L’ancien jeu était intégré d’après l’utilisateur, mais son projet Xcode et l’origine de sa WebView ne sont pas retrouvés. Installer la 2.6 **sans désinstaller la 2.5** sur un iPhone de contrôle. Vérifier accès aux anciennes données et restauration Sans publicités. Le retrait du solo ne supprime pas ses fichiers locaux, sans garantir l’accès depuis la nouvelle origine.

Les anciens consommables ne prouvent pas un solde restant. Ne pas recréditer tous les reçus historiques ; prévoir une reprise vérifiable ou une compensation décidée et dédoublonnée pour les anciens acheteurs.

### 5. Fiche et validation

Métadonnées mises à jour en cinq langues avec le classement, statut brouillon et limites de longueur contrôlées. Vérifier confidentialité, âge, chat, SDK/manifestes et contact d’assistance. Prévoir une modération suivie, pas seulement un filtre. Les captures finales doivent venir du build signé. Préparer un compte classique de démonstration et une ligue de validation préremplie avec accès rapide aux enchères, matchs et pass ; serveur disponible durant la revue. [Consignes Apple](https://developer.apple.com/app-store/review/guidelines/).

Le contrôle automatique reste volontairement **rouge sur quatre points** : environnement Production, Apple, APNs, StoreKit. Ressources, API publique, origine iOS, PostgreSQL géré, icône, entitlements et bundle ID passent. Ce contrôle ne remplace pas les essais physiques.

## Suite produit recommandée

Déjà ajoutés : tutoriel d’essai, partage d’invitation, fin de saison avec sortie propre, carrière globale, aperçus de cosmétiques et récompenses premium acquises. La DA approuvée reste conservée.

À mesurer pendant une bêta fermée avant d’ajouter davantage de dépenses :

1. **Regrouper les humains.** Mesurer la part de ligues avec plusieurs vrais joueurs. Le départ à 90 s reste la règle actuelle ; départs regroupés, place réservée à un ami et remplacement de bot avant la première soirée restent des propositions, non implémentées.
2. **Rendez-vous du soir.** Suivre le premier match vu et le retour J1/J7. Ajouter ensuite célébrations courtes, sons et haptiques désactivables. Aucun nouveau moteur de matchs amicaux n’a été ajouté.
3. **Compréhension de l’économie.** Ajouter un relevé lisible des dépenses/réservations/revenus et une aide contextuelle aux clubs indisponibles. Le serveur conserve déjà les mouvements ; une page de relevé complète reste à faire.
4. **Boutique.** Mesurer ouverture, achat réussi, échec, remboursement et utilisation réelle des cosmétiques. Les avantages payants sans plafond et les pièces premium du pass restent conformes au choix utilisateur ; surveiller le découragement des rivaux avant de changer cette règle.
5. **Instrumentation.** Aucun service d’analytics ni compte de surveillance externe n’a été installé. Définir les événements de parcours, puis les intégrer avec une collecte proportionnée ; les logs HTTP actuels ne mesurent pas la rétention.
6. **Dernière finition visuelle.** Reprendre les nouveaux écrans en russe à 320 px, puis sur un petit iPhone signé ; vérifier clavier/chat, masque de l’icône, textes longs et aperçus cosmétiques. Aucune nouvelle DA ou illustration n’est nécessaire.

## Commandes et fichiers utiles

- `npm run ios:beta` : construit et synchronise le paquet vers Render staging.
- `VITE_AGENTFC_API_URL=https://agentfc-online-beta.onrender.com npm run check:appstore` : expose les blocages actuels ; sortie 1 attendue.
- `npm run ios:release` : garde la barrière de sortie Production.
- `npm run test:rankings`, `test:career-extras`, `test:backup`, `test:store-ui` : nouveaux contrôles.
- `npm run test:online`, `test:online-players`, `test:online-pass`, `test:onboarding`, `test:notifications`, `test:state-sync`, `test:client-commands`, `test:production`, `test:online-locales`, `test:online-only`, `test:ads`, `test:boot`, `test:jsx`, `test:commerce`, `test:build` : autres validations.
- [État machine des vérifications](release/appstore/validation-2026-10-30.json).
- [Métadonnées App Store — brouillon](release/appstore/metadata-draft.json).
- [Guide iOS](ios/README.md), [guide serveur](server/online/README.md), [modèle privé](server/online/.env.example), [état Render](RENDER-DEPLOYMENT.md).

Le code serveur est publié sur la branche dédiée `codex/agentfc-server-beta`, déployée explicitement. `main` n’a pas été modifiée. Les sources UI/iOS restent préparées dans le projet local ; aucun paquet App Store n’est publié par cette mise à jour du serveur.
