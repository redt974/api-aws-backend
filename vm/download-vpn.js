const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const pool = require("../config/db");

// Endpoint pour télécharger le fichier VPN
router.get("/download-vpn/:user_id/:vm_id", async (req, res) => {

    const { user_id, vm_id } = req.params;
    if (user_id != req.user.id) {
        return res.status(404).json({ message: "Accès Interdit !" });
    }

    try {

        // Vérifier si la VM appartient bien à l'utilisateur
        const result = await pool.query(
            "SELECT public_ip, name FROM vms WHERE id = $1 AND user_id = $2 AND expires_at > NOW() LIMIT 1",
            [vm_id, user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Aucune VM active trouvée pour cet utilisateur." });
        }

        const { name } = result.rows[0];

        // Construire le chemin du fichier VPN
        const vpnConfigPath = path.join(__dirname, `../vpn/${name}.ovpn`);

        if (!fs.existsSync(vpnConfigPath)) {
            return res.status(404).json({ message: "Fichier VPN introuvable." });
        }

        // Envoyer le fichier en téléchargement
        res.download(vpnConfigPath, `${name}.ovpn`);
    } catch (err) {
        console.error("Erreur lors du téléchargement du VPN :", err.message);
        res.status(500).json({ message: "Erreur interne du serveur." });
    }
});

module.exports = router;
