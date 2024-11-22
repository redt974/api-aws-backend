// Fonction améliorée pour valider un email
function validerEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        return { valid: false, message: "L'email n'est pas valide." };
    }
    return { valid: true };
}

// Fonction pour valider un mot de passe
function validerPassword(motDePasse) {
    const motDePasseRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,}$/;
    if (!motDePasseRegex.test(motDePasse)) {
        return { valid: false, message: "Le mot de passe doit contenir au moins 8 caractères, une lettre majuscule, une lettre minuscule, un chiffre et un caractère spécial." };
    }
    return { valid: true };
}

// Fonction pour valider un formulaire de connexion
function validerLoginForm(formData) {
    const emailValidation = validerEmail(formData.email);
    const passwordValidation = validerPassword(formData.mot_de_passe);
    return emailValidation.valid && passwordValidation.valid
        ? { valid: true }
        : { valid: false, message: emailValidation.message || passwordValidation.message };
}

module.exports = {
    validerEmail,
    validerPassword,
    validerLoginForm
};
