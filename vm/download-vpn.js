const express = require("express");
const router = express.Router();
const fs = require("fs");
const pool = require("../config/db");

// Route pour télécharger un fichier VPN
router.get("/download-vpn/:userId/:vmId", async (req, res) => {
  const { userId, vmId } = req.params;

  if (parseInt(userId) !== req.userId) {
    return res.status(403).send("Accès interdit.");
  }

  try {
    const result = await pool.query(
      "SELECT vpn_config FROM vms WHERE id = $1 AND user_id = $2",
      [vmId, userId]
    );

    if (result.rows.length === 0 || !result.rows[0].vpn_config) {
      return res.status(404).send("Fichier VPN non trouvé.");
    }

    const vpnConfigPath = result.rows[0].vpn_config;
    if (!fs.existsSync(vpnConfigPath)) {
      return res.status(404).send("Le fichier de configuration VPN n'existe pas.");
    }

    res.download(vpnConfigPath); // Téléchargement du fichier
  } catch (err) {
    console.error("Erreur lors du téléchargement du fichier VPN :", err);
    res.status(500).send("Erreur serveur.");
  }
});

module.exports = router;
