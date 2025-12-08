import fs from 'fs';
import path from 'path';

/**
 * Fetch José Hernández Biography from Wikipedia
 * 
 * Source: Wikipedia Featured Article (Public Domain facts, Creative Commons text)
 * URL: https://en.wikipedia.org/wiki/José_M._Hernández
 * 
 * Strategy: Extract biography text, clean citations, format as narrative
 */

const STORY_ID = 'jose-hernandez';
const WIKIPEDIA_URL = 'https://en.wikipedia.org/wiki/José_M._Hernández';
const OUTPUT_FILE = `cache/${STORY_ID}-original.txt`;

async function fetchJoseHernandez() {
  console.log('🚀 Fetching José Hernández Biography from Wikipedia...');
  console.log('📋 Source: Wikipedia Featured Article');
  console.log(`🔗 URL: ${WIKIPEDIA_URL}`);
  console.log('');

  // Ensure cache directory exists
  const cacheDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  // Check if already exists
  if (fs.existsSync(OUTPUT_FILE) && !process.argv.includes('--force')) {
    console.log('⚠️  File already exists:', OUTPUT_FILE);
    console.log('💡 To overwrite, run with --force flag');
    return;
  }

  try {
    console.log('🌐 Fetching Wikipedia article via API...');
    
    // Use Wikipedia API to get clean text
    const apiUrl = 'https://en.wikipedia.org/api/rest_v1/page/summary/José_M._Hernández';
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'BookBridge/1.0 (Educational Content Aggregator)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    let text = data.extract || '';

    // If extract is too short, fetch full article
    if (text.length < 500) {
      console.log('📄 Extract too short, fetching full article...');
      const fullArticleUrl = 'https://en.wikipedia.org/api/rest_v1/page/html/José_M._Hernández';
      const fullResponse = await fetch(fullArticleUrl, {
        headers: {
          'User-Agent': 'BookBridge/1.0 (Educational Content Aggregator)',
          'Accept': 'text/html',
        },
      });

      if (fullResponse.ok) {
        const html = await fullResponse.text();
        // Extract text from HTML - look for main content
        let extracted = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, ' ')
          .trim();

        // Find biography content (after "Early life" or "Biography")
        const bioStart = extracted.indexOf('Early life') || extracted.indexOf('Biography');
        if (bioStart !== -1) {
          extracted = extracted.substring(bioStart);
        }

        // Remove references section
        const refIndex = extracted.indexOf('References');
        if (refIndex !== -1) {
          extracted = extracted.substring(0, refIndex);
        }

        if (extracted.length > text.length) {
          text = extracted;
        }
      }
    }

    // Remove Wikipedia citations [1], [2], etc.
    text = text
      .replace(/\[\d+\]/g, '') // Remove [1], [2], etc.
      .replace(/\[citation needed\]/gi, '')
      .replace(/\[who\?\]/gi, '')
      .replace(/\[when\?\]/gi, '')
      .replace(/\[where\?\]/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    console.log(`✅ Extracted ${text.length} characters`);

    // Save to cache
    fs.writeFileSync(OUTPUT_FILE, text, 'utf8');

    // Get stats
    const sentences = text.split(/[.!?]+\s+/).filter(s => s.trim().length > 10);
    const words = text.split(/\s+/).length;
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;

    console.log('');
    console.log('✅ Biography extracted successfully!');
    console.log(`📄 File: ${OUTPUT_FILE}`);
    console.log(`📊 Stats:`);
    console.log(`   - Characters: ${text.length.toLocaleString()}`);
    console.log(`   - Words: ${words.toLocaleString()}`);
    console.log(`   - Sentences: ${sentences.length.toLocaleString()}`);
    console.log(`   - Paragraphs: ${paragraphs.toLocaleString()}`);
    console.log('');
    console.log('🎯 Next steps:');
    console.log('   1. Review: cat cache/jose-hernandez-original.txt');
    console.log('   2. Create narrative structure (Step 2.5)');
    console.log('   3. Create background + hook (Steps 3-3.5)');
    console.log('   4. Simplify: node scripts/simplify-jose-hernandez.js A1');
    console.log('');

  } catch (error) {
    console.error('❌ Error fetching biography:', error);
    console.log('');
    console.log('📝 Manual fallback:');
    console.log('   1. Visit:', WIKIPEDIA_URL);
    console.log('   2. Copy biography section text');
    console.log('   3. Save to:', OUTPUT_FILE);
    process.exit(1);
  }
}

// Run the fetch
fetchJoseHernandez();

