const express = require("express");
const router = express.Router();
const { exec } = require("child_process");
const pool = require("../config/db"); 

router.post("/delete", async (req, res) => {
    const { vmId } = req.body;
    try {
        const vm = await pool.query("SELECT * FROM vms WHERE id = $1", [vmId]);
        if (vm.rowCount === 0) return res.status(404).json({ message: "VM non trouvée." });

        exec("cd terraform && terraform destroy -auto-approve", async (err) => {
            if (err) {
                console.error(`Erreur Terraform : ${err.message}`);
                return res.status(500).json({ message: "Erreur lors de la suppression de la VM."});
            }

            await pool.query("DELETE FROM vms WHERE id = $1", [vmId]);
            res.json({ message: "VM supprimée avec succès." });
        });
    } catch (err) {
        console.error("Erreur lors de la suppression de la VM :", err.message);
        res.status(500).json({ message: "Erreur interne du serveur."});
    }
});

module.exports = router;
