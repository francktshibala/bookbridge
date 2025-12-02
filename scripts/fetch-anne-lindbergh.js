import fs from 'fs';
import path from 'path';

/**
 * Fetch Anne Lindbergh Biography from VOA Learning English
 * 
 * Source: VOA Learning English - People in America Series
 * URL: https://learningenglish.voanews.com/z/3613
 * 
 * Note: VOA content is already ESL-adapted and includes transcripts.
 * This script extracts the transcript text from the HTML page.
 */

// Try multiple VOA sources
const VOA_URLS = [
  'https://www.manythings.org/voa/people/Anne_Morrow_Lindbergh.html',
  'https://learningenglish.voanews.com/a/people-in-america-anne-lindbergh/3613.html',
  'https://learningenglish.voanews.com/z/3613',
];
const OUTPUT_FILE = 'cache/anne-lindbergh-original.txt';

async function fetchAnneLindbergh() {
  console.log('✈️  Fetching Anne Lindbergh Biography from VOA Learning English...');
  console.log('📋 Source: VOA Learning English - People in America Series');
  console.log('🔗 URL: https://learningenglish.voanews.com/z/3613');
  console.log('');

  // Ensure cache directory exists
  const cacheDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  // Check if transcript already exists
  if (fs.existsSync(OUTPUT_FILE)) {
    console.log('⚠️  Transcript already exists at:', OUTPUT_FILE);
    const existingContent = fs.readFileSync(OUTPUT_FILE, 'utf8');
    console.log(`📄 Existing file size: ${existingContent.length} characters`);
    console.log('');
    if (!process.argv.includes('--force')) {
      console.log('💡 To overwrite, run with --force flag: node scripts/fetch-anne-lindbergh.js --force');
      return;
    }
  }

  try {
    console.log('🌐 Attempting to fetch transcript from VOA sources...');
    console.log('');

    // Try multiple possible VOA URL patterns
    const possibleUrls = VOA_URLS;

    let transcriptText = null;

    for (const url of possibleUrls) {
      try {
        console.log(`🔍 Trying: ${url}`);
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; BookBridge/1.0)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });

        if (response.ok) {
          const html = await response.text();
          
          // Extract transcript text from HTML
          // VOA pages typically have transcript in article body or specific divs
          let text = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
            .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
            .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
            .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');

          // Try to find article content
          const articleMatch = text.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                               text.match(/<div[^>]*class="[^"]*article[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                               text.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

          if (articleMatch) {
            text = articleMatch[1];
          }

          // Remove HTML tags and decode entities
          text = text
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&apos;/g, "'")
            .replace(/&#8217;/g, "'")
            .replace(/&#8220;/g, '"')
            .replace(/&#8221;/g, '"')
            .replace(/&#8211;/g, '–')
            .replace(/&#8212;/g, '—')
            .replace(/\s+/g, ' ')
            .trim();

          // Look for story content markers
          const startMarkers = [
            'Anne Lindbergh',
            'People in America',
            'This is',
            'Welcome to',
          ];

          let startIndex = -1;
          for (const marker of startMarkers) {
            const index = text.indexOf(marker);
            if (index !== -1 && index < text.length / 2) {
              startIndex = index;
              break;
            }
          }

          if (startIndex !== -1) {
            text = text.substring(startIndex);
          }

          // Remove common VOA artifacts
          text = text
            .replace(/VOA Learning English/gi, '')
            .replace(/People in America/gi, '')
            .replace(/Download MP3/gi, '')
            .replace(/Download PDF/gi, '')
            .replace(/Click here/gi, '')
            .replace(/Listen to/gi, '')
            .replace(/Share this/gi, '')
            .replace(/Related articles/gi, '')
            .replace(/More stories/gi, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

          // Check if we got substantial content
          if (text.length > 2000) {
            transcriptText = text;
            console.log(`✅ Successfully extracted ${text.length} characters from VOA`);
            break;
          } else {
            console.log(`   ⚠️  Extracted text too short (${text.length} chars), trying next URL...`);
          }
        } else {
          console.log(`   ❌ HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        continue;
      }
    }

    if (!transcriptText) {
      console.log('');
      console.log('❌ Could not automatically fetch transcript from VOA website.');
      console.log('');
      console.log('📝 MANUAL INSTRUCTIONS:');
      console.log('   1. Visit: https://learningenglish.voanews.com/z/3613');
      console.log('   2. Find the transcript text (usually below the audio player)');
      console.log('   3. Copy the transcript text');
      console.log('   4. Save it to:', OUTPUT_FILE);
      console.log('');
      console.log('💡 VOA transcripts are typically:');
      console.log('   - Already ESL-adapted (simplified language)');
      console.log('   - ~15 minutes reading time');
      console.log('   - Include audio files');
      console.log('');
      return;
    }

    // Save transcript
    fs.writeFileSync(OUTPUT_FILE, transcriptText, 'utf8');

    // Get basic stats
    const sentences = transcriptText.split(/[.!?]+\s+/).filter(s => s.trim().length > 20);
    const words = transcriptText.split(/\s+/).length;
    const paragraphs = transcriptText.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;

    console.log('');
    console.log('✅ Transcript saved successfully!');
    console.log(`📄 File: ${OUTPUT_FILE}`);
    console.log(`📊 Stats:`);
    console.log(`   - Characters: ${transcriptText.length.toLocaleString()}`);
    console.log(`   - Words: ${words.toLocaleString()}`);
    console.log(`   - Sentences: ${sentences.length.toLocaleString()}`);
    console.log(`   - Paragraphs: ${paragraphs.toLocaleString()}`);
    console.log('');
    console.log('✨ Note: VOA content is already ESL-adapted!');
    console.log('   We will still create A1 simplification for consistency with other stories.');
    console.log('');
    console.log('🎯 Next steps:');
    console.log('   1. Review the transcript: cat cache/anne-lindbergh-original.txt');
    console.log('   2. Run simplification: node scripts/simplify-anne-lindbergh.js A1');
    console.log('');

  } catch (error) {
    console.error('❌ Error fetching transcript:', error);
    console.log('');
    console.log('📝 Please manually save the transcript to:', OUTPUT_FILE);
    process.exit(1);
  }
}

// Run the fetch
fetchAnneLindbergh();

