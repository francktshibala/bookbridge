// Simple test script to trigger book processing
async function processBooks() {
  try {
    console.log('🚀 Starting book processing...')
    
    const response = await fetch('http://localhost:3002/api/admin/process-books', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'process-all' })
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log('✅ Processing started:', result)
    } else {
      console.log('❌ Processing failed:', response.status, await response.text())
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

processBooks()