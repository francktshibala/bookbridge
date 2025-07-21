import { prisma } from './prisma'

export interface BookTheme {
  bookId: string
  bookTitle: string
  themes: string[]
  topics: string[]
  concepts: string[]
  userInteractionCount: number
  userQuestions: string[]
}

export interface CrossBookConnection {
  sourceBookId: string
  targetBookId: string
  sharedThemes: string[]
  sharedTopics: string[]
  connectionStrength: number // 0-1
  connectionType: 'thematic' | 'conceptual' | 'character' | 'literary-device'
}

export interface UserReadingPattern {
  userId: string
  books: BookTheme[]
  connections: CrossBookConnection[]
  dominantThemes: string[]
  exploredConcepts: string[]
  lastAnalyzed: Date
}

export class CrossBookConnectionsService {

  async analyzeUserReadingPatterns(userId: string): Promise<UserReadingPattern> {
    // Get all conversations for this user across all books
    const conversations = await prisma.conversation.findMany({
      where: { userId },
      include: {
        book: true,
        messages: {
          where: { sender: 'user' },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (conversations.length === 0) {
      return {
        userId,
        books: [],
        connections: [],
        dominantThemes: [],
        exploredConcepts: [],
        lastAnalyzed: new Date()
      }
    }

    // Group conversations by book and analyze themes
    const booksMap = new Map<string, BookTheme>()
    
    for (const conv of conversations) {
      const bookId = conv.bookId
      const bookTitle = conv.book.title
      
      if (!booksMap.has(bookId)) {
        booksMap.set(bookId, {
          bookId,
          bookTitle,
          themes: [],
          topics: [],
          concepts: [],
          userInteractionCount: 0,
          userQuestions: []
        })
      }
      
      const bookTheme = booksMap.get(bookId)!
      bookTheme.userInteractionCount += conv.messages.length
      
      // Extract themes and topics from user messages
      conv.messages.forEach(message => {
        bookTheme.userQuestions.push(message.content)
        const extractedThemes = this.extractThemes(message.content)
        const extractedTopics = this.extractTopics(message.content)
        const extractedConcepts = this.extractConcepts(message.content)
        
        bookTheme.themes.push(...extractedThemes)
        bookTheme.topics.push(...extractedTopics)
        bookTheme.concepts.push(...extractedConcepts)
      })
      
      // Remove duplicates
      bookTheme.themes = [...new Set(bookTheme.themes)]
      bookTheme.topics = [...new Set(bookTheme.topics)]
      bookTheme.concepts = [...new Set(bookTheme.concepts)]
    }

    const books = Array.from(booksMap.values())
    
    // Find connections between books
    const connections = this.findCrossBookConnections(books)
    
    // Identify dominant themes across all books
    const allThemes = books.flatMap(book => book.themes)
    const dominantThemes = this.findDominantPatterns(allThemes, 2) // themes appearing in 2+ books
    
    // Identify explored concepts
    const allConcepts = books.flatMap(book => book.concepts)
    const exploredConcepts = this.findDominantPatterns(allConcepts, 1) // concepts user has engaged with

    return {
      userId,
      books,
      connections,
      dominantThemes,
      exploredConcepts,
      lastAnalyzed: new Date()
    }
  }

  private extractThemes(text: string): string[] {
    const themeKeywords = {
      'love': ['love', 'romance', 'relationship', 'romantic', 'passion', 'heart'],
      'death': ['death', 'dying', 'mortality', 'kill', 'murder', 'suicide'],
      'power': ['power', 'authority', 'control', 'dominance', 'rule', 'leadership'],
      'identity': ['identity', 'self', 'who am i', 'personality', 'character development'],
      'family': ['family', 'parents', 'mother', 'father', 'siblings', 'relatives'],
      'friendship': ['friendship', 'friend', 'companionship', 'loyalty', 'trust'],
      'betrayal': ['betrayal', 'deceive', 'lie', 'backstab', 'unfaithful'],
      'redemption': ['redemption', 'forgiveness', 'second chance', 'salvation'],
      'coming-of-age': ['growing up', 'maturity', 'childhood', 'adolescence', 'teenager'],
      'good-vs-evil': ['good', 'evil', 'moral', 'ethics', 'right', 'wrong'],
      'freedom': ['freedom', 'liberty', 'independence', 'escape', 'prison'],
      'justice': ['justice', 'fairness', 'law', 'punishment', 'crime'],
      'survival': ['survival', 'survive', 'endure', 'persevere', 'struggle'],
      'sacrifice': ['sacrifice', 'give up', 'selfless', 'martyrdom'],
      'nature': ['nature', 'environment', 'natural', 'wilderness', 'earth']
    }

    const content = text.toLowerCase()
    const foundThemes: string[] = []

    Object.entries(themeKeywords).forEach(([theme, keywords]) => {
      if (keywords.some(keyword => content.includes(keyword))) {
        foundThemes.push(theme)
      }
    })

    return foundThemes
  }

  private extractTopics(text: string): string[] {
    const topicKeywords = {
      'character-analysis': ['character', 'protagonist', 'antagonist', 'personality', 'motivation'],
      'plot': ['plot', 'story', 'narrative', 'events', 'storyline'],
      'setting': ['setting', 'place', 'location', 'time period', 'atmosphere'],
      'symbolism': ['symbol', 'metaphor', 'represent', 'meaning', 'significance'],
      'literary-devices': ['irony', 'foreshadowing', 'allegory', 'imagery', 'tone'],
      'historical-context': ['history', 'historical', 'time period', 'era', 'context'],
      'social-issues': ['society', 'social', 'class', 'inequality', 'discrimination'],
      'psychology': ['psychology', 'mental', 'emotion', 'behavior', 'mind'],
      'philosophy': ['philosophy', 'meaning of life', 'existence', 'morality', 'ethics'],
      'religion': ['religion', 'god', 'faith', 'spiritual', 'divine'],
      'war': ['war', 'battle', 'conflict', 'soldier', 'violence'],
      'technology': ['technology', 'science', 'invention', 'progress', 'future']
    }

    const content = text.toLowerCase()
    const foundTopics: string[] = []

    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => content.includes(keyword))) {
        foundTopics.push(topic)
      }
    })

    return foundTopics
  }

  private extractConcepts(text: string): string[] {
    const conceptKeywords = {
      'tragic-hero': ['tragic hero', 'downfall', 'fatal flaw', 'hubris'],
      'unreliable-narrator': ['narrator', 'perspective', 'point of view', 'reliability'],
      'bildungsroman': ['coming of age', 'growth', 'development', 'maturation'],
      'stream-of-consciousness': ['thoughts', 'consciousness', 'inner mind', 'mental flow'],
      'dystopia': ['dystopia', 'totalitarian', 'oppressive society', 'surveillance'],
      'allegory': ['allegory', 'hidden meaning', 'symbolic story', 'deeper meaning'],
      'existentialism': ['existential', 'meaning', 'purpose', 'absurd', 'authentic'],
      'modernism': ['modern', 'experimental', 'fragmented', 'innovative'],
      'romanticism': ['romantic', 'emotion', 'nature', 'individual', 'imagination'],
      'realism': ['realistic', 'everyday life', 'ordinary', 'truthful'],
      'feminism': ['feminist', 'women', 'gender', 'patriarchy', 'equality'],
      'postcolonialism': ['colonial', 'empire', 'indigenous', 'cultural identity']
    }

    const content = text.toLowerCase()
    const foundConcepts: string[] = []

    Object.entries(conceptKeywords).forEach(([concept, keywords]) => {
      if (keywords.some(keyword => content.includes(keyword))) {
        foundConcepts.push(concept)
      }
    })

    return foundConcepts
  }

  private findCrossBookConnections(books: BookTheme[]): CrossBookConnection[] {
    const connections: CrossBookConnection[] = []

    for (let i = 0; i < books.length; i++) {
      for (let j = i + 1; j < books.length; j++) {
        const book1 = books[i]
        const book2 = books[j]
        
        const sharedThemes = book1.themes.filter(theme => book2.themes.includes(theme))
        const sharedTopics = book1.topics.filter(topic => book2.topics.includes(topic))
        const sharedConcepts = book1.concepts.filter(concept => book2.concepts.includes(concept))
        
        if (sharedThemes.length > 0 || sharedTopics.length > 0 || sharedConcepts.length > 0) {
          // Calculate connection strength based on shared elements
          const totalShared = sharedThemes.length + sharedTopics.length + sharedConcepts.length
          const totalPossible = Math.max(
            book1.themes.length + book1.topics.length + book1.concepts.length,
            book2.themes.length + book2.topics.length + book2.concepts.length
          )
          
          const connectionStrength = Math.min(totalShared / Math.max(totalPossible, 1), 1)
          
          // Determine connection type
          let connectionType: 'thematic' | 'conceptual' | 'character' | 'literary-device' = 'thematic'
          if (sharedConcepts.length > sharedThemes.length) {
            connectionType = 'conceptual'
          } else if (sharedTopics.some(topic => topic.includes('character'))) {
            connectionType = 'character'
          } else if (sharedTopics.some(topic => topic.includes('literary'))) {
            connectionType = 'literary-device'
          }
          
          connections.push({
            sourceBookId: book1.bookId,
            targetBookId: book2.bookId,
            sharedThemes,
            sharedTopics,
            connectionStrength,
            connectionType
          })
        }
      }
    }

    // Sort by connection strength (strongest first)
    return connections.sort((a, b) => b.connectionStrength - a.connectionStrength)
  }

  private findDominantPatterns(items: string[], minOccurrences: number = 2): string[] {
    const counts = new Map<string, number>()
    
    items.forEach(item => {
      counts.set(item, (counts.get(item) || 0) + 1)
    })
    
    return Array.from(counts.entries())
      .filter(([_, count]) => count >= minOccurrences)
      .sort((a, b) => b[1] - a[1])
      .map(([item, _]) => item)
  }

  async getConnectionsForCurrentQuestion(userId: string, currentQuery: string, currentBookId: string): Promise<{
    relevantConnections: CrossBookConnection[]
    suggestedContext: string[]
  }> {
    const patterns = await this.analyzeUserReadingPatterns(userId)
    
    // Extract themes/topics from current query
    const queryThemes = this.extractThemes(currentQuery)
    const queryTopics = this.extractTopics(currentQuery)
    const queryConcepts = this.extractConcepts(currentQuery)
    
    // Find connections to other books based on current query
    const relevantConnections = patterns.connections.filter(conn => {
      const isCurrentBook = conn.sourceBookId === currentBookId || conn.targetBookId === currentBookId
      if (!isCurrentBook) return false
      
      const hasSharedElements = 
        conn.sharedThemes.some(theme => queryThemes.includes(theme)) ||
        conn.sharedTopics.some(topic => queryTopics.includes(topic))
      
      return hasSharedElements
    })
    
    // Generate contextual suggestions
    const suggestedContext: string[] = []
    
    relevantConnections.forEach(conn => {
      const otherBookId = conn.sourceBookId === currentBookId ? conn.targetBookId : conn.sourceBookId
      const otherBook = patterns.books.find(book => book.bookId === otherBookId)
      
      if (otherBook) {
        if (conn.sharedThemes.length > 0) {
          suggestedContext.push(
            `You've explored similar themes (${conn.sharedThemes.join(', ')}) in "${otherBook.bookTitle}"`
          )
        }
        if (conn.sharedTopics.length > 0) {
          suggestedContext.push(
            `You've discussed related topics (${conn.sharedTopics.join(', ')}) when reading "${otherBook.bookTitle}"`
          )
        }
      }
    })
    
    return {
      relevantConnections,
      suggestedContext
    }
  }
}

export const crossBookConnectionsService = new CrossBookConnectionsService()