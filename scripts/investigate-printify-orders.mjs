import fs from 'node:fs';

// Read .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    const k = trimmed.slice(0, eqIdx).trim();
    const v = trimmed.slice(eqIdx + 1).trim();
    env[k] = v;
  }
}

const token = env.PRINTIFY_API_TOKEN;
const shopId = env.PRINTIFY_SHOP_ID;

if (!token || !shopId) {
  console.log('PRINTIFY_API_TOKEN or PRINTIFY_SHOP_ID is not configured.');
  process.exit(0);
}

async function fetchPrintifyOrders() {
  try {
    const url = `https://api.printify.com/v1/shops/${shopId}/orders.json?limit=10`;
    console.log(`Fetching orders from Printify shop ${shopId} (read-only GET)...`);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'PrintMe.ai/1.0 (+https://printme.ai)'
      }
    });

    console.log(`HTTP Status: ${res.status}`);
    if (!res.ok) {
      const errText = await res.text();
      console.log('Printify API error response:', errText);
      return;
    }

    const data = await res.json();
    const orders = data.data || [];
    console.log(`Total orders returned: ${orders.length}`);

    // Redact PII and log structured details
    const sanitized = orders.map(o => ({
      id: o.id,
      created_at: o.created_at,
      status: o.status,
      external_id: o.external_id,
      label: o.label,
      total_price: o.total_price,
      total_shipping: o.total_shipping,
      line_items: (o.line_items || []).map(li => ({
        product_id: li.product_id,
        variant_id: li.variant_id,
        quantity: li.quantity,
        print_provider_id: li.print_provider_id,
        blueprint_id: li.blueprint_id,
        status: li.status
      })),
      shipping_method: o.shipping_method,
      has_address: Boolean(o.address_to)
    }));

    console.log(JSON.stringify(sanitized, null, 2));
  } catch (err) {
    console.error('Error fetching Printify orders:', err.message);
  }
}

fetchPrintifyOrders();
