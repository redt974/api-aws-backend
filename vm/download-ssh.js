const express = require("express");
const router = express.Router();
const fs = require("fs");
const pool = require("../config/db");
const { getUserIdFromToken } = require("../auth/user");

// Route pour télécharger un fichier SSH
router.get("/download-ssh/:user_id/:vm_id", async (req, res) => {
  const { user_id, vm_id } = req.params;

  if (user_id != req.user.id) {
    return res.status(404).json({ message: "Accès Interdit !" });
  }

  try {
    const result = await pool.query("SELECT private_key FROM vms WHERE id = $1 AND user_id = $2", [vm_id, user_id]);

    if (result.rows.length === 0 || !result.rows[0].private_key) {
      return res.status(404).json({ message: "Fichier SSH non trouvé." });
    }

    const SSHConfigPath = result.rows[0].private_key;

    // Vérification de l'existence du fichier SSH de manière asynchrone
    try {
      await fs.promises.access(SSHConfigPath, fs.constants.F_OK);  // Vérification de l'accès au fichier
    } catch (err) {
      return res.status(202).json({ message: "Le fichier de configuration SSH n'existe pas ou a été supprimé." });
    }

    // Envoi du fichier SSH au client
    res.setHeader('Content-Type', 'application/octet-stream');
    res.download(SSHConfigPath);
  } catch (err) {
    console.error("Erreur lors du téléchargement du fichier SSH :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = router;
