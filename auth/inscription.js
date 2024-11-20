const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validerLoginForm } = require('./validation');

// Clés secrètes pour les tokens JWT
const secretKey = process.env.JWT_SECRET;
const refreshSecretKey = process.env.REFRESH_JWT_SECRET;

router.post('/', async (req, res) => {
  const { nom, prenom, email, mot_de_passe, captchaValue } = req.body;

  const validation = validerLoginForm(email);
  if (!validation.valid) {
    return res.status(400).json({ message: validation.message.message });
  }

  try {
    // Vérification du CAPTCHA
    await verifyCaptcha(captchaValue);

    // Vérifier si l'email existe déjà
    const [existingUser] = await db.query('SELECT COUNT(*) AS count FROM utilisateurs WHERE email = $1', [email]);

    if (existingUser[0].count > 0) {
      return res.status(400).json({ message: "L'adresse e-mail est déjà utilisée." });
    }

    // Générer un sel aléatoire et hacher le mot de passe
    const sel = crypto.randomBytes(16).toString('hex');
    const mot_de_passe_hash = await bcrypt.hash(mot_de_passe + sel, 10);

    // Insérer l'utilisateur dans la base de données
    const [result] = await db.query('INSERT INTO utilisateurs (nom, prenom, email, password) VALUES ($1, $2, $3, $4)', [nom, prenom, email, mot_de_passe_hash]);
    const newUserId = result.insertId;

    // Générer un token JWT d'accès
    const accessToken = jwt.sign({ userId: newUserId }, secretKey, { expiresIn: '30m' });

    // Générer un token JWT de rafraîchissement
    const refreshToken = jwt.sign({ userId: newUserId }, refreshSecretKey, { expiresIn: '7d' });

    // Envoyer le refresh token dans un cookie HttpOnly
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, // Le cookie n'est pas accessible par JavaScript côté client
      secure: process.env.NODE_ENV === 'production', // Envoyer uniquement via HTTPS en production
      sameSite: 'Strict', // Prévenir les attaques CSRF
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours en millisecondes
    });

    // Envoi de l'email de vérification
    await sendEmail({
      to: email,
      subject: 'Nouvel Utilisateur',
      templateName: 'inscription',
      variables: {
        date: new Date().toLocaleString()
      }
    });

    // Réponse de succès avec le token
    return res.status(201).json({
      message: 'Inscription réussie.',
      accessToken,
    });
  } catch (err) {
    console.error('Erreur lors de l’inscription :', err);
    return res.status(500).json({ message: "Une erreur s'est produite lors de l'inscription." });
  }
});

module.exports = router;
