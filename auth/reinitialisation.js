const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { validerMotDePasse } = require('./validation');
const { sendEmail } = require('../services/gmail');

router.post('/', async (req, res) => {
  const { token, password } = req.body;

  const validation = validerMotDePasse({ password });
  if (!validation.valid) {
    return res.status(400).json({ message: validation.message });
  }

  try {
    // Vérifier si le token de réinitialisation est valide et non expiré
    const [resetTokens] = await db.query('SELECT * FROM reset_tokens WHERE token = ? AND expires > ?', [token, Date.now()]);

    if (resetTokens.length === 0) {
      return res.status(400).json({ message: "Le token de réinitialisation est invalide ou a expiré." });
    }

    // Récupérer l'ID de l'utilisateur dans la table utilisateurs à partir du token
    const resetToken = resetTokens[0];
    const userId = resetToken.utilisateur_id;

    // Générer un nouveau sel et hacher le nouveau mot de passe
    const sel = crypto.randomBytes(16).toString('hex');
    const mot_de_passe_hash = await bcrypt.hash(password + sel, 10);

    // Mettre à jour le mot de passe dans la table professionnels
    await db.query('UPDATE professionnels SET mot_de_passe = ?, sel = ? WHERE utilisateur_id = ?', [mot_de_passe_hash, sel, userId]);

    // Supprimer le token de réinitialisation utilisé de la table reset_tokens
    await db.query('DELETE FROM reset_tokens WHERE utilisateur_id = ?', [userId]);

    console.log(`Réinitialisation du mot de passe réussie pour l'utilisateur avec ID: ${userId}`);

    // Envoyer l'e-mail de confirmation de modification du mot de passe :

    // Récupération l'email de l'utilisateur pour l'envoi
    const [user] = await db.query('SELECT email FROM professionnels WHERE utilisateur_id = ?', [userId]);
    const email = user[0]?.email;

    if (email) {
      await sendEmail({
        to: email,
        subject: 'Votre mot de passe vient d\'être modifié',
        templateName: 'changed_password',
        variables: {
          connexionLien: `https://${process.env.FRONT_URL}/connexion`,
          contactLien: `https://${process.env.FRONT_URL}/contact`
        }
      });
    }

    res.status(200).json({ message: "Mot de passe réinitialisé avec succès." });
  } catch (err) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', err);
    res.status(500).json({ message: "Une erreur s'est produite lors de la réinitialisation du mot de passe." });
  }
});

module.exports = router;
