# ETUSA NEXUS — Administration système

Application d’administration : API REST PHP 8.2/PDO_SQLSRV et interface Angular 18 responsive en français.

## Hypothèses de schéma

Le schéma confirmé : `AdminSYS(IdSYS, Nom, Prenom, Login, Password)`, `UTILISATEUR(IDUSERA, NOM, PRENOM, PASSWORD, CODE_PROFIL)`, `REFERENCE(ID_REFERENCE, ID_DIRECTION, CODE, DONNEES_DIRECTION, NOM_TABLE)`, `Direction(ID, Code, Nom, Actif)`, `PROFIL(IDPROF, CODE, LIBELLE, IDDIRECTION, ACC_CARTE, ACC_APP)` et `REF_PROFIL(ID_REFPROFIL, CODE_PROFIL, CODE_REFERENCE, ACC_AJOUT, ACC_MODIF, ACC_SUPP)`. Les tables sont qualifiées avec le schéma dbo. Les formulaires proposent des listes déroulantes pour les relations : profil vers direction par Code, utilisateur vers profil par CODE, et autorisation vers profil/référence par leurs codes. Le formulaire affiche les informations liées, mais enregistre le code attendu dans la table. Le projet mappe les utilisateurs et références selon ces colonnes. `PASSWORD` des utilisateurs n'est jamais renvoyé à l'interface. Les champs des autorisations sont complétés par une jointure `REFERENCE.CODE = REF_PROFIL.CODE_REFERENCE`.

`REF_PROFIL` associe un profil à une référence avec trois autorisations binaires. Les accès application/carte sont aussi conservés dans PROFIL. Toutes les suppressions sont définitives, y compris pour les directions.

## Installation

1. Installer PHP 8.2+, extensions PDO_SQLSRV/SQLSRV, SQL Server, Node.js 20+ et Angular CLI 18.
2. Copier `backend/.env.example` vers `backend/.env`; saisir serveur, base, identifiants SQL et clé APP_SECRET d’au moins 32 caractères.
3. Pointer Apache/Nginx vers `backend/public`. En développement : `php -S 127.0.0.1:8080 -t backend/public backend/public/index.php`.
4. Créer le compte initial : `php backend/scripts/create-admin.php LOGIN NOM PRENOM 'mot-de-passe-de-12-caracteres'`.
5. Dans `frontend`, exécuter `npm install` puis `npm start`.
6. Vérifier les mappings de `Config.php`. Le script `database/recommended-constraints.sql` est facultatif; vérifier les doublons avant de l’exécuter.

## API

`POST /api/auth/login`; `GET /api/dashboard`; CRUD JSON sur `/api/directions`, `/api/profils`, `/api/utilisateurs`, `/api/references`, `/api/ref-profils`; `GET /api/permissions`. Les routes privées exigent `Authorization: Bearer <token>`. Limiter l’origine CORS, imposer HTTPS et utiliser un compte SQL de privilèges minimaux. Les mots de passe sont stockés par `password_hash()` et vérifiés avec `password_verify()`.

## Contrôles et actions de suppression

Les formulaires contrôlent tous les champs affichés. L’API revérifie les champs obligatoires, les longueurs déclarées dans SQL Server, les codes liés et les doublons. Les profils et références encore associés à des utilisateurs ou autorisations ne peuvent pas être supprimés; l’interface affiche la raison. Une suppression sans ligne correspondante renvoie un message « introuvable ». Toutes les suppressions sont définitives, y compris pour les directions.

## Réinitialiser les données de test

Le script `database/reset-test-data.sql` vide Direction, PROFIL, UTILISATEUR, REFERENCE et REF_PROFIL dans une transaction, puis réinitialise leurs colonnes IDENTITY lorsqu'elles existent. Il conserve AdminSYS afin de ne pas supprimer le compte permettant de se connecter. Ouvrir le script dans SQL Server Management Studio avec la base ETUSA_Cartographie sélectionnée et l'exécuter seulement après vérification de la base cible.
