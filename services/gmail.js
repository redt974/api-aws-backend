const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Configurer le transporteur d'e-mails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD
  }
});

// Fonction pour lire et remplir les templates d'e-mails
const readEmailTemplate = (templateName, variables) => {
  const filePath = path.join(__dirname, '..', 'templates', `${templateName}.html`);
  let template = fs.readFileSync(filePath, 'utf8');

  for (const key in variables) {
    template = template.replace(new RegExp(`{{${key}}}`, 'g'), variables[key]);
  }

  return template;
};

// Fonction pour envoyer un e-mail
const sendEmail = async ({ to, subject, templateName, variables = {} }) => {
  const html = readEmailTemplate(templateName, variables);

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to,
    subject,
    html
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendEmail
};
