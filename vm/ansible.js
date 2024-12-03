const { exec } = require('child_process');
const fs = require('fs').promises; 

const generateAnsibleInventory = (vm, filePath) => {
  // Choisir le nom d'utilisateur en fonction du système d'exploitation
  const userMapping = {
    Ubuntu: 'ubuntu',
    Debian: 'debian',
    Kali: 'kali',
    "Windows 10": 'Administrator',
    "Windows 11": 'Administrator',
  };

  const ansibleUser = userMapping[vm.os] || 'ubuntu'; // Utilise 'ubuntu' par défaut si l'OS n'est pas trouvé

  const inventoryContent = `[all]\npublic_ip=${vm.public_ip} ansible_user=${ansibleUser} ansible_ssh_private_key_file="${vm.ssh_private_key}"`;

  // Utilisation de fs.promises.writeFile pour retourner une promesse
  return fs.writeFile(filePath, inventoryContent.trim())
    .then(() => console.log('Fichier d\'inventaire créé avec succès !'))
    .catch((err) => {
      throw new Error(`Erreur lors de la création du fichier d'inventaire : ${err.message}`);
    });
};

const runAnsiblePlaybook = (inventoryPath, playbook, software, extensions, userEmail, userName, userPassword, instance_id) => {
  return new Promise((resolve, reject) => {
    // Utilisation de JSON.stringify pour échapper correctement les variables
    const extraVars = JSON.stringify({
      software_list: software,
      vscode_extensions: extensions,
      user_email: userEmail,
      user_name: userName,
      user_password: userPassword,
      instance_id: instance_id
    });

    const ansibleCommand = `
    ansible-playbook ${playbook} \
    -i ${inventoryPath} \
    --extra-vars '${extraVars.replace(/"/g, '\\"')}'  # Remplacer les guillemets simples par des doubles
  `;

    exec(ansibleCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`Erreur lors de l'exécution du playbook : ${stderr}`);
        return reject(new Error(`Erreur Ansible : ${stderr.trim()}\nSortie complète : ${stdout}`));
      }
      console.log(`Ansible stdout : ${stdout}`);
      resolve(stdout);
    });
  });
};

module.exports = {
  runAnsiblePlaybook,
  generateAnsibleInventory
};
