const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const secretKey = process.env.JWT_SECRET;
const refreshSecretKey = process.env.REFRESH_JWT_SECRET;

router.post('/', async (req, res) => {
  const { rememberMeToken } = req.cookies;

  if (!rememberMeToken) {
    return res.status(400).json({ message: 'Token Remember Me manquant.' });
  }

  try {
    // Vérification du token Remember Me
    const decoded = jwt.verify(rememberMeToken, refreshSecretKey);
    const { userId, isAdmin } = decoded;

    // Vérifier si le token Remember Me est valide en base de données
    const [user] = await db.query('SELECT id FROM utilisateurs WHERE remember_me_token = ?', [rememberMeToken]);

    if (user.length === 0) {
      return res.status(403).json({ message: 'Token Remember Me invalide.' });
    }

    // Génération d'un nouveau token d'accès
    const accessToken = jwt.sign({ userId, isAdmin }, secretKey, { expiresIn: '30m' });

    // Répondre avec le nouveau token d'accès
    return res.status(200).json({ token: accessToken });
  } catch (error) {
    console.error('Erreur lors de la vérification du token Remember Me:', error);
    return res.status(403).json({ message: 'Token Remember Me invalide ou expiré.' });
  }
});

module.exports = router;
