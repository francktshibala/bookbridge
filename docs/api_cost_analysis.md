# OpenAI API Cost Analysis for BookBridge

## Monthly Cost Projections

### Month 1 (500 MAU)
- Free users: 400 (80%)
- Premium users: 100 (20%)

**Token Usage Estimates:**
- Average question: 150 input tokens + 300 output tokens
- Free user: 45 questions/month = 6,750 input + 13,500 output tokens
- Premium user: 150 questions/month = 22,500 input + 45,000 output tokens

**GPT-4o Costs:**
- Free users: 400 × ($0.017 + $0.135) = $60.80
- Premium users: 100 × ($0.056 + $0.450) = $50.60
- **Total Month 1 (GPT-4o): $111.40**

**GPT-3.5-turbo Costs:**
- Free users: 400 × ($0.003 + $0.020) = $9.20
- Premium users: 100 × ($0.011 + $0.068) = $7.90
- **Total Month 1 (GPT-3.5): $17.10**

### Month 6 (5,000 MAU)
- Free users: 4,000 (80%)
- Premium users: 1,000 (20%)

**GPT-4o Costs:**
- Free users: 4,000 × ($0.017 + $0.135) = $608
- Premium users: 1,000 × ($0.056 + $0.450) = $506
- **Total Month 6 (GPT-4o): $1,114**

**GPT-3.5-turbo Costs:**
- Free users: 4,000 × ($0.003 + $0.020) = $92
- Premium users: 1,000 × ($0.011 + $0.068) = $79
- **Total Month 6 (GPT-3.5): $171**

## Cost Reduction with Caching

With 80% cache hit rate:
- Month 1 (GPT-4o): $22.28
- Month 6 (GPT-4o): $222.80
- Month 1 (GPT-3.5): $3.42
- Month 6 (GPT-3.5): $34.20