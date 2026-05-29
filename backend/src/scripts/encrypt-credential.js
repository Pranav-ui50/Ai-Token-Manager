#!/usr/bin/env node
/**
 * Credential Encryption CLI
 *
 * Utility script to encrypt sensitive credentials for .env file.
 * Run: node src/scripts/encrypt-credential.js
 */

import 'dotenv/config';
import crypto from 'crypto';
import readline from 'readline';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

/**
 * Get encryption key from environment
 */
function getEncryptionKey() {
  const envKey = process.env.ENCRYPTION_KEY;

  if (!envKey) {
    console.error('Error: ENCRYPTION_KEY environment variable is required.');
    console.error('Set it in your .env file or provide it when running:');
    console.error('  ENCRYPTION_KEY=your-key node src/scripts/encrypt-credential.js');
    process.exit(1);
  }

  return crypto.scryptSync(envKey, 'app-credentials-salt', 32);
}

/**
 * Encrypt a value
 */
function encrypt(value) {
  const encryptionKey = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);

  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([salt, iv, authTag, encrypted]);

  return combined.toString('base64');
}

/**
 * Decrypt a value
 */
function decrypt(encryptedValue) {
  const encryptionKey = getEncryptionKey();

  const buffer = Buffer.from(encryptedValue, 'base64');

  const salt = buffer.subarray(0, SALT_LENGTH);
  const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = buffer.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
  );
  const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}

/**
 * Interactive CLI
 */
async function interactive() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise((resolve) => {
    rl.question(prompt, resolve);
  });

  console.log('\n=== Credential Encryption Tool ===\n');
  console.log('This tool encrypts sensitive credentials for storage in .env files.\n');

  const action = await question('Choose action:\n1. Encrypt a credential\n2. Decrypt a credential\n3. Batch encrypt from .env\nEnter choice (1-3): ');

  if (action === '1') {
    // Encrypt single credential
    const keyName = await question('Enter credential name (e.g., SMTP_PASSWORD): ');

    // Hide input for sensitive values
    process.stdout.write('Enter credential value: ');
    process.stdin.setRawMode(true);
    let value = '';
    for await (const char of process.stdin) {
      if (char === '\r' || char === '\n' || char === '') {
        process.stdin.setRawMode(false);
        process.stdout.write('\n');
        break;
      }
      if (char === '') { // Backspace
        value = value.slice(0, -1);
      } else {
        value += char;
      }
    }

    const encrypted = encrypt(value);
    console.log('\n\nEncrypted credential:');
    console.log(`\n${keyName}_ENCRYPTED="${encrypted}"\n`);
    console.log('Add this to your .env file.');
    console.log('The system will automatically use this encrypted value when the plain version is not set.');

  } else if (action === '2') {
    // Decrypt credential
    const encryptedValue = await question('Enter encrypted value: ');
    try {
      const decrypted = decrypt(encryptedValue);
      console.log('\nDecrypted value:');
      console.log(decrypted);
    } catch (error) {
      console.error('Error: Failed to decrypt. Make sure ENCRYPTION_KEY is correct.');
    }

  } else if (action === '3') {
    // Batch encrypt from .env
    console.log('\nThis will encrypt sensitive credentials from your .env file.');
    console.log('Sensitive credentials are those containing: password, secret, key, token, api_key\n');

    const sensitiveKeys = [
      'SMTP_PASSWORD',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'SESSION_SECRET',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'RAZORPAY_KEY_SECRET',
      'RAZORPAY_WEBHOOK_SECRET',
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'ENCRYPTION_KEY'
    ];

    console.log('Credentials to encrypt:');
    sensitiveKeys.forEach(k => console.log(`  - ${k}`));

    const confirm = await question('\nProceed with encryption? (y/n): ');

    if (confirm.toLowerCase() === 'y') {
      console.log('\nEncrypted values (add to .env file):\n');

      for (const key of sensitiveKeys) {
        const value = process.env[key];
        if (value && !value.startsWith('enc:')) {
          try {
            const encrypted = encrypt(value);
            console.log(`${key}_ENCRYPTED="${encrypted}"`);
          } catch (error) {
            console.error(`Error encrypting ${key}: ${error.message}`);
          }
        }
      }
      console.log('\n');
      console.log('After adding encrypted values, you can remove plain text credentials from .env');
      console.log('Keep ENCRYPTION_KEY secure and never commit it to version control!');
    }
  }

  rl.close();
}

/**
 * Command line mode
 */
function cli() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'encrypt') {
    const value = args[1];
    if (!value) {
      console.error('Usage: node encrypt-credential.js encrypt <value>');
      process.exit(1);
    }
    console.log(encrypt(value));
  } else if (command === 'decrypt') {
    const value = args[1];
    if (!value) {
      console.error('Usage: node encrypt-credential.js decrypt <encrypted-value>');
      process.exit(1);
    }
    try {
      console.log(decrypt(value));
    } catch (error) {
      console.error('Error: Failed to decrypt');
      process.exit(1);
    }
  } else if (command === '--help' || command === '-h') {
    console.log('\nCredential Encryption Tool\n');
    console.log('Usage:');
    console.log('  node src/scripts/encrypt-credential.js              Interactive mode');
    console.log('  node src/scripts/encrypt-credential.js encrypt <value>   Encrypt a value');
    console.log('  node src/scripts/encrypt-credential.js decrypt <value>   Decrypt a value');
    console.log('\nEnvironment Variables:');
    console.log('  ENCRYPTION_KEY    Required. The key used to encrypt/decrypt credentials.');
    console.log('\nExamples:');
    console.log('  ENCRYPTION_KEY=my-secret-key node src/scripts/encrypt-credential.js');
    console.log('  ENCRYPTION_KEY=my-secret-key node src/scripts/encrypt-credential.js encrypt "my-password"');
    process.exit(0);
  } else {
    interactive();
  }
}

cli();