const { exec } = require('child_process');
const fs = require('fs').promises;

// Fonction pour exécuter une commande en utilisant des promesses
const execPromise = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Erreur lors de l'exécution de la commande : ${stderr || error.message}`));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
};

// Fonction pour générer l'inventaire Ansible
const generateAnsibleInventory = (vm, filePath) => {
  const inventoryContent = `[all]\n${vm.public_ip} ansible_user=${vm.ansibleUser} ansible_ssh_private_key_file="${vm.ssh_private_key}"`;

  return fs.writeFile(filePath, inventoryContent.trim())
    .then(() => console.log('Fichier d\'inventaire créé avec succès !'))
    .catch((err) => {
      throw new Error(`Erreur lors de la création du fichier d'inventaire : ${err.message}`);
    });
};

// Fonction pour exécuter le playbook Ansible
const runAnsiblePlaybook = async (inventoryPath, playbook, software, extensions, userEmail, userName, userPassword, instance_id, privateKeyPath, ansibleUser, public_ip) => {
  try {
    // Préparation des variables supplémentaires pour Ansible
    const extraVars = JSON.stringify({
      software_list: software,
      vscode_extensions: extensions,
      user_email: userEmail,
      user_name: userName,
      user_password: userPassword,
      instance_id: instance_id
    }).replace(/"/g, '\\"'); // Échappement des guillemets

    const ansibleCommand = `
      ansible-playbook "${playbook}" \
      -i "${inventoryPath}" \
      --private-key "${privateKeyPath}" \
      --extra-vars "${extraVars}" \
      -vvv
    `;

    // Exécution du playbook Ansible
    const { stdout, stderr } = await execPromise(ansibleCommand);

    if (stderr) {
      throw new Error(`Erreur lors de l'exécution du playbook Ansible : ${stderr}`);
    }

    console.log(`Sortie Ansible : ${stdout}`);
    return stdout;
  } catch (err) {
    console.error(`Erreur Ansible : ${err.message}`);
    throw new Error(`Erreur Ansible : ${err.message}`);
  }
};

module.exports = {
  runAnsiblePlaybook,
  generateAnsibleInventory,
  execPromise
};
