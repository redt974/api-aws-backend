const crypto = require('crypto');

// Fonction pour générer un hash SHA-256
function hashEmail(email) {
  return crypto.createHash('sha256').update(email).digest('hex');
}

// Fonction pour vérifier si un email correspond à celui du propriétaire
function isOwnerEmail(email) {
  const hashedEmail = hashEmail(email);
  return hashedEmail === process.env.OWNER_EMAIL;
}

module.exports = {
  hashEmail,
  isOwnerEmail
};