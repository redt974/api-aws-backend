const fs = require("fs");
const path = require("path");
const { copyFileSync } = require("fs");

async function generateVPNConfig(vmIp, userEmail, vmDirectory, certsDir) {
  // Chemin pour le fichier .ovpn du client
  const vpnConfigPath = path.join(vmDirectory, `${userEmail}-vm-${instance_id}-config.ovpn`);

  // Contenu du fichier de configuration OpenVPN pour le client
  const vpnConfigContent = `
client
dev tun
proto udp
remote ${vmIp} 1194
resolv-retry infinite
nobind
persist-key
persist-tun
ca ca.crt
cert client.crt
key client.key
tls-auth ta.key 1
cipher AES-256-CBC
auth SHA256
compress lz4-v2
verb 3
  `;

  // Écrire le fichier de configuration .ovpn
  fs.writeFileSync(vpnConfigPath, vpnConfigContent);

  // Copier les certificats et clés nécessaires dans le répertoire du client
  const certs = ['ca.crt', 'client.crt', 'client.key', 'ta.key'];

  certs.forEach(cert => {
    const sourceCertPath = path.join(certsDir, cert);
    const destCertPath = path.join(vmDirectory, cert);
    if (fs.existsSync(sourceCertPath)) {
      copyFileSync(sourceCertPath, destCertPath);
    } else {
      console.error(`Certificat ou clé manquant : ${sourceCertPath}`);
    }
  });

  return vpnConfigPath;
}

module.exports = { generateVPNConfig };
