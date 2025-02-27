const express = require("express");
const router = express.Router();

router.post("/", (req, res) => {
    const io = req.io; // ✅ Récupération de `io` injecté dans `req`
    const socketId = req.headers["socket-id"];
    const socket = io.sockets.sockets.get(socketId);

    if (!socket) return res.status(400).json({ error: "Socket non trouvé" });

    socket.emit("progress", "Démarrage de la création de la VM...");
    setTimeout(() => socket.emit("progress", "Allocation des ressources..."), 2000);
    setTimeout(() => socket.emit("progress", "Installation de l'OS..."), 4000);
    setTimeout(() => socket.emit("progress", "Configuration terminée !"), 6000);

    res.json({ message: "Création en cours" });
});

module.exports = router;
