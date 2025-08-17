import { prisma } from './prisma'
import { Decimal } from '@prisma/client/runtime/library'

export interface LearningProfile {
  userId: string
  readingLevel: 'beginner' | 'intermediate' | 'advanced'
  comprehensionScore: number // 0-100
  preferredExplanationStyle: 'examples' | 'analogies' | 'step-by-step' | 'concise'
  averageResponseComplexity: number // 1-10
  totalInteractions: number
  successfulQueries: number
  strugglingTopics: string[]
  strongTopics: string[]
  lastUpdated: Date
}

export interface InteractionData {
  query: string
  response: string
  wasHelpful: boolean
  complexity: number
  topic?: string
  comprehensionLevel?: number
}

export class LearningProfileService {
  
  async getProfile(userId: string): Promise<LearningProfile | null> {
    // Get user's conversation history and analyze patterns
    const conversations = await prisma.conversation.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 50 // Analyze last 50 messages for profile
        }
      }
    })

    if (conversations.length === 0) {
      return this.createInitialProfile(userId)
    }

    return this.analyzeAndBuildProfile(userId, conversations)
  }

  private async createInitialProfile(userId: string): Promise<LearningProfile> {
    return {
      userId,
      readingLevel: 'intermediate',
      comprehensionScore: 50,
      preferredExplanationStyle: 'step-by-step',
      averageResponseComplexity: 5,
      totalInteractions: 0,
      successfulQueries: 0,
      strugglingTopics: [],
      strongTopics: [],
      lastUpdated: new Date()
    }
  }

  private async analyzeAndBuildProfile(userId: string, conversations: any[]): Promise<LearningProfile> {
    const allMessages = conversations.flatMap(conv => conv.messages)
    const userMessages = allMessages.filter(msg => msg.sender === 'user')
    const aiMessages = allMessages.filter(msg => msg.sender === 'assistant')

    // Analyze reading level from query complexity
    const readingLevel = this.analyzeReadingLevel(userMessages)
    
    // Calculate comprehension score from interaction patterns
    const comprehensionScore = this.calculateComprehensionScore(userMessages, aiMessages)
    
    // Detect preferred explanation style
    const preferredExplanationStyle = this.detectPreferredStyle(userMessages)
    
    // Calculate average response complexity needed
    const averageResponseComplexity = this.calculateAverageComplexity(aiMessages)
    
    // Extract topic patterns
    const { strugglingTopics, strongTopics } = await this.analyzeTopicPerformance(conversations)

    return {
      userId,
      readingLevel,
      comprehensionScore,
      preferredExplanationStyle,
      averageResponseComplexity,
      totalInteractions: userMessages.length,
      successfulQueries: Math.floor(userMessages.length * 0.8), // Placeholder
      strugglingTopics,
      strongTopics,
      lastUpdated: new Date()
    }
  }

  private analyzeReadingLevel(userMessages: any[]): 'beginner' | 'intermediate' | 'advanced' {
    if (userMessages.length === 0) return 'intermediate'

    // Analyze query complexity metrics
    const avgQueryLength = userMessages.reduce((sum, msg) => sum + msg.content.length, 0) / userMessages.length
    const complexWords = userMessages.reduce((sum, msg) => {
      const words = msg.content.split(' ').filter((word: string) => word.length > 6)
      return sum + words.length
    }, 0)
    
    const complexWordRatio = complexWords / userMessages.reduce((sum, msg) => sum + msg.content.split(' ').length, 0)

    if (avgQueryLength < 50 && complexWordRatio < 0.1) return 'beginner'
    if (avgQueryLength > 150 && complexWordRatio > 0.2) return 'advanced'
    return 'intermediate'
  }

  private calculateComprehensionScore(userMessages: any[], aiMessages: any[]): number {
    // Simple heuristic: longer conversations indicate better comprehension
    // Follow-up questions indicate engagement
    const avgConversationLength = userMessages.length
    const hasFollowUps = userMessages.some(msg => 
      msg.content.toLowerCase().includes('what') || 
      msg.content.toLowerCase().includes('how') ||
      msg.content.toLowerCase().includes('why')
    )

    let score = Math.min(avgConversationLength * 10, 70)
    if (hasFollowUps) score += 20
    
    return Math.min(score, 100)
  }

  private detectPreferredStyle(userMessages: any[]): 'examples' | 'analogies' | 'step-by-step' | 'concise' {
    const content = userMessages.map(msg => msg.content.toLowerCase()).join(' ')
    
    if (content.includes('example') || content.includes('show me')) return 'examples'
    if (content.includes('like') || content.includes('similar to')) return 'analogies'
    if (content.includes('step') || content.includes('how to')) return 'step-by-step'
    return 'concise'
  }

  private calculateAverageComplexity(aiMessages: any[]): number {
    if (aiMessages.length === 0) return 5
    
    // Analyze AI response complexity
    const avgLength = aiMessages.reduce((sum, msg) => sum + msg.content.length, 0) / aiMessages.length
    const avgTokens = aiMessages.reduce((sum, msg) => sum + (msg.tokensUsed || 0), 0) / aiMessages.length
    
    // Scale 1-10 based on response characteristics
    let complexity = Math.min(avgLength / 200, 5) + Math.min(avgTokens / 100, 5)
    return Math.max(1, Math.min(complexity, 10))
  }

  private async analyzeTopicPerformance(conversations: any[]): Promise<{
    strugglingTopics: string[]
    strongTopics: string[]
  }> {
    // Extract topics from conversation titles and content
    const topics = new Map<string, { total: number, successful: number }>()
    
    conversations.forEach(conv => {
      if (conv.title) {
        const topic = this.extractTopic(conv.title)
        if (!topics.has(topic)) {
          topics.set(topic, { total: 0, successful: 0 })
        }
        const data = topics.get(topic)!
        data.total++
        
        // Consider conversation successful if it has multiple exchanges
        if (conv.messages.length > 3) {
          data.successful++
        }
      }
    })

    const strugglingTopics: string[] = []
    const strongTopics: string[] = []

    topics.forEach((data, topic) => {
      const successRate = data.successful / data.total
      if (successRate < 0.5 && data.total >= 2) {
        strugglingTopics.push(topic)
      } else if (successRate > 0.8 && data.total >= 2) {
        strongTopics.push(topic)
      }
    })

    return { strugglingTopics, strongTopics }
  }

  private extractTopic(title: string): string {
    const words = title.toLowerCase().split(' ')
    // Simple topic extraction - could be enhanced with NLP
    const topicKeywords = ['character', 'plot', 'theme', 'setting', 'symbolism', 'analysis']
    
    for (const keyword of topicKeywords) {
      if (words.includes(keyword)) return keyword
    }
    
    return words[0] || 'general'
  }

  async updateProfile(userId: string, interactionData: InteractionData): Promise<void> {
    // This would be called after each AI interaction to update the profile
    // For now, we'll rebuild from scratch each time, but could be optimized
    // to incrementally update specific metrics
  }

  async getAdaptivePrompt(userId: string, query: string): Promise<string> {
    const profile = await this.getProfile(userId)
    if (!profile) return ''

    let adaptations: string[] = []

    // Adapt based on reading level
    switch (profile.readingLevel) {
      case 'beginner':
        adaptations.push('Use simple language and short sentences.')
        break
      case 'advanced':
        adaptations.push('You can use complex vocabulary and detailed analysis.')
        break
      default:
        adaptations.push('Use moderate complexity in your language.')
    }

    // Adapt based on preferred explanation style
    switch (profile.preferredExplanationStyle) {
      case 'examples':
        adaptations.push('Include specific examples to illustrate your points.')
        break
      case 'analogies':
        adaptations.push('Use analogies and comparisons to explain concepts.')
        break
      case 'step-by-step':
        adaptations.push('Break down explanations into clear, numbered steps.')
        break
      case 'concise':
        adaptations.push('Be concise and direct in your explanations.')
        break
    }

    // Adapt based on struggling topics
    if (profile.strugglingTopics.length > 0) {
      const relevantStruggles = profile.strugglingTopics.filter(topic => 
        query.toLowerCase().includes(topic)
      )
      if (relevantStruggles.length > 0) {
        adaptations.push(`The user has struggled with ${relevantStruggles.join(', ')} before. Provide extra support and scaffolding for these topics.`)
      }
    }

    // Adapt response complexity
    if (profile.comprehensionScore < 60) {
      adaptations.push('Provide additional context and background information.')
    }

    return adaptations.length > 0 
      ? `User Learning Profile Adaptations: ${adaptations.join(' ')}\n\n`
      : ''
  }
}

export const learningProfileService = new LearningProfileService()