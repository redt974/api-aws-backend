const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function generateSSHKey(vmName, outputDir) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  const privateKeyPath = path.join(outputDir, `${vmName}-key.pem`);
  const publicKeyPath = path.join(outputDir, `${vmName}-key.pub`);

  fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });
  fs.writeFileSync(publicKeyPath, publicKey);

  return { privateKeyPath, publicKeyPath };
}

module.exports = { generateSSHKey };
