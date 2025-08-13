// Priority books selection for precomputing
// Based on Project Gutenberg top downloads + ESL learning value

const PRIORITY_BOOKS = [
  // Top Downloaded Classics - Great for ESL
  { id: 'gutenberg-1342', title: 'Pride and Prejudice', author: 'Jane Austen', era: 'victorian', difficulty: ['A2', 'B1', 'B2'] },
  { id: 'gutenberg-11', title: 'Alice\'s Adventures in Wonderland', author: 'Lewis Carroll', era: 'victorian', difficulty: ['A1', 'A2', 'B1'] },
  { id: 'gutenberg-84', title: 'Frankenstein', author: 'Mary Wollstonecraft Shelley', era: 'victorian', difficulty: ['B1', 'B2', 'C1'] },
  { id: 'gutenberg-37106', title: 'Little Women', author: 'Louisa May Alcott', era: 'american-19c', difficulty: ['A2', 'B1', 'B2'] },
  
  // Shakespeare - Early Modern (most challenging)
  { id: 'gutenberg-1513', title: 'Romeo and Juliet', author: 'William Shakespeare', era: 'early-modern', difficulty: ['B2', 'C1', 'C2'] },
  { id: 'gutenberg-100', title: 'The Complete Works of William Shakespeare', author: 'William Shakespeare', era: 'early-modern', difficulty: ['B2', 'C1', 'C2'] },
  
  // Adventure Stories - Engaging for learners
  { id: 'gutenberg-74', title: 'The Adventures of Tom Sawyer', author: 'Mark Twain', era: 'american-19c', difficulty: ['A2', 'B1', 'B2'] },
  { id: 'gutenberg-76', title: 'Adventures of Huckleberry Finn', author: 'Mark Twain', era: 'american-19c', difficulty: ['B1', 'B2', 'C1'] },
  { id: 'gutenberg-2701', title: 'Moby Dick', author: 'Herman Melville', era: 'american-19c', difficulty: ['B2', 'C1', 'C2'] },
  
  // Shorter Works - Good for beginners
  { id: 'gutenberg-1661', title: 'The Adventures of Sherlock Holmes', author: 'Arthur Conan Doyle', era: 'victorian', difficulty: ['A2', 'B1', 'B2'] },
  { id: 'gutenberg-43', title: 'The Strange Case of Dr. Jekyll and Mr. Hyde', author: 'Robert Louis Stevenson', era: 'victorian', difficulty: ['B1', 'B2', 'C1'] },
  { id: 'gutenberg-174', title: 'The Picture of Dorian Gray', author: 'Oscar Wilde', era: 'victorian', difficulty: ['B2', 'C1', 'C2'] },
  
  // Modern English - Easier for ESL
  { id: 'gutenberg-55', title: 'The Wonderful Wizard of Oz', author: 'L. Frank Baum', era: 'modern', difficulty: ['A1', 'A2', 'B1'] },
  { id: 'gutenberg-35', title: 'The Time Machine', author: 'H. G. Wells', era: 'modern', difficulty: ['A2', 'B1', 'B2'] },
  { id: 'gutenberg-36', title: 'The War of the Worlds', author: 'H. G. Wells', era: 'modern', difficulty: ['B1', 'B2', 'C1'] },
  
  // Romance & Social Novels
  { id: 'gutenberg-145', title: 'Middlemarch', author: 'George Eliot', era: 'victorian', difficulty: ['B2', 'C1', 'C2'] },
  { id: 'gutenberg-2641', title: 'A Room with a View', author: 'E. M. Forster', era: 'modern', difficulty: ['B1', 'B2', 'C1'] },
  { id: 'gutenberg-394', title: 'Cranford', author: 'Elizabeth Cleghorn Gaskell', era: 'victorian', difficulty: ['B1', 'B2', 'C1'] },
  
  // Philosophy & Non-fiction (for advanced learners)
  { id: 'gutenberg-205', title: 'Walden', author: 'Henry David Thoreau', era: 'american-19c', difficulty: ['B2', 'C1', 'C2'] },
  { id: 'gutenberg-16389', title: 'The Enchanted April', author: 'Elizabeth Von Arnim', era: 'modern', difficulty: ['A2', 'B1', 'B2'] }
];

// Statistics
const getBookStats = () => {
  const totalBooks = PRIORITY_BOOKS.length;
  const eraBreakdown = {};
  const difficultyBreakdown = {};
  
  PRIORITY_BOOKS.forEach(book => {
    eraBreakdown[book.era] = (eraBreakdown[book.era] || 0) + 1;
    book.difficulty.forEach(level => {
      difficultyBreakdown[level] = (difficultyBreakdown[level] || 0) + 1;
    });
  });
  
  return { totalBooks, eraBreakdown, difficultyBreakdown };
};

// Export for use in other scripts
module.exports = { PRIORITY_BOOKS, getBookStats };

// If run directly, show stats
if (require.main === module) {
  console.log('📚 PRIORITY BOOKS FOR PRECOMPUTING');
  console.log('==================================');
  
  const stats = getBookStats();
  console.log(`\nTotal Books: ${stats.totalBooks}\n`);
  
  console.log('📊 Era Breakdown:');
  Object.entries(stats.eraBreakdown).forEach(([era, count]) => {
    console.log(`  ${era}: ${count} books`);
  });
  
  console.log('\n🎯 CEFR Level Coverage:');
  Object.entries(stats.difficultyBreakdown).forEach(([level, count]) => {
    console.log(`  ${level}: ${count} books`);
  });
  
  console.log('\n📖 Book List:');
  PRIORITY_BOOKS.forEach((book, i) => {
    console.log(`${i + 1}. ${book.title} by ${book.author}`);
    console.log(`   ID: ${book.id} | Era: ${book.era} | Levels: ${book.difficulty.join(', ')}`);
    console.log('');
  });
}