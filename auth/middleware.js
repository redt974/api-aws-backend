const jwt = require('jsonwebtoken');
const secretKey = process.env.JWT_SECRET;

const authMiddleware = (req, res, next) => {
  // Vérifier si le token est dans les en-têtes ou dans les cookies
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Erreur: Veuillez vous connecter pour accéder à cette page.' });
  }

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Le token a expiré. Veuillez vous reconnecter.' });
      }
      return res.status(403).json({ message: 'Token invalide.' });
    }

    req.user = decoded;
    next();
  });
};

module.exports = authMiddleware;
