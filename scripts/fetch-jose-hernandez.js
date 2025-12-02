import fs from 'fs';
import path from 'path';

/**
 * Fetch José Hernández NASA Astronaut Biography
 * 
 * Source: NASA Astronaut Biography (Public Domain - Government Work)
 * URL: https://www.nasa.gov/astronauts/
 * 
 * Note: NASA astronaut biographies are available as PDFs on nasa.gov.
 * This script attempts to fetch the biography PDF and extract text.
 */

// Try multiple possible NASA biography URL patterns
const NASA_BIO_URLS = [
  'https://www.nasa.gov/wp-content/uploads/2019/12/hernandezjose.pdf',
  'https://www.nasa.gov/sites/default/files/atoms/files/hernandezjose.pdf',
  'https://www.nasa.gov/astronauts/biographies/jose-m-hernandez',
  'https://www.nasa.gov/astronauts/biographies/former/jose-m-hernandez',
];
const OUTPUT_FILE = 'cache/jose-hernandez-original.txt';

async function fetchJoseHernandez() {
  console.log('🚀 Fetching José Hernández NASA Astronaut Biography...');
  console.log('📋 Source: NASA Astronaut Biography (Public Domain)');
  console.log('🔗 URL: https://www.nasa.gov/astronauts/');
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
    const answer = process.argv.includes('--force') ? 'y' : null;
    if (!answer) {
      console.log('💡 To overwrite, run with --force flag: node scripts/fetch-jose-hernandez.js --force');
      return;
    }
  }

  try {
    // Try to fetch NASA biography PDF
    console.log('🌐 Attempting to fetch biography from NASA website...');
    console.log(`🔗 Trying multiple URLs...`);
    console.log('');

    // Import pdf-parse for PDF text extraction
    const pdfParse = (await import('pdf-parse')).default;

    let transcriptText = null;

    // Try PDF URLs first
    for (const url of NASA_BIO_URLS.filter(u => u.endsWith('.pdf'))) {
      try {
        console.log(`🔍 Trying PDF: ${url}`);
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; BookBridge/1.0)',
          },
        });

        if (response.ok) {
          const pdfBuffer = await response.arrayBuffer();
          console.log(`✅ PDF downloaded (${(pdfBuffer.byteLength / 1024).toFixed(2)} KB)`);

          // Extract text from PDF
          console.log('📄 Extracting text from PDF...');
          const pdfData = await pdfParse(Buffer.from(pdfBuffer));
          let biographyText = pdfData.text;

          // Clean up the text
          biographyText = biographyText
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/^\s+|\s+$/gm, '')
            .replace(/Page \d+/gi, '')
            .trim();

          if (biographyText.length > 1000) {
            transcriptText = biographyText;
            console.log(`✅ Successfully extracted ${biographyText.length} characters from PDF`);
            break;
          }
        }
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        continue;
      }
    }

    // If PDF failed, try HTML biography pages
    if (!transcriptText) {
      for (const url of NASA_BIO_URLS.filter(u => !u.endsWith('.pdf'))) {
        try {
          console.log(`🔍 Trying HTML: ${url}`);
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; BookBridge/1.0)',
            },
          });

          if (response.ok) {
            const html = await response.text();
            
            // Extract text from HTML
            let text = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/&nbsp;/g, ' ')
              .replace(/&quot;/g, '"')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/\s+/g, ' ')
              .trim();

            // Look for biography content
            const startMarkers = ['José Hernández', 'Jose Hernandez', 'Biography'];
            let startIndex = -1;
            for (const marker of startMarkers) {
              const index = text.indexOf(marker);
              if (index !== -1) {
                startIndex = index;
                break;
              }
            }

            if (startIndex !== -1) {
              text = text.substring(startIndex);
            }

            text = text
              .replace(/\n{3,}/g, '\n\n')
              .trim();

            if (text.length > 1000) {
              transcriptText = text;
              console.log(`✅ Successfully extracted ${text.length} characters from HTML`);
              break;
            }
          }
        } catch (error) {
          console.log(`   ❌ Failed: ${error.message}`);
          continue;
        }
      }
    }

    if (!transcriptText) {
      console.log('');
      console.log('❌ Could not automatically fetch biography from NASA website.');
      console.log('');
      console.log('📝 MANUAL INSTRUCTIONS:');
      console.log('   1. Visit: https://www.nasa.gov/astronauts/');
      console.log('   2. Search for "José Hernández" or "Jose Hernandez"');
      console.log('   3. Open biography page and copy text');
      console.log('   4. Save it to:', OUTPUT_FILE);
      console.log('');
      return;
    }

    // Save biography text
    fs.writeFileSync(OUTPUT_FILE, transcriptText, 'utf8');

    // Get basic stats
    const sentences = transcriptText.split(/[.!?]+\s+/).filter(s => s.trim().length > 20);
    const words = transcriptText.split(/\s+/).length;
    const paragraphs = transcriptText.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;

    console.log('');
    console.log('✅ Biography saved successfully!');
    console.log(`📄 File: ${OUTPUT_FILE}`);
    console.log(`📊 Stats:`);
    console.log(`   - Characters: ${transcriptText.length.toLocaleString()}`);
    console.log(`   - Words: ${words.toLocaleString()}`);
    console.log(`   - Sentences: ${sentences.length.toLocaleString()}`);
    console.log(`   - Paragraphs: ${paragraphs.toLocaleString()}`);
    console.log('');
    console.log('⚠️  Note: Biography may be shorter than oral history (~10-15 min vs 60+ min)');
    console.log('   This is normal - biography is condensed narrative vs full interview.');
    console.log('');
    console.log('🎯 Next steps:');
    console.log('   1. Review the biography: cat cache/jose-hernandez-original.txt');
    console.log('   2. Run simplification: node scripts/simplify-jose-hernandez.js A1');
    console.log('');

  } catch (error) {
    console.error('❌ Error fetching transcript:', error);
    console.log('');
    console.log('📝 Please manually save the transcript to:', OUTPUT_FILE);
    process.exit(1);
  }
}

// Run the fetch
fetchJoseHernandez();

