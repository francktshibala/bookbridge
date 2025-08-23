import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function createAudioBucket() {
  try {
    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL is required in .env.local');
    }
    if (!serviceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required in .env.local');
    }
    
    // Create service role client
    const supabase = createClient(supabaseUrl, serviceKey);

    console.log('Creating audio-files bucket for global CDN delivery...');

    // Create the audio-files bucket
    const { data, error } = await supabase.storage.createBucket('audio-files', {
      public: true, // Enable CDN caching for better performance in Africa & worldwide
      fileSizeLimit: 52428800, // 50MB limit for audio files
      allowedMimeTypes: [
        'audio/mp3', 
        'audio/mpeg', 
        'audio/wav', 
        'audio/ogg',
        'audio/webm'
      ]
    });

    if (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ audio-files bucket already exists');
        
        // Update bucket configuration
        const { error: updateError } = await supabase.storage.updateBucket('audio-files', {
          public: true,
          fileSizeLimit: 52428800,
          allowedMimeTypes: [
            'audio/mp3', 
            'audio/mpeg', 
            'audio/wav', 
            'audio/ogg',
            'audio/webm'
          ]
        });
        
        if (updateError) {
          console.error('Failed to update bucket configuration:', updateError);
        } else {
          console.log('✅ Updated audio-files bucket configuration');
        }
        
        return;
      }
      throw error;
    }

    console.log('✅ Successfully created audio-files bucket');
    console.log('📡 Bucket configured for global CDN delivery (285+ cities worldwide)');
    console.log('🌍 Optimized for worldwide access including Africa');

  } catch (error) {
    console.error('❌ Error creating audio bucket:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  createAudioBucket();
}

export { createAudioBucket };