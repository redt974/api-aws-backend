const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../config/db');

const secretKey = process.env.JWT_SECRET;
const refreshSecretKey = process.env.REFRESH_JWT_SECRET;

router.post('/', async (req, res) => {
  const { rememberMeToken } = req.cookies;

  if (!rememberMeToken) {
    return res.status(400).json({ message: 'Token Remember Me manquant.' });
  }

  try {
    // Décodage et validation du token JWT
    const decoded = jwt.verify(rememberMeToken, refreshSecretKey);
    const { id } = decoded;

    // Récupérer le hash du token et la date d'expiration en base
    const [users] = await db.query(
      'SELECT remember_me_token, remember_me_expiration FROM utilisateurs WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(403).json({ message: 'Utilisateur non trouvé.' });
    }

    const user = users[0];

    // Vérifier l'expiration du token
    if (new Date() > new Date(user.remember_me_expiration)) {
      return res.status(403).json({ message: 'Token Remember Me expiré.' });
    }

    // Comparer le token avec le hash en base
    const isValidToken = await bcrypt.compare(rememberMeToken, user.remember_me_token);
    if (!isValidToken) {
      return res.status(403).json({ message: 'Token Remember Me invalide.' });
    }

    // Générer un nouveau token d'accès
    const accessToken = jwt.sign({ id }, secretKey, { expiresIn: '30m' });

    // Générer un nouveau token Remember Me
    const newRememberMeToken = jwt.sign({ id }, refreshSecretKey, { expiresIn: '7d' });
    const newTokenHash = await bcrypt.hash(newRememberMeToken, 10);

    // Mettre à jour le token Remember Me en base
    const expirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours
    await db.query(
      'UPDATE utilisateurs SET remember_me_token = ?, remember_me_expiration = ? WHERE id = ?',
      [newTokenHash, expirationDate, id]
    );

    // Envoyer le nouveau cookie Remember Me
    res.cookie('rememberMeToken', newRememberMeToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
    });

    // Répondre avec le nouveau token d'accès
    return res.status(200).json({ token: accessToken });
  } catch (error) {
    console.error('Erreur lors de la vérification du token Remember Me:', error);
    return res.status(403).json({ message: 'Token Remember Me invalide ou expiré.' });
  }
});

module.exports = router;
