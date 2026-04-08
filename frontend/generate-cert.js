#!/usr/bin/env node
/**
 * Generate self-signed certificate for local HTTPS development
 * This is needed for PWA installation on local networks
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const certDir = path.join(__dirname, 'certs');
const keyFile = path.join(certDir, 'key.pem');
const certFile = path.join(certDir, 'cert.pem');
const configFile = path.join(certDir, 'cert.conf');

// Create certs directory if it doesn't exist
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
  console.log('✅ Created certs directory');
}

// Check if certificates already exist
if (fs.existsSync(keyFile) && fs.existsSync(certFile)) {
  console.log('✅ Certificates already exist at:', certDir);
  console.log('   To regenerate, delete the certs/ folder first');
  process.exit(0);
}

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const localIP = getLocalIP();
console.log('🔐 Generating self-signed HTTPS certificate...');
console.log('📁 Location:', certDir);
console.log('📍 Local IP:', localIP);

// Create OpenSSL config with detailed SAN and extensions
const opensslConfig = `
[req]
default_bits = 2048
distinguished_name = req_distinguished_name
req_extensions = v3_req
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = localhost
O = Development
C = US

[v3_req]
basicConstraints = CA:FALSE
nsCertType = server
nsComment = "Development Certificate"
keyUsage = digitalSignature, keyEncipherment, keyAgreement, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = DNS:localhost, DNS:127.0.0.1, IP:127.0.0.1, IP:${localIP}
`;

try {
  // Write config file
  fs.writeFileSync(configFile, opensslConfig);
  
  // Generate self-signed certificate with all necessary extensions
  const command = process.platform === 'win32'
    ? `openssl req -x509 -newkey rsa:4096 -keyout "${keyFile}" -out "${certFile}" -days 365 -nodes -config "${configFile}" -set_serial 1`
    : `openssl req -x509 -newkey rsa:4096 -keyout "${keyFile}" -out "${certFile}" -days 365 -nodes -config "${configFile}" -set_serial 1`;
  
  execSync(command, { stdio: 'inherit' });
  
  // Clean up config file
  fs.unlinkSync(configFile);
  
  console.log('\n✅ Certificate generated successfully!');
  console.log('📝 Key file:  ' + keyFile);
  console.log('📝 Cert file: ' + certFile);
  console.log('\n📋 Certificate details:');
  console.log('   ✓ 4096-bit RSA key');
  console.log('   ✓ Supports Service Workers');
  console.log('   ✓ Valid 365 days');
  console.log('\n📍 Certificate includes:');
  console.log('   ✓ localhost');
  console.log('   ✓ 127.0.0.1');
  console.log('   ✓ ' + localIP);
  console.log('\n⚠️  NOTE: This is a self-signed certificate for LOCAL DEVELOPMENT ONLY');
  console.log('⚠️  Chrome will show security warning - this is normal!');
  console.log('✅ PWA and Service Workers will now work!\n');
  
} catch (error) {
  console.error('\n❌ Error generating certificate');
  console.error('\nMake sure OpenSSL is installed:\n');
  
  if (process.platform === 'win32') {
    console.error('WINDOWS:');
    console.error('  Option 1: Use Git Bash (includes OpenSSL)');
    console.error('  Option 2: Install OpenSSL from https://slproweb.com/products/Win32OpenSSL.html');
  } else if (process.platform === 'darwin') {
    console.error('macOS:');
    console.error('  brew install openssl');
  } else {
    console.error('Linux:');
    console.error('  sudo apt-get install openssl');
  }
  
  console.error('\nThen run: npm run gen-cert');
  process.exit(1);
}

