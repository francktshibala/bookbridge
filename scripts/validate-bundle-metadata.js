/**
 * Validate Bundle Metadata
 *
 * Purpose: Catch common mistakes in bundle metadata before database integration
 * Run: node scripts/validate-bundle-metadata.js cache/{story-id}-{level}-bundles-metadata.json
 *
 * Checks:
 * 1. Duplicate sentence indices (causes React "duplicate key" errors)
 * 2. Header text in sentence timings (causes sync issues)
 * 3. Missing required fields
 * 4. Invalid timing values
 */

import fs from 'fs';
import path from 'path';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function error(msg) {
  console.error(`${RED}❌ ${msg}${RESET}`);
}

function success(msg) {
  console.log(`${GREEN}✅ ${msg}${RESET}`);
}

function warning(msg) {
  console.warn(`${YELLOW}⚠️  ${msg}${RESET}`);
}

function validateBundleMetadata(metadataPath) {
  console.log('\n🔍 Validating Bundle Metadata...\n');

  // Check file exists
  if (!fs.existsSync(metadataPath)) {
    error(`Metadata file not found: ${metadataPath}`);
    process.exit(1);
  }

  // Load metadata
  let metadata;
  try {
    metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  } catch (err) {
    error(`Failed to parse metadata JSON: ${err.message}`);
    process.exit(1);
  }

  if (!Array.isArray(metadata) || metadata.length === 0) {
    error('Metadata is not an array or is empty');
    process.exit(1);
  }

  console.log(`📦 Found ${metadata.length} bundles\n`);

  let hasErrors = false;

  // Check 1: Duplicate sentence indices
  console.log('🔍 Check 1: Duplicate Sentence Indices');
  const seenIndices = new Set();
  const duplicates = [];

  metadata.forEach((bundle, bundleIdx) => {
    if (!bundle.sentences || !Array.isArray(bundle.sentences)) {
      error(`Bundle ${bundleIdx}: Missing or invalid 'sentences' array`);
      hasErrors = true;
      return;
    }

    bundle.sentences.forEach((sent, sentIdx) => {
      if (typeof sent.sentenceIndex !== 'number') {
        error(`Bundle ${bundleIdx}, Sentence ${sentIdx}: Missing or invalid 'sentenceIndex'`);
        hasErrors = true;
        return;
      }

      if (seenIndices.has(sent.sentenceIndex)) {
        duplicates.push(sent.sentenceIndex);
        error(`DUPLICATE sentenceIndex: ${sent.sentenceIndex} (Bundle ${bundleIdx}, Sentence ${sentIdx})`);
        hasErrors = true;
      }
      seenIndices.add(sent.sentenceIndex);
    });
  });

  if (duplicates.length > 0) {
    error(`Found ${duplicates.length} duplicate sentence indices`);
    console.log(`\n${RED}💡 Fix: Change sentenceIndex calculation in bundle generation script:`);
    console.log(`   ❌ WRONG: sentenceIndex: idx (local index)`);
    console.log(`   ✅ CORRECT: sentenceIndex: (bundle.index * SENTENCES_PER_BUNDLE) + idx${RESET}\n`);
    hasErrors = true;
  } else {
    success('No duplicate sentence indices found');
  }

  // Check 2: Verify indices are sequential
  console.log('\n🔍 Check 2: Sequential Sentence Indices');
  const sortedIndices = Array.from(seenIndices).sort((a, b) => a - b);
  let expectedIndex = 0;
  const gaps = [];

  sortedIndices.forEach(index => {
    if (index !== expectedIndex) {
      gaps.push(`Expected ${expectedIndex}, found ${index}`);
    }
    expectedIndex = index + 1;
  });

  if (gaps.length > 0) {
    warning(`Found ${gaps.length} gaps in sentence indices:`);
    gaps.slice(0, 5).forEach(gap => warning(gap));
    if (gaps.length > 5) {
      warning(`... and ${gaps.length - 5} more gaps`);
    }
  } else {
    success('Sentence indices are sequential (0, 1, 2, ...)');
  }

  // Check 3: Header text in sentence timings
  console.log('\n🔍 Check 3: Header Text in Sentence Timings');
  const firstBundle = metadata[0];
  if (firstBundle && firstBundle.sentences && firstBundle.sentences[0]) {
    const firstText = firstBundle.sentences[0].text || '';
    if (firstText.includes('About This Story')) {
      error('Found "About This Story" in first sentence timing');
      console.log(`   Text: "${firstText.substring(0, 100)}..."`);
      console.log(`\n${RED}💡 Fix: Strip header BEFORE audio generation:`);
      console.log(`   combinedText = combinedText.replace(/^About This Story\\s*\\n+/i, '').trim();${RESET}\n`);
      hasErrors = true;
    } else {
      success('First sentence does not contain header text');
    }
  }

  // Check 4: Required fields in each sentence
  console.log('\n🔍 Check 4: Required Fields in Sentence Timings');
  let missingFields = 0;
  const requiredFields = ['text', 'startTime', 'endTime', 'duration', 'sentenceIndex'];

  metadata.forEach((bundle, bundleIdx) => {
    bundle.sentences?.forEach((sent, sentIdx) => {
      requiredFields.forEach(field => {
        if (sent[field] === undefined || sent[field] === null) {
          error(`Bundle ${bundleIdx}, Sentence ${sentIdx}: Missing '${field}'`);
          missingFields++;
          hasErrors = true;
        }
      });
    });
  });

  if (missingFields === 0) {
    success('All sentences have required fields (text, startTime, endTime, duration, sentenceIndex)');
  } else {
    error(`Found ${missingFields} missing fields`);
  }

  // Check 5: Timing values are valid
  console.log('\n🔍 Check 5: Timing Values Validity');
  let invalidTimings = 0;

  metadata.forEach((bundle, bundleIdx) => {
    bundle.sentences?.forEach((sent, sentIdx) => {
      // Check timing values are numbers
      if (typeof sent.startTime !== 'number' || isNaN(sent.startTime)) {
        error(`Bundle ${bundleIdx}, Sentence ${sentIdx}: Invalid startTime: ${sent.startTime}`);
        invalidTimings++;
        hasErrors = true;
      }

      if (typeof sent.endTime !== 'number' || isNaN(sent.endTime)) {
        error(`Bundle ${bundleIdx}, Sentence ${sentIdx}: Invalid endTime: ${sent.endTime}`);
        invalidTimings++;
        hasErrors = true;
      }

      if (typeof sent.duration !== 'number' || isNaN(sent.duration)) {
        error(`Bundle ${bundleIdx}, Sentence ${sentIdx}: Invalid duration: ${sent.duration}`);
        invalidTimings++;
        hasErrors = true;
      }

      // Check logical consistency
      if (sent.endTime < sent.startTime) {
        error(`Bundle ${bundleIdx}, Sentence ${sentIdx}: endTime (${sent.endTime}) < startTime (${sent.startTime})`);
        invalidTimings++;
        hasErrors = true;
      }

      if (Math.abs((sent.endTime - sent.startTime) - sent.duration) > 0.01) {
        warning(`Bundle ${bundleIdx}, Sentence ${sentIdx}: duration mismatch: ${sent.duration} vs ${sent.endTime - sent.startTime}`);
      }
    });
  });

  if (invalidTimings === 0) {
    success('All timing values are valid');
  } else {
    error(`Found ${invalidTimings} invalid timing values`);
  }

  // Check 6: Total sentence count
  console.log('\n🔍 Check 6: Total Sentence Count');
  const totalSentences = metadata.reduce((sum, bundle) => {
    return sum + (bundle.sentences?.length || 0);
  }, 0);
  console.log(`   Total sentences across all bundles: ${totalSentences}`);
  console.log(`   Unique sentence indices: ${seenIndices.size}`);

  if (totalSentences !== seenIndices.size) {
    warning(`Mismatch: ${totalSentences} sentences but ${seenIndices.size} unique indices`);
  } else {
    success('Sentence count matches unique indices');
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  if (hasErrors) {
    error('VALIDATION FAILED - Fix errors before database integration');
    console.log(`\n${RED}⚠️  DO NOT proceed to database integration until all errors are fixed${RESET}\n`);
    process.exit(1);
  } else {
    success('VALIDATION PASSED - Metadata is valid');
    console.log(`\n${GREEN}✅ Safe to proceed to database integration${RESET}\n`);
    process.exit(0);
  }
}

// Main
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/validate-bundle-metadata.js <metadata-file-path>');
  console.error('Example: node scripts/validate-bundle-metadata.js cache/medical-crisis-1-A1-bundles-metadata.json');
  process.exit(1);
}

const metadataPath = args[0];
validateBundleMetadata(metadataPath);
