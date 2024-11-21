const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET;

const generateToken = (user) => {
  return jwt.sign({ email: user.email, id: user.id }, secret, { expiresIn: '30m' });
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token manquant. Veuillez vous connecter.' });
  }

  jwt.verify(token, secret, (err, user) => {
    if (err) {
      // Vérification si le token a expiré ou s'il est invalide
      return res.status(403).json({ message: 'Token invalide ou expiré. Veuillez vous reconnecter.' });
    }

    req.user = user;  // Attacher l'utilisateur à la requête
    next();  // Passer au middleware suivant
  });
};

module.exports = { generateToken, authenticateToken };
