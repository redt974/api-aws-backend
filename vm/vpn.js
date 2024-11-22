const fs = require("fs");
const path = require("path");

async function generateVPNConfig(vmIp, userEmail, vmDirectory) {
  const vpnConfigPath = path.join(vmDirectory, `${userEmail}-vpn-config.ovpn`);

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

  fs.writeFileSync(vpnConfigPath, vpnConfigContent);
  return vpnConfigPath;
}

module.exports = { generateVPNConfig };
