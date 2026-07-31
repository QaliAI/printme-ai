global.WebSocket = class {};

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testNullUserId() {
  try {
    console.log('Testing inserting a cart with user_id = null...');
    const { data, error } = await supabaseAdmin
      .from('carts')
      .insert({ user_id: null })
      .select()
      .single();

    if (error) {
      console.log('Insert failed (user_id cannot be null):', error.message);
    } else {
      console.log('Insert succeeded! user_id can be null. Cart ID:', data.id);
      // Clean up
      await supabaseAdmin.from('carts').delete().eq('id', data.id);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

testNullUserId();
