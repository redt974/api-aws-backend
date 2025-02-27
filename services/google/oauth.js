const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const db = require('../../config/db');
const jwt = require('jsonwebtoken');
const { isOwnerEmail } = require('../../auth/isAdmin');

const secretKey = process.env.JWT_SECRET;

// Fonction pour récupérer les données utilisateur via le token Google
async function getUserData(access_token) {
  try {
    const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch user data: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error;
  }
}

// Route principale pour l'authentification via Google OAuth
router.get('/', async function (req, res) {
  const code = req.query.code;
  const error = req.query.error;

  // Gestion du refus d'accès
  if (error === 'access_denied') {
    return res.status(403).send(`
      <html>
        <body>
          <h1>Accès refusé</h1>
          <p>Vous avez refusé l'accès à votre compte Google. Veuillez réessayer.</p>
          <script>
            setTimeout(() => {
              window.location.href = 'http://${process.env.FRONT_URL}';
            }, 5000);
          </script>
        </body>
      </html>
    `);
  }

  try {
    const redirectURL = `http://${process.env.BACK_URL}/google/oauth`;
    const oAuth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectURL
    );

    // Obtenir le token d'accès Google à partir du code d'autorisation
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    // Récupérer les données utilisateur
    const userData = await getUserData(tokens.access_token);

    // Vérifiez que l'email est présent
    if (!userData.email) {
      throw new Error('Email not found in user data');
    }

    // Vérifier si l'utilisateur existe déjà dans la base de données
    const result = await db.query('SELECT id FROM utilisateurs WHERE email = $1', [userData.email]);

    if (result.rows.length === 0) {
      // Si l'utilisateur n'existe pas, affichez une page et redirigez après 5 secondes vers la page d'inscription
      return res.status(401).send(`
    <html>
      <body>
        <h1>Utilisateur non trouvé</h1>
        <p>Vous devez vous inscrire pour accéder à ce service.</p>
        <script>
          setTimeout(() => {
            window.location.href = 'http://${process.env.FRONT_URL}/inscription';
          }, 5000);
        </script>
      </body>
    </html>
  `);
    }

    // Récupérer l'ID de l'utilisateur
    const id = result.rows[0].id;

    // Vérifiez si l'email est celui du propriétaire et attribuez un rôle admin
    const isAdmin = isOwnerEmail(userData.email);

    // Générer un token JWT pour authentifier l'utilisateur
    const token = jwt.sign({ id, isAdmin }, secretKey, { expiresIn: '30m' });

    // Rediriger vers le frontend avec le token JWT
    res.redirect(303, `http://${process.env.FRONT_URL}/auth/google/redirect?token=${token}`);

  } catch (err) {
    console.error('Error during OAuth2 process:', err);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
