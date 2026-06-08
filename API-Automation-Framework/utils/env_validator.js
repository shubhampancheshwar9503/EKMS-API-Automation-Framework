require('dotenv').config();

const REQUIRED_VARS = [
    'BASE_URL',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'EMAIL_TO'
];

function validateEnv() {
    console.log('--- Validating Environment Configuration ---');
    const missing = [];

    REQUIRED_VARS.forEach(v => {
        if (!process.env[v]) {
            missing.push(v);
        }
    });

    if (missing.length > 0) {
        console.error('\x1b[31m[CRITICAL] Missing required environment variables:\x1b[0m');
        missing.forEach(m => console.error(`  - ${m}`));
        console.error('\nPlease check your .env file and ensure all variables are configured.\n');
        process.exit(1);
    }

    console.log('✅ Environment configuration is valid.\n');
}

if (require.main === module) {
    validateEnv();
}

module.exports = validateEnv;
