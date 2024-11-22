const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../config/db'); // Si vous gérez les tokens en base de données

const secretKey = process.env.JWT_SECRET;
const refreshSecretKey = process.env.REFRESH_JWT_SECRET;

// Route pour rafraîchir le token d'accès
router.post('/', async (req, res) => {
  const refreshToken = req.cookies?.refreshToken; // Récupérer le refresh token à partir du cookie

  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token manquant.' });
  }

  try {

    // Vérifier le refresh token avec jwt
    jwt.verify(refreshToken, refreshSecretKey, async (err, decoded) => {
      if (err) {
        console.error('Refresh token invalide:', err);
        return res.status(403).json({ message: 'Refresh token invalide.' });
      }

      const { userId } = decoded;

      // Générer un nouveau token d'accès
      const newToken = jwt.sign({ userId }, secretKey, { expiresIn: '30m' });

      // Générer un nouveau refresh token
      const newRefreshToken = jwt.sign({ userId }, refreshSecretKey, { expiresIn: '7d' });

      // Envoyer le nouveau refresh token dans un cookie HttpOnly
      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({ token: newToken });
    });
  } catch (err) {
    console.error('Erreur lors du rafraîchissement du token:', err);
    return res.status(500).json({ message: "Une erreur interne s'est produite." });
  }
});

module.exports = router;
