#!/usr/bin/env node
/**
 * Security Checker
 *
 * Scans the codebase for exposed credentials and security issues.
 * Run: node src/scripts/security-check.js
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Patterns for detecting sensitive data
const SENSITIVE_PATTERNS = [
  // API Keys
  { pattern: /(?:api[-_]?key|apikey)[\s]*[=:][\s]*['"]([\w-]{20,})['"]/gi, name: 'API Key' },
  { pattern: /(?:secret[-_]?key|secretkey)[\s]*[=:][\s]*['"]([\w-]{20,})['"]/gi, name: 'Secret Key' },
  { pattern: /(?:access[-_]?key|accesskey)[\s]*[=:][\s]*['"]([\w-]{20,})['"]/gi, name: 'Access Key' },

  // Passwords
  { pattern: /(?:password|passwd|pwd)[\s]*[=:][\s]*['"]([\w!@#$%^&*()-]{8,})['"]/gi, name: 'Password' },

  // Tokens
  { pattern: /(?:token|jwt)[\s]*[=:][\s]*['"]([\w.-]{20,})['"]/gi, name: 'Token' },

  // Stripe
  { pattern: /sk_live_[\w-]+/g, name: 'Stripe Live Secret Key' },
  { pattern: /sk_test_[\w-]+/g, name: 'Stripe Test Secret Key' },
  { pattern: /rk_live_[\w-]+/g, name: 'Stripe Live Restricted Key' },

  // Razorpay
  { pattern: /rzp_live_[\w-]+/g, name: 'Razorpay Live Key' },
  { pattern: /rzp_test_[\w-]+/g, name: 'Razorpay Test Key' },

  // AWS
  { pattern: /AKIA[0-9A-Z]{16}/g, name: 'AWS Access Key ID' },
  { pattern: /(?:aws_secret_access_key)[\s]*[=:][\s]*['"]([\w/+=]{40})['"]/gi, name: 'AWS Secret Access Key' },

  // Database
  { pattern: /mongodb(?:\+srv)?:\/\/[^:]+:([^@]+)@/g, name: 'MongoDB Connection String Password' },
  { pattern: /(?:postgres|mysql|redis):\/\/[^:]+:([^@]+)@/g, name: 'Database Password' },

  // OpenAI
  { pattern: /sk-[a-zA-Z0-9]{48,}/g, name: 'OpenAI API Key' },

  // Anthropic
  { pattern: /sk-ant-[a-zA-Z0-9-]{80,}/g, name: 'Anthropic API Key' },

  // Generic secrets
  { pattern: /['"][a-zA-Z0-9]{32,}['"]/g, name: 'Potential Secret' }
];

// Files to skip
const SKIP_DIRS = ['node_modules', '.git', 'dist', 'build', 'coverage', 'logs'];
const SKIP_FILES = ['.env.example', 'security-check.js', 'encrypt-credential.js'];

// Extensions to check
const CHECK_EXTENSIONS = ['.js', '.ts', '.json', '.env', '.yml', '.yaml', '.md'];

class SecurityChecker {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.scannedFiles = 0;
  }

  /**
   * Check environment variables for security issues
   */
  checkEnvironmentVariables() {
    console.log('\n📋 Checking environment variables...\n');

    const sensitiveVars = [
      'JWT_SECRET', 'JWT_REFRESH_SECRET', 'SESSION_SECRET',
      'SMTP_PASSWORD', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
      'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET',
      'OPENAI_API_KEY', 'ANTHROPIC_API_KEY',
      'AWS_SECRET_ACCESS_KEY', 'MONGODB_PASSWORD'
    ];

    for (const varName of sensitiveVars) {
      const value = process.env[varName];
      if (!value) continue;

      // Check if it's encrypted
      const encryptedValue = process.env[`${varName}_ENCRYPTED`];

      if (encryptedValue) {
        console.log(`  ✅ ${varName}: Using encrypted value`);
      } else if (value && value.length > 0) {
        // Check for weak values
        if (value.length < 16) {
          this.warnings.push({
            type: 'WEAK_CREDENTIAL',
            message: `${varName} is too short (${value.length} characters). Minimum recommended: 16 characters.`,
            severity: 'medium'
          });
        }

        // Check for test/default values
        const testPatterns = ['test', 'demo', 'example', 'default', 'xxx', 'change-me', 'your-', 'secret'];
        const lowerValue = value.toLowerCase();
        for (const pattern of testPatterns) {
          if (lowerValue.includes(pattern)) {
            this.issues.push({
              type: 'INSECURE_DEFAULT',
              message: `${varName} contains test/default value: "${pattern}"`,
              severity: 'high'
            });
            break;
          }
        }

        // Check if value is plaintext (not encrypted)
        if (!value.startsWith('enc:') && !this.isLikelyEncrypted(value)) {
          this.warnings.push({
            type: 'PLAINTEXT_CREDENTIAL',
            message: `${varName} is stored as plaintext. Consider using ${varName}_ENCRYPTED instead.`,
            severity: 'medium'
          });
        }
      }
    }
  }

  /**
   * Check if a value appears to be encrypted
   */
  isLikelyEncrypted(value) {
    // Base64 encoded encrypted values are typically long and contain specific characters
    return value.length > 50 && /^[A-Za-z0-9+/=]+$/.test(value);
  }

  /**
   * Scan a file for sensitive patterns
   */
  scanFile(filePath, content) {
    const relativePath = path.relative(process.cwd(), filePath);
    const fileIssues = [];

    for (const { pattern, name } of SENSITIVE_PATTERNS) {
      const matches = content.match(pattern);

      if (matches) {
        for (const match of matches) {
          // Skip if in .env.example or test files
          if (filePath.includes('.env.example') || filePath.includes('.test.') || filePath.includes('.spec.')) {
            continue;
          }

          // Skip common false positives
          if (match.includes('your-') || match.includes('xxx') || match.includes('placeholder')) {
            continue;
          }

          fileIssues.push({
            file: relativePath,
            type: name,
            match: match.substring(0, 50) + (match.length > 50 ? '...' : ''),
            line: this.findLineNumber(content, match)
          });
        }
      }
    }

    if (fileIssues.length > 0) {
      this.issues.push({
        type: 'EXPOSED_CREDENTIAL',
        message: `Found ${fileIssues.length} potential exposed credential(s) in ${relativePath}`,
        severity: 'high',
        details: fileIssues
      });
    }
  }

  /**
   * Find line number of a match
   */
  findLineNumber(content, match) {
    const lines = content.split('\n');
    const searchStr = match.substring(0, 30);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(searchStr)) {
        return i + 1;
      }
    }
    return -1;
  }

  /**
   * Recursively scan directory
   */
  scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!SKIP_DIRS.includes(entry.name)) {
          this.scanDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (CHECK_EXTENSIONS.includes(ext) && !SKIP_FILES.includes(entry.name)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            this.scanFile(fullPath, content);
            this.scannedFiles++;
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }
    }
  }

  /**
   * Check .env file security
   */
  checkEnvFile() {
    const envPath = path.join(process.cwd(), '.env');

    if (!fs.existsSync(envPath)) {
      this.warnings.push({
        type: 'NO_ENV_FILE',
        message: 'No .env file found. Ensure environment variables are properly configured.',
        severity: 'low'
      });
      return;
    }

    console.log('\n📋 Checking .env file...\n');

    try {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();

        // Skip comments and empty lines
        if (!trimmed || trimmed.startsWith('#')) continue;

        // Check for exposed credentials in .env
        for (const { pattern, name } of SENSITIVE_PATTERNS) {
          if (pattern.test(trimmed)) {
            const keyName = trimmed.split('=')[0];

            // Check if there's an encrypted version
            const keyBase = keyName.replace('_ENCRYPTED', '');
            const hasEncrypted = lines.some(l =>
              l.trim().startsWith(`${keyBase}_ENCRYPTED=`)
            );

            if (!hasEncrypted && !keyName.endsWith('_ENCRYPTED')) {
              this.warnings.push({
                type: 'ENV_PLAINTEXT_CREDENTIAL',
                message: `Consider encrypting ${keyName} in .env file`,
                severity: 'medium'
              });
            }
          }
        }
      }

      // Check if .env is in .gitignore
      const gitignorePath = path.join(process.cwd(), '.gitignore');
      if (fs.existsSync(gitignorePath)) {
        const gitignore = fs.readFileSync(gitignorePath, 'utf8');
        if (!gitignore.includes('.env')) {
          this.issues.push({
            type: 'ENV_NOT_IN_GITIGNORE',
            message: '.env file is not in .gitignore. This could expose credentials!',
            severity: 'critical'
          });
        } else {
          console.log('  ✅ .env is in .gitignore');
        }
      }
    } catch (error) {
      this.warnings.push({
        type: 'ENV_READ_ERROR',
        message: 'Could not read .env file',
        severity: 'low'
      });
    }
  }

  /**
   * Check production readiness
   */
  checkProductionReadiness() {
    console.log('\n📋 Checking production readiness...\n');

    const checks = [
      { name: 'NODE_ENV', value: process.env.NODE_ENV, expected: 'production', critical: false },
      { name: 'JWT_SECRET', value: process.env.JWT_SECRET, minLength: 32, critical: true },
      { name: 'JWT_REFRESH_SECRET', value: process.env.JWT_REFRESH_SECRET, minLength: 32, critical: true },
      { name: 'ENCRYPTION_KEY', value: process.env.ENCRYPTION_KEY, minLength: 32, critical: true },
      { name: 'MONGODB_URI', value: process.env.MONGODB_URI, required: true, critical: true }
    ];

    for (const check of checks) {
      const status = {
        name: check.name,
        passed: true,
        message: ''
      };

      if (check.required && !check.value) {
        status.passed = false;
        status.message = 'Required but not set';
      } else if (check.minLength && (!check.value || check.value.length < check.minLength)) {
        status.passed = false;
        status.message = `Too short (${check.value?.length || 0}/${check.minLength} chars)`;
      } else if (check.expected && check.value !== check.expected) {
        status.passed = false;
        status.message = `Expected "${check.expected}", got "${check.value || 'not set'}"`;
      } else {
        status.message = 'OK';
      }

      const icon = status.passed ? '✅' : (check.critical ? '❌' : '⚠️');
      console.log(`  ${icon} ${check.name}: ${status.message}`);

      if (!status.passed && check.critical) {
        this.issues.push({
          type: 'PRODUCTION_NOT_READY',
          message: `${check.name} is not production-ready: ${status.message}`,
          severity: 'critical'
        });
      } else if (!status.passed) {
        this.warnings.push({
          type: 'PRODUCTION_CHECK',
          message: `${check.name}: ${status.message}`,
          severity: 'medium'
        });
      }
    }
  }

  /**
   * Run all security checks
   */
  run() {
    console.log('🔒 Security Check\n');
    console.log('='.repeat(50));

    // Check environment variables
    this.checkEnvironmentVariables();

    // Check .env file
    this.checkEnvFile();

    // Check production readiness
    if (process.env.NODE_ENV === 'production') {
      this.checkProductionReadiness();
    }

    // Scan source files
    console.log('\n📋 Scanning source files...\n');
    const srcDir = path.join(process.cwd(), 'src');
    if (fs.existsSync(srcDir)) {
      this.scanDirectory(srcDir);
    }
    console.log(`  Scanned ${this.scannedFiles} files`);

    // Print results
    console.log('\n' + '='.repeat(50));
    console.log('\n📊 Security Report\n');

    if (this.issues.length === 0 && this.warnings.length === 0) {
      console.log('✅ No security issues found!\n');
      return;
    }

    if (this.issues.length > 0) {
      console.log('❌ Issues:\n');
      for (const issue of this.issues) {
        console.log(`  [${issue.severity.toUpperCase()}] ${issue.message}`);
        if (issue.details) {
          for (const detail of issue.details) {
            console.log(`    - ${detail.type}: "${detail.match}" at line ${detail.line}`);
          }
        }
      }
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:\n');
      for (const warning of this.warnings) {
        console.log(`  [${warning.severity.toUpperCase()}] ${warning.message}`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('\n💡 Recommendations:\n');
    console.log('  1. Use encrypted credentials: Run `node src/scripts/encrypt-credential.js`');
    console.log('  2. Add sensitive files to .gitignore');
    console.log('  3. Use environment-specific configuration');
    console.log('  4. Never commit .env files to version control');
    console.log('  5. Rotate credentials regularly');
    console.log('  6. Use strong, unique passwords and keys');
    console.log('');

    // Exit with error code if critical issues found
    const hasCritical = this.issues.some(i => i.severity === 'critical');
    if (hasCritical) {
      process.exit(1);
    }
  }
}

// Run security check
const checker = new SecurityChecker();
checker.run();