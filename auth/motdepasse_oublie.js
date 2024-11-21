const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db'); // Pool PostgreSQL
const { sendEmail } = require('../services/gmail');
const { validerEmail } = require('./validation');

router.post('/', async (req, res) => {
  const { email } = req.body;

  // Validation de l'email
  const validation = validerEmail(email);
  if (!validation.valid) {
    return res.status(400).json({ message: validation.message });
  }

  try {
    // Vérifier si l'utilisateur existe dans la table utilisateurs
    const { rows: users } = await db.query('SELECT id FROM utilisateurs WHERE email = $1', [email]);

    if (users.length === 0) {
      return res.status(400).json({ message: "L'utilisateur avec cet email n'existe pas." });
    }

    const userId = users[0].id;
    const token = crypto.randomBytes(20).toString('hex');
    const expires = Math.floor(Date.now() / 1000) + 3600; // 1 heure en secondes

    // Insérer le token dans la table reset_tokens
    await db.query(
      'INSERT INTO reset_tokens (utilisateur_id, token, expires) VALUES ($1, $2, $3)',
      [userId, token, expires]
    );

    // Envoyer l'e-mail de réinitialisation en utilisant le service email
    await sendEmail({
      to: email,
      subject: 'Réinitialisation de votre mot de passe',
      templateName: 'forgot_mdp',
      variables: {
        reinitialisationLien: `http://${process.env.FRONT_URL}/reset_mdp?token=${token}`,
      },
    });

    res.status(200).json({ message: 'E-mail de réinitialisation envoyé avec succès.' });
  } catch (err) {
    console.error('Erreur lors de la demande de réinitialisation:', err);
    res.status(500).json({
      message:
        "Une erreur s'est produite lors de la demande de réinitialisation du mot de passe.",
    });
  }
});

module.exports = router;
