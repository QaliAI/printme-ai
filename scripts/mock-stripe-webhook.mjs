import fs from 'fs';
import path from 'path';
import Stripe from 'stripe';

// Load env files
function loadEnvFile(filename) {
  const filePath = path.resolve(process.cwd(), filename);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      if (line.trim().startsWith('#') || !line.includes('=')) return;
      const index = line.indexOf('=');
      const key = line.substring(0, index).trim();
      let value = line.substring(index + 1).trim();
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

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

if (!stripeSecret || !webhookSecret) {
  console.error('Error: STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET must be configured in .env / .env.local to sign mock webhooks.');
  process.exit(1);
}

const stripe = new Stripe(stripeSecret, {
  apiVersion: '2026-04-22.dahlia',
});

// Mock Stripe checkout.session.completed payload
const mockSessionId = 'cs_test_mock_' + Math.random().toString(36).substring(2, 10);
const payload = {
  id: 'evt_test_mock_' + Math.random().toString(36).substring(2, 10),
  object: 'event',
  api_version: '2026-04-22.dahlia',
  created: Math.floor(Date.now() / 1000),
  type: 'checkout.session.completed',
  data: {
    object: {
      id: mockSessionId,
      object: 'checkout.session',
      customer_details: {
        email: 'test-customer@example.com',
        name: 'Test Customer',
        phone: '+15555555555'
      },
      shipping_details: {
        name: 'Test Customer',
        address: {
          line1: '123 Test Lane',
          line2: 'Suite 100',
          city: 'Test City',
          state: 'CA',
          postal_code: '90210',
          country: 'US'
        }
      },
      livemode: false,
      metadata: {
        cartId: '00000000-0000-0000-0000-000000000000',
        userId: '00000000-0000-0000-0000-000000000000'
      }
    }
  }
};

const payloadString = JSON.stringify(payload);

// Generate valid stripe signature header
const signature = stripe.webhooks.generateTestHeaderString({
  payload: payloadString,
  secret: webhookSecret,
});

console.log('Sending mock stripe webhook to:', `${appUrl}/api/webhooks/stripe`);
console.log('Mock Session ID:', mockSessionId);

try {
  const response = await fetch(`${appUrl}/api/webhooks/stripe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': signature,
    },
    body: payloadString,
  });

  const resBody = await response.text();
  console.log('Status Code:', response.status);
  console.log('Response:', resBody);
  
  if (response.status === 200) {
    console.log('SUCCESS: Mock webhook processed successfully!');
  } else {
    console.error('FAILED: Server returned non-200 status code.');
  }
} catch (error) {
  console.error('Error sending POST request to local dev server:', error.message);
  console.error('Make sure your local development server is running ("npm run dev")');
}
