import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updatePreviewMetadata(level) {
  const previewTextPath = path.join(process.cwd(), 'cache', `lady-with-dog-${level}-preview.txt`);
  const previewAudioPath = path.join(process.cwd(), 'cache', `lady-with-dog-${level}-preview-audio.json`);
  
  if (!fs.existsSync(previewTextPath) || !fs.existsSync(previewAudioPath)) {
    console.log(`⚠️ Missing files for ${level}`);
    return;
  }

  const previewText = fs.readFileSync(previewTextPath, 'utf8').trim();
  const audioMetadata = JSON.parse(fs.readFileSync(previewAudioPath, 'utf8'));
  
  // Add preview text to metadata
  const updatedMetadata = {
    ...audioMetadata,
    previewText
  };
  
  // Save updated metadata locally
  fs.writeFileSync(previewAudioPath, JSON.stringify(updatedMetadata, null, 2));
  console.log(`✅ Updated local metadata for ${level}`);
  
  // Upload metadata JSON to Supabase
  const metadataFileName = `lady-with-dog/${level}/preview-metadata.json`;
  console.log(`📤 Uploading metadata for ${level}...`);
  
  const { data, error } = await supabase.storage
    .from('audio-files')
    .upload(metadataFileName, JSON.stringify(updatedMetadata, null, 2), {
      contentType: 'application/json',
      upsert: true
    });

  if (error) {
    console.error(`❌ Failed to upload ${level} metadata:`, error.message);
  } else {
    console.log(`✅ Uploaded ${level} metadata to: ${metadataFileName}`);
  }
}

async function main() {
  const levels = ['A1', 'A2', 'B1'];
  
  for (const level of levels) {
    await updatePreviewMetadata(level);
  }
  
  console.log('\n🎉 Preview metadata update completed!');
}

main().catch(console.error);

