const fetch = require('node-fetch');
require('dotenv').config();

async function verifyCaptcha(captchaValue) {
  try {
    const url = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.CAPTCHA_SECRET}&response=${captchaValue}`;
    const captchaResponse = await fetch(url, {
      method: 'POST'
    });
    const captchaData = await captchaResponse.json();
    return captchaData;
  } catch (error) {
    console.error('Erreur lors de la vérification CAPTCHA :', error);
    throw new Error('Erreur lors de la vérification CAPTCHA');
  }
}

module.exports = {
  verifyCaptcha
};