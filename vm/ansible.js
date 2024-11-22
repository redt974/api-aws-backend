const { exec } = require('child_process');
const fs = require('fs');

const runAnsiblePlaybook = (inventoryPath, software, extensions, ovpnConfigSrc, userEmail, userName, userPassword) => {
  return new Promise((resolve, reject) => {
    const ansibleCommand = `
      ansible-playbook configure_vm.yml \
      -i ${inventoryPath} \
      --extra-vars 'software_list=${JSON.stringify(software)} vscode_extensions=${JSON.stringify(extensions)} ovpn_server_config_src=${ovpnConfigSrc} user_email=${userEmail} user_name=${userName} user_password=${userPassword}'
    `;

    exec(ansibleCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`Erreur lors de l'exécution du playbook : ${error.message}`);
        reject(stderr);
      }
      console.log(`Ansible stdout : ${stdout}`);
      resolve(stdout);
    });
  });
};

const generateAnsibleInventory = (vm, filePath) => {
  const inventoryContent = `
  [all]
  ${vm.public_ip} ansible_user=ubuntu ansible_ssh_private_key_file=${vm.ssh_private_key_path}
  `;

  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, inventoryContent, (err) => {
      if (err) reject(err);
      resolve();
    });
  });
};

module.exports = {
  runAnsiblePlaybook,
  generateAnsibleInventory
};
