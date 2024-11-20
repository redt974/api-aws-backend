# Backend - Application "Je suis l'Autre"

Ce projet est le backend de l'application "Je suis l'Autre". Il est construit avec Node.js et Express et utilise MySQL pour la base de données.

## Prérequis

- Node.js (version 14 ou supérieure)
- MySQL
- npm (ou yarn)

## Installation

1. Clonez le dépôt :

```bash
git clone https://github.com/redt974/Je-suis-l-Autre-backend.git backend
cd backend
```

2. Installez les dépendances :

```bash
npm install
```

3. Renommer le fichier `.env-default` en fichier `.env` à la racine du projet et en y ajoutant les informations nécessaires.


4. Démarrez le serveur :

```bash
npm start
```

## Routes disponibles :

### Routes pour l'authentification

- `POST /demandes` : Demandes d'inscription.
- `POST /inscription` : Inscription d'un nouvel utilisateur.
- `POST /connexion` : Connexion d'un utilisateur.
- `GET /deconnexion` : Déconnexion de l'utilisateur.
- `POST /motdepasse_oublie` : Demande de réinitialisation de mot de passe.
- `POST /reinitialisation` : Réinitialisation du mot de passe.

### Routes pour l'authentification avec Google

- `POST /google/request`: Initialisation de la demande de connexion à l'API de Google
- `POST /google/oauth`: Récupération des informations permettant l'authentification

### Routes pour la reconnexion, maintien de la connexion

- `POST /remember-me`: Demande de token Remember Me.
- `POST /refresh-token`: Demande de token Refresh Token.
- `GET /verify`: Vérification de la  sur un autre navigateur ou ordinateur.

### Routes protégées par l'authentification

- `GET /user`: Pour avoir les informations sur les utilisateurs.

### Routes pour l'administration

- `GET /admin/utilisateurs`: Pour avoir les informations sur tous les utilisateurs.
- `GET /admin/excel`: Téléchargement des informations sous forme de Tableau Excel.
- `POST /admin/newsletter`: Création de mail pour la newsletter.

### Routes pour l'adhésion

- `POST /adhesion`: Inscription des adhérents 

### Routes pour le paiement

#### PayPal :

- `POST /paypal/orders`: Initialisation de la commande à l'API de PayPal
- `POST /paypal/orders/:orderId/capture`: Récupération des informations du paiement effectué

#### Hello Asso :

- `POST /helloasso/checkout-intent`: Initialisation de la commande à l'API de Hello Asso
- `POST /helloasso/checkout-intent/:checkoutIntentId`: Récupération des informations du paiement effectué 

### Route pour la newsletter

- `POST /abonnement`: Demande d'abonnement à la newsletter
- `POST /desabonnement`: Demande d'désabonnement à la newsletter

### Autres Routes :

- `POST /contact`: Contact par mail

## Services

- [MySQL](https://www.mysql.com/fr/)
- [Gmail](https://www.google.com/intl/fr/gmail/about/)
- [Captcha](https://www.google.com/recaptcha/about/)
- [Google OAuth API](https://developers.google.com/identity/protocols/oauth2?hl=fr) :
    - API : https://www.googleapis.com/oauth2/
- [PayPal API](https://developer.paypal.com/dashboard/) :
    - Sandbox: https://api-m.sandbox.paypal.com
    - Live: https://api-m.paypal.com
- [Hello Asso API](https://dev.helloasso.com/) :
    - Sandbox : https://www.helloasso-sandbox.com/
    - Live : https://api.helloasso.com

## Sécurité

- Assurez-vous de configurer correctement les variables d'environnement.
- Utilisez les certificats HTTPS pour sécuriser les communications entre le client et le serveur.