#!/usr/bin/env tsx

// Test script for usage tracking middleware
import { UsageTrackingMiddleware } from '../lib/middleware/usage-tracking';

async function testUsageTracking() {
  console.log('🧪 Testing Usage Tracking Middleware...\n');

  // Test book data extraction
  console.log('📖 Testing book data extraction:');
  
  const testCases = [
    {
      name: 'Gutenberg book',
      bookId: 'gutenberg-12345',
      bookContext: 'Book: Pride and Prejudice by Jane Austen\n\nExcerpts...',
      expected: { bookSource: 'gutenberg', bookTitle: 'Pride and Prejudice' }
    },
    {
      name: 'OpenLibrary book',
      bookId: 'openlibrary-OL123456M',
      bookContext: 'Book: 1984 by George Orwell\n\nExcerpts...',
      expected: { bookSource: 'openlibrary', bookTitle: '1984' }
    },
    {
      name: 'Google Books',
      bookId: 'gbook-abc123',
      bookContext: 'Book: The Great Gatsby by F. Scott Fitzgerald\n\nExcerpts...',
      expected: { bookSource: 'googlebooks', bookTitle: 'The Great Gatsby' }
    },
    {
      name: 'Uploaded book (UUID)',
      bookId: '123e4567-e89b-12d3-a456-426614174000',
      bookContext: 'Book: Custom Book by Author Name\n\nExcerpts...',
      expected: { bookSource: 'uploaded', bookTitle: 'Custom Book' }
    },
    {
      name: 'No book context',
      bookId: 'gutenberg-12345',
      bookContext: undefined,
      expected: { bookSource: 'gutenberg', bookTitle: undefined }
    }
  ];

  for (const testCase of testCases) {
    const result = UsageTrackingMiddleware.extractBookData(testCase.bookId, testCase.bookContext);
    
    console.log(`  ✓ ${testCase.name}:`);
    console.log(`    Input: bookId="${testCase.bookId}", context="${testCase.bookContext?.substring(0, 50)}..."`);
    console.log(`    Output: source="${result.bookSource}", title="${result.bookTitle}"`);
    console.log(`    Expected: source="${testCase.expected.bookSource}", title="${testCase.expected.bookTitle}"`);
    
    const sourceMatch = result.bookSource === testCase.expected.bookSource;
    const titleMatch = result.bookTitle === testCase.expected.bookTitle;
    
    if (sourceMatch && titleMatch) {
      console.log(`    ✅ PASS\n`);
    } else {
      console.log(`    ❌ FAIL - Source: ${sourceMatch ? '✓' : '✗'}, Title: ${titleMatch ? '✓' : '✗'}\n`);
    }
  }

  console.log('🔄 Testing usage check scenarios:');
  
  // Mock scenarios - these would need real database data to test fully
  const scenarios = [
    'Free user with 0 analyses (should allow)',
    'Free user with 3 analyses (should deny)',
    'Premium user (should always allow)',
    'Free user with public domain book (should allow)',
    'Student user (should always allow)'
  ];

  scenarios.forEach(scenario => {
    console.log(`  📋 ${scenario} - requires database connection to test`);
  });

  console.log('\n✅ Basic middleware logic tests completed!');
  console.log('📝 Note: Full integration tests require database connection and user authentication.');
}

// Run the test
if (require.main === module) {
  testUsageTracking().catch(console.error);
}

export { testUsageTracking };