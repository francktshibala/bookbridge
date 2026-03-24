/**
 * Seed quiz questions for 5 books via POST /api/quiz/generate
 * Usage: node scripts/seed-quiz-questions.js
 * Requires: local dev server running on http://localhost:3000
 * Requires: valid session cookie (copy from browser DevTools after logging in)
 */

const fs = require('fs')
const path = require('path')

// ─── PASTE YOUR SESSION COOKIE HERE ──────────────────────────────────────────
// 1. Log in to the app in your browser
// 2. Open DevTools → Application → Cookies → localhost:3000
// 3. Copy the value of `sb-*-auth-token` cookie and paste below
const SESSION_COOKIE = 'PASTE_YOUR_COOKIE_HERE'
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = 'http://localhost:3000'

const BOOKS = [
  {
    bookId: 'the-necklace',
    level: 'A1',
    textFile: 'cache/the-necklace-A1-simplified.txt'
  },
  {
    bookId: 'the-necklace',
    level: 'A2',
    textFile: 'cache/the-necklace-A2-simplified.txt'
  },
  {
    bookId: 'gift-of-the-magi',
    level: 'A1',
    textFile: 'cache/gift-of-the-magi-A1-simplified.txt'
  },
  {
    bookId: 'tell-tale-heart',
    level: 'A1',
    textFile: 'cache/tell-tale-heart-A1-simplified.txt'
  },
  {
    bookId: 'helen-keller',
    level: 'A1',
    textFile: 'cache/helen-keller-A1-simplified.txt'
  }
]

async function seedBook({ bookId, level, textFile }) {
  const fullPath = path.join(process.cwd(), textFile)

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Skipping ${bookId} ${level} — file not found: ${textFile}`)
    return
  }

  const bookText = fs.readFileSync(fullPath, 'utf-8').trim()

  console.log(`\n📖 Generating quiz: ${bookId} (${level})...`)

  try {
    const res = await fetch(`${BASE_URL}/api/quiz/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': SESSION_COOKIE
      },
      body: JSON.stringify({ bookId, level, bookText })
    })

    const data = await res.json()

    if (res.status === 409) {
      console.log(`  ✅ Already exists — skipping`)
      return
    }

    if (!res.ok) {
      console.log(`  ❌ Failed (${res.status}): ${data.error}`)
      return
    }

    console.log(`  ✅ Created quiz with ${data.quiz.questions.length} questions`)
  } catch (err) {
    console.log(`  ❌ Error: ${err.message}`)
  }
}

async function main() {
  if (SESSION_COOKIE === 'PASTE_YOUR_COOKIE_HERE') {
    console.error('❌ You must paste your session cookie before running this script.')
    console.error('   See instructions at the top of the file.')
    process.exit(1)
  }

  console.log('🌱 Seeding quiz questions for 5 books...')

  for (const book of BOOKS) {
    await seedBook(book)
    // Small delay to avoid hammering the API
    await new Promise(r => setTimeout(r, 1000))
  }

  console.log('\n✅ Done! Check your Supabase quizzes table to verify.')
}

main()
