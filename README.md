# API AWS Backend

Cette API fournit des fonctionnalités pour la gestion des utilisateurs, l'authentification, la création et la gestion des machines virtuelles (VM), ainsi que des outils de gestion d'infrastructure via Terraform et Ansible.

## Prérequis

1. **Node.js** : Assurez-vous d'avoir Node.js installé sur votre machine. Vous pouvez vérifier la version avec :
   ```
   node -v
   ```
2. **Base de données** : Le projet utilise une base de données (à configurer via `config/db.js`). Assurez-vous que votre base de données est accessible.

3. **Variables d'environnement** : Utilisez un fichier `.env` pour définir les variables nécessaires (par exemple, les informations de connexion à la base de données et les secrets JWT). Un exemple de fichier `.env` peut être fourni :

   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=password
   JWT_SECRET=secretKey
   JWT_EXPIRATION=3600
   ```

## Installation

1. Clonez ou téléchargez le projet.
2. Accédez au dossier du projet :
   ```
   cd C:\Users\vandi\Downloads\api-aws-backend
   ```
3. Installez les dépendances :
   ```
   npm install
   ```

## Lancer l'application

Après avoir installé les dépendances, lancez le serveur avec la commande suivante :
```
npm start
```

Cela démarrera le serveur sur le port par défaut (3000) ou celui défini dans vos variables d'environnement.

## Description des principales fonctionnalités

### 1. **Authentification**
   - **Routes disponibles** : `/api/signup`, `/api/signin`, `/api/logout`, `/api/forgot_mdp`, `/api/reset_mdp`, `/api/refresh-token`, `/api/remember-me`
   - **Middleware** : Le projet utilise des middlewares JWT pour la gestion des sessions utilisateurs, avec la possibilité de vérifier un `refreshToken` pour rafraîchir le token d'accès expiré.
   
### 2. **Gestion des VMs**
   - **Routes disponibles** : `/api/vm/create`, `/api/vm/delete`, `/api/vm/download-vpn`, `/api/vm/windows-password`
   - **Terraform et Ansible** : Le projet intègre des scripts Terraform et Ansible pour la gestion des infrastructures et la création de VMs. 

### 3. **Sécurisation**
   - **JWT** : Utilisation de JWT pour l'authentification des utilisateurs. Le token d'accès est stocké dans `localStorage` et peut être rafraîchi à l'aide d'un `refreshToken`.
   - **CORS** : Le projet gère les appels cross-origin avec des configurations CORS définies dans le fichier `index.js`.

### 4. **Envoi de mails**
   - **Gmail service** : Le projet inclut un service d'envoi de mails via Gmail pour des fonctionnalités telles que la réinitialisation de mot de passe.

## Fonctionnalités supplémentaires

- **Routage sécurisé** : Le middleware d'authentification protège certaines routes afin qu'elles ne soient accessibles que par des utilisateurs authentifiés.
- **Gestion de l'infrastructure avec Terraform et Ansible** : Utilisation d'Ansible pour installer des logiciels et de Terraform pour gérer les machines virtuelles.
  
## Test et Débogage

1. **Exécution en mode développement** : 
   - Définissez votre environnement comme "development" dans le fichier `.env` et lancez le serveur en mode débogage.
2. **Logs** : Le serveur journalise toutes les erreurs et les requêtes dans la console. Vérifiez les logs pour obtenir des informations détaillées sur les erreurs.

## Scripts disponibles

- **`npm start`** : Démarre le serveur en mode production.
- **`npm run dev`** : Démarre le serveur en mode développement (avec `nodemon` pour un rechargement automatique).

## Contributions

Les contributions au projet sont les bienvenues. Veuillez créer une branche pour toute nouvelle fonctionnalité ou correction de bug et soumettre une demande de fusion.