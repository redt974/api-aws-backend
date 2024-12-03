const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const secretKey = process.env.JWT_SECRET;
const refreshSecretKey = process.env.REFRESH_JWT_SECRET;

// Route pour rafraîchir le token d'accès
router.post('/', (req, res) => {
  const refreshToken = req.cookies.refreshToken; // Récupérer le refresh token à partir du cookie

  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token manquant.' });
  }

  // Vérifier le refresh token
  jwt.verify(refreshToken, refreshSecretKey, (err, decoded) => {
    if (err) {
      console.error('Refresh token invalide:', err);
      return res.status(403).json({ message: 'Refresh token invalide.' });
    }

    // Générer un nouveau token d'accès
    const newToken = jwt.sign(
      { id: decoded.id },
      secretKey,
      { expiresIn: '30m' } // Token d'accès valide pendant 30 minutes
    );

    // Générer un nouveau refresh token
    const newRefreshToken = jwt.sign(
      { id: decoded.id },
      refreshSecretKey,
      { expiresIn: '7d' } // Refresh token valide pendant 7 jours
    );

    // Envoyer le nouveau refresh token dans un cookie HttpOnly
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Assure que le cookie est envoyé seulement en HTTPS en production
      sameSite: 'Strict', // Empêche l'envoi du cookie dans des requêtes cross-site
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
    });

    return res.status(200).json({ token: newToken });
  });
});

module.exports = router;
