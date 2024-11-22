const express = require('express');
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Charger les variables d'environnement

const router = express.Router();

// Configure AWS SDK avec la région depuis .env
const ec2 = new AWS.EC2({
  region: process.env.AWS_REGION,
});

// Route pour récupérer les identifiants RDP
router.post('/windows-password', async (req, res) => {
  const { instanceId, privateKeyPath } = req.body;

  if (!instanceId || !privateKeyPath) {
    return res.status(400).json({ error: 'Instance ID et chemin de clé privée requis.' });
  }

  try {
    // Lire la clé privée
    const privateKey = fs.readFileSync(path.resolve(privateKeyPath), 'utf-8');

    // Récupérer le mot de passe Windows
    const params = {
      InstanceId: instanceId,
    };
    const result = await ec2.getPasswordData(params).promise();

    if (!result.PasswordData) {
      return res.status(400).json({ error: 'Mot de passe non disponible. Attendez quelques minutes.' });
    }

    // Déchiffrer le mot de passe avec la clé privée
    const crypto = require('crypto');
    const buffer = Buffer.from(result.PasswordData, 'base64');
    const decryptedPassword = crypto.privateDecrypt(privateKey, buffer).toString('utf-8');

    return res.json({
      ip: result.PublicIpAddress,
      username: 'Administrator',
      password: decryptedPassword,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du mot de passe Windows :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

module.exports = router;
