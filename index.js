const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const { exec } = require("child_process");
const pool = require("./config/db"); 

// Middleware d'authentification JWT
const authMiddleware = require('./auth/middleware');

// Initialisation de l'application
dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

// Middlewares globaux
app.use(bodyParser.json());

const corsOptions = {
    origin: 'http://localhost:3000',  // Remplacez par l'URL de votre frontend (port du frontend React par exemple)
    credentials: true,                // Permet l'envoi des cookies (ou autres informations d'authentification)
    methods: ['GET', 'POST', 'PUT', 'DELETE'],  // Méthodes HTTP autorisées
};

app.use(cors(corsOptions));  // Applique la configuration CORS avec les options définies


// Routes de gestion pour l'authentification
const inscriptionRoute = require('./auth/inscription');
const connexionRoute = require('./auth/connexion');
const deconnexionRoute = require('./auth/deconnexion');

const motDePasseOublieRoute = require('./auth/motdepasse_oublie');
const reinitialisationRoute = require('./auth/reinitialisation');

const refreshtokenRoute = require('./auth/refresh_token');
const rememberMeRoute = require('./auth/rememberme');

// Routes de gestion des VMs
const createVmRoute = require("./vm/create-vm");
const deleteVmRoute = require("./vm/delete-vm");


// Routes pour l'authentification
app.use('/api/signup', inscriptionRoute);
app.use('/api/signin', connexionRoute);
app.use('/api/logout', authMiddleware, deconnexionRoute);

app.use('/api/forgot_mdp', motDePasseOublieRoute);
app.use('/api/reset_mdp', reinitialisationRoute);

app.use('/api/remember-me', rememberMeRoute);
app.use('/api/refresh-token', refreshtokenRoute);

// Routes pour les VMs
app.use("/api/vm", authMiddleware, createVmRoute);
app.use("/api/vm", authMiddleware, deleteVmRoute);

// Supprimer une VM automatiquement après expiration
async function cleanupExpiredVMs() {
    try {
        const result = await pool.query("SELECT id FROM vms WHERE expires_at < NOW()");
        const expiredVMs = result.rows;

        for (const vm of expiredVMs) {
            exec("cd terraform && terraform destroy -auto-approve", (err) => {
                if (err) console.error(`Erreur lors du nettoyage de la VM ${vm.id}: ${err.message}`);
            });

            await pool.query("DELETE FROM vms WHERE id = $1", [vm.id]);
        }
    } catch (err) {
        console.error("Erreur lors du nettoyage des VMs expirées :", err.message);
    }
}

// Lancement du serveur
app.listen(port, () => {
  console.log(`Serveur lancé sur le port ${port}`);
  setInterval(cleanupExpiredVMs, 60 * 60 * 1000); // Vérifie les VM expirées toutes les heures
});