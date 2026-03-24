/**
 * Seed quiz questions for 5 books
 * Uses Supabase service role + Anthropic SDK directly — no cookie needed
 * Usage: node scripts/seed-quiz-questions.js
 */

require('dotenv').config({ path: '.env.local' })

const fs   = require('fs')
const path = require('path')

const SUPABASE_URL       = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANTHROPIC_API_KEY  = process.env.ANTHROPIC_API_KEY

const BOOKS = [
  { bookId: 'the-necklace',    level: 'A1', textFile: 'cache/the-necklace-A1-simplified.txt' },
  { bookId: 'the-necklace',    level: 'A2', textFile: 'cache/the-necklace-A2-simplified.txt' },
  { bookId: 'gift-of-the-magi',level: 'A1', textFile: 'cache/gift-of-the-magi-A1-simplified.txt' },
  { bookId: 'tell-tale-heart', level: 'A1', textFile: 'cache/tell-tale-heart-A1-simplified.txt' },
  { bookId: 'helen-keller',    level: 'A1', textFile: 'cache/helen-keller-A1-simplified.txt' },
]

async function supabaseRequest(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...options.headers
    }
  })
  const text = await res.text()
  return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : null }
}

async function generateQuestions(bookText, level) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `You are an ESL quiz generator. Generate exactly 5 multiple-choice reading comprehension questions at the ${level} CEFR level based on the text below.

Rules:
- Questions must be answerable from the text only
- Use simple vocabulary appropriate for ${level} learners
- Each question must have exactly 3 wrong answers that are plausible but clearly incorrect
- Return ONLY a valid JSON array, no extra text

Format:
[
  {
    "question_text": "...",
    "correct_answer": "...",
    "wrong_answers": ["...", "...", "..."]
  }
]

Text:
${bookText.slice(0, 3000)}`
      }]
    })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${JSON.stringify(data)}`)
  const raw = data.content?.[0]?.text || ''
  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  return JSON.parse(cleaned)
}

async function seedBook({ bookId, level, textFile }) {
  const fullPath = path.join(process.cwd(), textFile)
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Skipping ${bookId} ${level} — file not found: ${textFile}`)
    return
  }

  // Check if quiz already exists
  const existing = await supabaseRequest(
    `/quizzes?book_id=eq.${bookId}&cefr_level=eq.${level}&select=id`
  )
  if (existing.data?.length > 0) {
    console.log(`  ✅ Already exists — skipping`)
    return
  }

  const bookText = fs.readFileSync(fullPath, 'utf-8').trim()
  console.log(`\n📖 Generating quiz: ${bookId} (${level})...`)

  // Generate questions via Claude
  let questions
  try {
    questions = await generateQuestions(bookText, level)
  } catch (err) {
    console.log(`  ❌ Claude error: ${err.message}`)
    return
  }

  // Insert quiz
  const quizRes = await supabaseRequest('/quizzes', {
    method: 'POST',
    body: JSON.stringify({ book_id: bookId, cefr_level: level })
  })
  if (!quizRes.ok) {
    console.log(`  ❌ Failed to insert quiz: ${JSON.stringify(quizRes.data)}`)
    return
  }
  const quiz = quizRes.data[0]

  // Insert questions and answers
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]

    const qRes = await supabaseRequest('/questions', {
      method: 'POST',
      body: JSON.stringify({
        quiz_id: quiz.id,
        question_text: q.question_text,
        correct_answer: q.correct_answer,
        position: i
      })
    })
    if (!qRes.ok) {
      console.log(`  ❌ Failed to insert question ${i}: ${JSON.stringify(qRes.data)}`)
      continue
    }
    const question = qRes.data[0]

    const answers = [
      { question_id: question.id, answer_text: q.correct_answer, is_correct: true },
      ...q.wrong_answers.map(a => ({ question_id: question.id, answer_text: a, is_correct: false }))
    ]
    await supabaseRequest('/answers', {
      method: 'POST',
      body: JSON.stringify(answers)
    })
  }

  console.log(`  ✅ Created quiz with ${questions.length} questions`)
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANTHROPIC_API_KEY) {
    console.error('❌ Missing env vars. Make sure .env.local has NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY')
    process.exit(1)
  }

  console.log('🌱 Seeding quiz questions for 5 books...')
  for (const book of BOOKS) {
    await seedBook(book)
    await new Promise(r => setTimeout(r, 800))
  }
  console.log('\n✅ Done!')
}

main()
