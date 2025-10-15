const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteTheDeadAudio() {
  console.log('🗑️ Deleting The Dead audio files from Supabase storage...');

  try {
    // List all files in the-dead/A1/ folder
    const { data: files, error: listError } = await supabase.storage
      .from('audio-files')
      .list('the-dead/A1', { limit: 1000 });

    if (listError) {
      console.log('ℹ️ No audio files found or folder doesn\'t exist:', listError.message);
      return;
    }

    if (!files || files.length === 0) {
      console.log('ℹ️ No audio files found to delete');
      return;
    }

    console.log(`📊 Found ${files.length} audio files to delete`);

    // Delete all files in the folder
    const filePaths = files.map(file => `the-dead/A1/${file.name}`);

    const { data, error: deleteError } = await supabase.storage
      .from('audio-files')
      .remove(filePaths);

    if (deleteError) {
      console.error('❌ Error deleting files:', deleteError);
    } else {
      console.log(`✅ Deleted ${filePaths.length} audio files from storage`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

deleteTheDeadAudio().catch(console.error);