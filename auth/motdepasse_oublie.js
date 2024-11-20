const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');
const { sendEmail } = require('../services/gmail');
const { validerEmail } = require('./validation');

// Fonction pour supprimer les demandes expirées
async function supprimerExpirees() {
  const now = Date.now();
  await db.query('DELETE FROM reset_tokens WHERE expires < ?', [now]);
}

router.post('/', async (req, res) => {
  const { email } = req.body;

  const validation = validerEmail(email);
  if (!validation.valid) {
    return res.status(400).json({ message: validation.message });
  }

  try {
    // Supprimer les anciennes demandes expirées
    await supprimerExpirees();

    // Vérifier si l'utilisateur existe dans la table utilisateurs
    const [users] = await db.query('SELECT id FROM utilisateurs WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(400).json({ message: "L'utilisateur avec cet email n'existe pas." });
    }

    const userId = users[0].id;

    // Générer un token de réinitialisation
    const token = crypto.randomBytes(20).toString('hex');
    const expires = Date.now() + 3600000; // 1 heure à partir de maintenant

    // Insérer le token dans la table reset_tokens
    await db.query('INSERT INTO reset_tokens (utilisateur_id, token, expires) VALUES (?, ?, ?)', [userId, token, expires]);

    // Envoyer l'e-mail de réinitialisation en utilisant le service email
    await sendEmail({
      to: email,
      subject: 'Réinitialisation de votre mot de passe',
      templateName: 'reset_mail',
      variables: {
        reinitialisationLien: `https://${process.env.FRONT_URL}/reinitialisation?token=${token}`
      }
      
    });

    res.status(200).json({ message: 'E-mail de réinitialisation envoyé avec succès.' });
  } catch (err) {
    console.error('Erreur lors de la demande de réinitialisation:', err);
    res.status(500).json({ message: "Une erreur s'est produite lors de la demande de réinitialisation du mot de passe." });
  }
});

module.exports = router;
