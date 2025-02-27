const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');

// Middleware pour gérer CORS
router.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", `http://${process.env.FRONT_URL}`);
  res.header("Access-Control-Allow-Credentials", 'true');
  res.header("Referrer-Policy", "no-referrer-when-downgrade");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Route pour gérer l'authentification Google OAuth
router.post('/', async function(req, res) {
  const redirectURL = `http://${process.env.BACK_URL}/google/oauth`;

  const oAuth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectURL
  );

  try {
    // Générer l'URL d'autorisation pour le dialogue de consentement
    const authorizeUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email', 'openid'],
      prompt: 'consent'
    });
   
    res.json({ url: authorizeUrl });
  } catch (error) {
    console.error('Erreur lors de la génération de l\'URL d\'autorisation:', error);
    res.status(500).json({ error: 'Erreur lors de la génération de l\'URL d\'autorisation' });
  }
});

module.exports = router;
