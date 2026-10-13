const products = [
  { id: 'gallery-poster', blueprint: 282, provider: 99, variants: [43138, 43144] },
  { id: 'everyday-tee', blueprint: 12, provider: 99, variants: [18541, 18542] },
  { id: 'keepsake-mug', blueprint: 68, provider: 1, variants: [33719] },
];
async function get(path) {
  const response = await fetch(`https://api.printify.com/v1${path}`, { headers: { Authorization: `Bearer ${process.env.PRINTIFY_API_TOKEN}`, 'User-Agent': 'PrintMe.ai read-only revenue verification' }, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Printify read status ${response.status}`);
  return response.json();
}
try {
  const shops = await get('/shops.json');
  console.log(JSON.stringify({ configuredShopFound: shops.some(s => String(s.id) === process.env.PRINTIFY_SHOP_ID), writes: 0 }));
  for (const product of products) {
    const [data, shipping] = await Promise.all([
      get(`/catalog/blueprints/${product.blueprint}/print_providers/${product.provider}/variants.json`),
      get(`/catalog/blueprints/${product.blueprint}/print_providers/${product.provider}/shipping.json`),
    ]);
    console.log(JSON.stringify({ product: product.id,
      variants: data.variants.filter(v => product.variants.includes(v.id)).map(v => ({ id: v.id, cost: v.cost ?? v.price ?? null, available: v.is_available, title: v.title })),
      shippingProfiles: shipping.profiles.filter(p => p.countries?.includes('US') && p.variant_ids.some(id => product.variants.includes(id))).map(p => ({ variant_ids: p.variant_ids.filter(id => product.variants.includes(id)), first_item: p.first_item, additional_items: p.additional_items, handling_time: p.handling_time })).slice(0, 4),
      shippingMetadataKeys: Object.keys(shipping),
    }));
  }
} catch(error) { console.log(JSON.stringify({ error: error.message, writes: 0 })); process.exitCode = 1; }
