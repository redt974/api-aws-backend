const express = require("express");
const router = express.Router();
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs/promises");
const pool = require("../config/db");

router.post("/delete", async (req, res) => {
  const { vm_id } = req.body;

  try {
    // Récupérer les détails de la VM depuis la base de données
    const vmQuery = await pool.query("SELECT * FROM vms WHERE id = $1", [vm_id]);
    if (vmQuery.rowCount === 0) {
      return res.status(404).json({ message: "VM non trouvée." });
    }

    const vm = vmQuery.rows[0];

    // Vérification que l'utilisateur est bien le propriétaire de la VM
    if (vm.user_id !== req.user.id) {
      return res.status(403).json({ message: "Accès refusé : cette VM ne vous appartient pas." });
    }

    const userDir = path.join(__dirname, "../terraform", vm.name); // Dossier Terraform basé sur le nom

    // Exécution de la commande Terraform pour supprimer la VM
    exec(`cd ${userDir} && terraform destroy -auto-approve`, async (err, stdout, stderr) => {
      if (err) {
        console.error(`Erreur Terraform : ${stderr}`);
        return res.status(500).json({ message: "Erreur lors de la suppression de la VM sur AWS." });
      }

      try {
        // Supprimer le dossier utilisateur
        await fs.rm(userDir, { recursive: true, force: true });

        // Supprimer l'entrée dans la base de données
        await pool.query("DELETE FROM vms WHERE id = $1", [vm_id]);
        res.json({ message: "VM supprimée avec succès." });
      } catch (fsErr) {
        console.error("Erreur lors de la suppression du dossier :", fsErr);
        res.status(500).json({ message: "Erreur lors de la suppression du dossier local." });
      }
    });
  } catch (dbErr) {
    console.error("Erreur lors de la suppression de la VM :", dbErr.message);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

module.exports = router;
