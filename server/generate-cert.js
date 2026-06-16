const fs = require('fs');
const path = require('path');
const selfsigned = require('selfsigned');
const os = require('os');

const certDir = path.join(__dirname, 'certs');

// Create certs directory if it doesn't exist
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
}

const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');

// Check if certificates already exist
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log('✓ SSL certificates already exist');
  process.exit(0);
}

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const localIP = getLocalIP();

console.log('Generating self-signed SSL certificates...');
console.log(`  For: localhost, 127.0.0.1, ${localIP}`);

try {
  // Generate self-signed certificate with SubjectAltName
  const attrs = [{ name: 'commonName', value: 'localhost' }];
  const pems = selfsigned.generate(attrs, {
    days: 365,
    algorithm: 'sha256',
    keySize: 2048,
    extensions: [
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' },
          { type: 2, value: '127.0.0.1' },
          { type: 7, ip: '127.0.0.1' },
          { type: 2, value: localIP },
          { type: 7, ip: localIP }
        ]
      }
    ]
  });

  // Write certificate and key to files
  fs.writeFileSync(certPath, pems.cert);
  fs.writeFileSync(keyPath, pems.private);

  console.log('✓ SSL certificates generated successfully');
  console.log(`  Key:  ${keyPath}`);
  console.log(`  Cert: ${certPath}`);
  process.exit(0);
} catch (error) {
  console.error('✗ Failed to generate certificates:', error.message);
  process.exit(1);
}

