const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  // Vérifier si une session existe
  if (req.session && req.session.email) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Erreur lors de la déconnexion:', err);
        return res.status(500).json({ message: 'Une erreur est survenue lors de la déconnexion.' });
      }

      // Supprimer le cookie de session en toute sécurité
      res.clearCookie('connect.sid', { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

      console.log(`Utilisateur déconnecté : ${req.session.email}`); // Ajouter un log pour la déconnexion
      return res.status(200).json({ message: 'Déconnexion réussie.' });
    });
  } else {
    // Si aucune session n'existe, renvoyer une réponse 200 avec un message
    return res.status(200).json({ message: 'Aucune session active à déconnecter.' });
  }
});

module.exports = router;
