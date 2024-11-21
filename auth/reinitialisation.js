const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Pool PostgreSQL
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { validerPassword } = require('./validation');
const { sendEmail } = require('../services/gmail');

router.post('/', async (req, res) => {
    const { token, password } = req.body;

    // Validation du mot de passe
    const validation = validerPassword(password);
    if (!validation.valid) {
        return res.status(400).json({ message: validation.message });
    }

    try {
        const now = Math.floor(Date.now() / 1000); // Timestamp actuel en secondes

        // Supprimer les demandes expirées
        await db.query('DELETE FROM reset_tokens WHERE expires < $1', [now]);

        // Vérifier si le token est valide et non expiré
        const { rows: resetTokens } = await db.query(
            'SELECT utilisateur_id FROM reset_tokens WHERE token = $1 AND expires > $2',
            [token, now]
        );

        if (resetTokens.length === 0) {
            return res.status(400).json({ message: "Le token de réinitialisation est invalide ou expiré." });
        }

        const userId = resetTokens[0].utilisateur_id;

        // Générer un sel et hacher le nouveau mot de passe
        const sel = crypto.randomBytes(16).toString('hex');
        const motDePasseHash = await bcrypt.hash(password + sel, 10);

        // Mettre à jour le mot de passe dans la table utilisateurs
        const { rowCount } = await db.query(
            'UPDATE utilisateurs SET password = $1, sel = $2 WHERE id = $3',
            [motDePasseHash, sel, userId]
        );

        if (rowCount === 0) {
            return res.status(400).json({ message: "Aucun utilisateur correspondant trouvé." });
        }

        // Supprimer le token utilisé
        await db.query('DELETE FROM reset_tokens WHERE utilisateur_id = $1', [userId]);

        // Récupérer l'email de l'utilisateur
        const { rows: users } = await db.query('SELECT email FROM utilisateurs WHERE id = $1', [userId]);
        const email = users[0]?.email;

        if (email) {
            // Envoyer un e-mail de confirmation
            await sendEmail({
                to: email,
                subject: 'Votre mot de passe a été modifié',
                templateName: 'reset_mdp',
                variables: {
                    connexionLien: `http://${process.env.FRONT_URL}/signin`,
                },
            });
        }

        res.status(200).json({ message: "Mot de passe réinitialisé avec succès." });
    } catch (err) {
        console.error('Erreur lors de la réinitialisation du mot de passe:', err);
        res.status(500).json({ message: "Une erreur s'est produite lors de la réinitialisation du mot de passe." });
    }
});

module.exports = router;
