const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { getUserIdFromToken, getUserEmail } = require("../auth/user");

router.get("/get-vm", async (req, res) => {
    // Vérification du token d'accès
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(400).json({ message: "Token d'accès manquant." });

    const user_id = getUserIdFromToken(token);
    if (!user_id) return res.status(401).json({ message: "Token invalide ou expiré." });

    const user_email = await getUserEmail(user_id);
    if (!user_email) return res.status(404).json({ message: "Utilisateur non trouvé." });

    try {
        // Requête pour récupérer les VMs de l'utilisateur
        const result = await pool.query(
            `SELECT id, os, software, public_ip, private_key, vpn_config, name, instance_id, created_at, expires_at 
            FROM vms WHERE user_id = $1`, 
            [user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Aucune VM trouvée pour cet utilisateur." });
        }

        // Formatage des données pour chaque VM
        const vmList = result.rows.map((vm) => ({
            vm_id: vm.id,
            user_id: user_id,
            user_email: user_email,
            instance_id: vm.instance_id,
            ip: vm.public_ip,
            ssh_private_key: vm.private_key
        }));

        // Réponse JSON avec les VMs formatées
        res.status(200).json({ vmList: vmList });
    } catch (error) {
        console.error("Erreur lors de la récupération des VMs :", error);
        res.status(500).json({ message: "Erreur interne du serveur." });
    }
});

module.exports = router;
