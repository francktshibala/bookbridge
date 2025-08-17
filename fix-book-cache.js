// Fix book cache - clear and reprocess
async function fixBookCache() {
  const bookId = 'ac3bf0f7-db2d-45cf-a994-e824e4146fe9' // Gibbon's book
  
  try {
    // Clear cache
    console.log('Clearing cache...')
    const clearResponse = await fetch(`http://localhost:3000/api/books/${bookId}/content-fast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear-cache' })
    })
    console.log('Clear result:', clearResponse.status)
    
    // Trigger reprocessing
    console.log('Triggering reprocess...')
    const processResponse = await fetch(`http://localhost:3000/api/books/${bookId}/content-fast`, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'process' })
    })
    console.log('Process result:', processResponse.status)
    
  } catch (error) {
    console.error('Error:', error.message)
  }
}

console.log('Note: You need to be logged in to BookBridge in your browser')
console.log('Copy-paste this in your browser console while on the BookBridge site:')
console.log(`
fetch('/api/books/ac3bf0f7-db2d-45cf-a994-e824e4146fe9/content-fast', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'clear-cache' })
}).then(() => console.log('Cache cleared!'))
`)