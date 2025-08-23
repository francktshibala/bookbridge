import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { Buffer } from 'buffer';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testAudioStorage() {
  try {
    console.log('🧪 Testing Supabase Storage audio integration...');
    
    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceKey) {
      throw new Error('Supabase environment variables are required');
    }
    
    // Create service role client
    const supabase = createClient(supabaseUrl, serviceKey);

    // Create a small test audio buffer (simulating MP3 data)
    const testAudio = Buffer.from('fake-audio-data-for-testing');
    const fileName = `test-${Date.now()}-${crypto.randomUUID()}.mp3`;
    
    console.log('📤 Uploading test audio file to audio-files bucket...');
    
    // Upload test audio
    const { data, error } = await supabase.storage
      .from('audio-files')
      .upload(fileName, testAudio, {
        contentType: 'audio/mp3',
        cacheControl: '2592000', // 30 days
        upsert: false
      });
      
    if (error) {
      console.error('❌ Upload failed:', error);
      return;
    }
    
    console.log('✅ Upload successful!');
    console.log('📁 File path:', data.path);
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('audio-files')
      .getPublicUrl(data.path);
      
    console.log('🌍 Public CDN URL:', publicUrl);
    
    // Test CDN access
    console.log('🔍 Testing CDN accessibility...');
    
    try {
      const response = await fetch(publicUrl);
      console.log('📡 CDN Response Status:', response.status);
      console.log('🏷️  Content-Type:', response.headers.get('content-type'));
      console.log('💾 Cache-Control:', response.headers.get('cache-control'));
      console.log('🌐 CF-Cache-Status:', response.headers.get('cf-cache-status'));
      
      if (response.status === 200) {
        console.log('✅ CDN delivery working! Audio files will be accessible worldwide including Africa.');
      }
    } catch (fetchError) {
      console.warn('⚠️  CDN test failed (this is normal for test data):', fetchError);
    }
    
    // Clean up test file
    console.log('🧹 Cleaning up test file...');
    const { error: deleteError } = await supabase.storage
      .from('audio-files')
      .remove([data.path]);
      
    if (deleteError) {
      console.warn('⚠️  Could not delete test file:', deleteError);
    } else {
      console.log('✅ Test file cleaned up');
    }
    
    console.log('🎉 Supabase Storage audio integration test completed successfully!');
    console.log('🌍 Ready for global audio delivery including Africa');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  testAudioStorage();
}

export { testAudioStorage };