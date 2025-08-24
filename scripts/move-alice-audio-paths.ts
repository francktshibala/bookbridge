import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function moveAliceAudio() {
  console.log('🚚 Moving Alice audio files to book-specific paths...');
  
  const levels = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
  let totalMoved = 0;
  
  for (const level of levels) {
    console.log(`\nProcessing ${level.toUpperCase()}...`);
    
    // List all files in the level directory
    const { data: files, error } = await supabase.storage
      .from('audio-files')
      .list(level, { limit: 100 });
      
    if (error || !files) {
      console.log(`❌ Error listing ${level}: ${error?.message}`);
      continue;
    }
    
    console.log(`Found ${files.length} files in ${level}`);
    
    for (const file of files) {
      if (file.name.startsWith('chunk_')) {
        try {
          // Copy file to new location
          const { data: fileData } = await supabase.storage
            .from('audio-files')
            .download(`${level}/${file.name}`);
            
          if (fileData) {
            const newPath = `gutenberg-11/${level}/${file.name}`;
            
            const { error: uploadError } = await supabase.storage
              .from('audio-files')
              .upload(newPath, fileData, {
                contentType: 'audio/mp3',
                cacheControl: '2592000',
                upsert: true
              });
              
            if (!uploadError) {
              console.log(`✅ Moved ${level}/${file.name} → ${newPath}`);
              totalMoved++;
            } else {
              console.log(`❌ Failed to upload ${newPath}: ${uploadError.message}`);
            }
          }
        } catch (err) {
          console.log(`❌ Error moving ${file.name}: ${err}`);
        }
      }
    }
  }
  
  console.log(`\n🎉 Moved ${totalMoved} files total`);
  console.log('Alice audio should now work without regeneration!');
}

moveAliceAudio().catch(console.error);