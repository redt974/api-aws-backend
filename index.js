const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');
const cors = require("cors");
const dotenv = require("dotenv");
const { exec } = require("child_process");
const http = require("http");
const { Server } = require("socket.io");
const pool = require("./config/db");

// Middleware d'authentification JWT
const authMiddleware = require('./auth/middleware');

// Initialisation de l'application
dotenv.config();
const app = express();
const port = process.env.PORT || 3000;


// socket.io
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Autorise toutes les origines, à restreindre en prod
        methods: ["GET", "POST"]
    }
});

io.on("connection", (socket) => {
    console.log("Nouvelle connexion WebSocket :", socket.id);

    socket.on("disconnect", () => {
        console.log("Utilisateur déconnecté :", socket.id);
    });
});

module.exports = { app, server, io };

server.listen("3002", () => {
    console.log(`Serveur socket.io lancé sur le port 3002`);
});


// Middlewares globaux
app.use(bodyParser.json());
app.use(cookieParser());

// const corsOptions = {
//     origin: 'http://localhost:3000',  // FRONTEND
//     credentials: true,                // Permet l'envoi des cookies (ou autres informations d'authentification)
//     methods: ['GET', 'POST', 'PUT', 'DELETE'],  // Méthodes HTTP autorisées
// };

// app.use(cors(corsOptions));  // Applique la configuration CORS avec les options définies

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");  // Autorise toutes les origines
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") {
        return res.sendStatus(200);  // Répondre aux requêtes préflight directement
    }
    next();
});


// Routes de gestion pour l'authentification
const inscriptionRoute = require('./auth/inscription');
const connexionRoute = require('./auth/connexion');
const deconnexionRoute = require('./auth/deconnexion');

const motDePasseOublieRoute = require('./auth/motdepasse_oublie');
const reinitialisationRoute = require('./auth/reinitialisation');

const refreshtokenRoute = require('./auth/refresh_token');
const rememberMeRoute = require('./auth/rememberme');

// Sign In Google
const google_authRouter = require('./services/google/oauth');
const google_requestRouter = require('./services/google/request');

// Routes de gestion des VMs
const getVmRoute = require("./vm/get-vm");
const createVmRoute = require("./vm/create-vm");
const windowspasswordRoute = require("./vm/windows-password");
const downloadSSHRoute = require("./vm/download-ssh");
// const downloadVPNRoute = require("./vm/download-vpn");
const deleteVmRoute = require("./vm/delete-vm");

// Routes pour l'authentification
app.use('/api/signup', inscriptionRoute);
app.use('/api/signin', connexionRoute);
app.use('/api/logout', authMiddleware, deconnexionRoute);

app.use('/api/forgot_mdp', motDePasseOublieRoute);
app.use('/api/reset_mdp', reinitialisationRoute);

app.use('/api/remember-me', rememberMeRoute);
app.use('/api/refresh-token', refreshtokenRoute);

// Routes pour l'authentification avec Google
app.use('/google/oauth', google_authRouter);
app.use('/google/request', google_requestRouter); 

// Routes pour les VMs
app.use("/api/vm", authMiddleware, getVmRoute);
app.use("/api/vm", authMiddleware, createVmRoute);
app.use("/api/vm", authMiddleware, windowspasswordRoute);
app.use("/api/vm", authMiddleware, downloadSSHRoute);
// app.use("/api/vm", authMiddleware, downloadVPNRoute);
app.use("/api/vm", authMiddleware, deleteVmRoute);

app.get("/", (req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("API AWS\n");
});

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