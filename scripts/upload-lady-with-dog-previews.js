import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function uploadPreviewText(level) {
  const previewCachePath = path.join(process.cwd(), 'cache', `lady-with-dog-${level}-preview.txt`);
  
  if (!fs.existsSync(previewCachePath)) {
    console.log(`⚠️ Preview text file not found: ${previewCachePath}`);
    return;
  }

  const previewText = fs.readFileSync(previewCachePath, 'utf8').trim();
  const previewTextFileName = `lady-with-dog/${level}/preview.txt`;
  
  console.log(`📤 Uploading preview text for ${level}...`);
  
  // Upload as Buffer without contentType (Supabase may auto-detect)
  const { data, error } = await supabase.storage
    .from('audio-files')
    .upload(previewTextFileName, Buffer.from(previewText, 'utf8'), {
      upsert: true
    });

  if (error) {
    console.error(`❌ Failed to upload ${level} preview text:`, error.message);
  } else {
    console.log(`✅ Uploaded ${level} preview text to: ${previewTextFileName}`);
  }
}

async function main() {
  const levels = ['A1', 'A2', 'B1'];
  
  for (const level of levels) {
    await uploadPreviewText(level);
  }
  
  console.log('\n🎉 Preview text upload completed!');
}

main().catch(console.error);

