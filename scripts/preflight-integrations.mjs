import fs from 'fs';
import path from 'path';

// Load env files manually if running directly in node
function loadEnvFile(filename) {
  const filePath = path.resolve(process.cwd(), filename);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      // Ignore comments and empty lines
      if (line.trim().startsWith('#') || !line.includes('=')) return;
      const index = line.indexOf('=');
      const key = line.substring(0, index).trim();
      let value = line.substring(index + 1).trim();
      
      // Strip surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key) {
        process.env[key] = value;
      }
    });
  }
}

loadEnvFile('.env');
loadEnvFile('.env.local');

console.log('============================================================');
console.log('PRINTME.AI BACKEND INTEGRATION PREFLIGHT CHECK');
console.log('============================================================');

let allPassed = true;
const checks = [];

function checkEnv(name, { required = true, isClient = false, validator = null } = {}) {
  const val = process.env[name];
  const present = !!(val && val.trim().length > 0);
  let status = 'MISSING';
  let message = '';
  
  if (present) {
    status = 'OK';
    if (validator) {
      try {
        const error = validator(val);
        if (error) {
          status = 'INVALID';
          message = error;
        }
      } catch (err) {
        status = 'INVALID';
        message = err.message;
      }
    }
  } else if (!required) {
    status = 'OPTIONAL MISSING';
  }

  const checkObj = { name, required, isClient, status, message };
  checks.push(checkObj);

  if (required && status !== 'OK') {
    allPassed = false;
  }
}

// 1. Stripe Checks
checkEnv('STRIPE_SECRET_KEY', { required: true });
checkEnv('STRIPE_WEBHOOK_SECRET', { required: true });

// 2. Supabase Checks
checkEnv('NEXT_PUBLIC_SUPABASE_URL', {
  required: true,
  isClient: true,
  validator: (val) => {
    try {
      new URL(val);
      return null;
    } catch {
      return 'Must be a valid URL';
    }
  }
});
checkEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', { required: true, isClient: true });
checkEnv('SUPABASE_SERVICE_ROLE_KEY', { required: true });

// 3. Printify Checks
checkEnv('PRINTIFY_API_TOKEN', { required: true });
const hasPrintifyShop = !!(process.env.PRINTIFY_SHOP_ID || process.env.NEXT_PUBLIC_PRINTIFY_SHOP_ID);
checks.push({
  name: 'PRINTIFY_SHOP_ID / NEXT_PUBLIC_PRINTIFY_SHOP_ID',
  required: true,
  isClient: false,
  status: hasPrintifyShop ? 'OK' : 'MISSING',
  message: hasPrintifyShop ? '' : 'Either PRINTIFY_SHOP_ID or NEXT_PUBLIC_PRINTIFY_SHOP_ID must be set'
});
if (!hasPrintifyShop) allPassed = false;

// 4. Cloudinary Checks
checkEnv('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME', { required: true, isClient: true });
checkEnv('CLOUDINARY_API_KEY', { required: true });
checkEnv('CLOUDINARY_API_SECRET', { required: true });

// 5. OpenAI (AI Provider) Checks
const aiProvider = process.env.AI_PROVIDER || 'mock';
checkEnv('AI_PROVIDER', { required: false });
checkEnv('OPENAI_API_KEY', { required: aiProvider === 'openai' });

// 6. App URL Checks
checkEnv('NEXT_PUBLIC_APP_URL', {
  required: true,
  isClient: true,
  validator: (val) => {
    try {
      new URL(val);
      return null;
    } catch {
      return 'Must be a valid URL';
    }
  }
});

// Print Report
checks.forEach(c => {
  const reqStr = c.required ? '[P0 Required]' : '[Optional]   ';
  const typeStr = c.isClient ? '[Client/Server]' : '[Server-Only]  ';
  const statusStr = c.status.padEnd(16);
  let detail = '';
  if (c.status === 'OK') {
    detail = `(${c.name} is configured)`;
  } else if (c.status === 'INVALID') {
    detail = `(${c.name} is invalid: ${c.message})`;
  } else {
    detail = `(${c.name} is missing or empty)`;
  }
  console.log(`${reqStr} ${typeStr} Status: ${statusStr} ${detail}`);
});

console.log('============================================================');
if (allPassed) {
  console.log('PREFLIGHT SUCCESS: All required P0 integrations are ready!');
  process.exit(0);
} else {
  console.error('PREFLIGHT WARNING: Some required integrations are missing/invalid.');
  console.error('Please configure them in your local environment / .env.local file.');
  process.exit(1);
}
