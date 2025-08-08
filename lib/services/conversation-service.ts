import { prisma } from '@/lib/prisma'
import { Conversation, Message, Prisma } from '@prisma/client'

export interface ConversationWithMessages extends Conversation {
  messages: Message[]
}

export interface MessageInput {
  content: string
  sender: 'user' | 'assistant'
  embedding?: number[]
  tokensUsed?: number
  model?: string
  cost?: number
}

export interface ConversationContext {
  conversationId: string
  userId: string
  bookId: string
  messages: Message[]
  lastMessages: Message[]
}

export interface EpisodicMemoryInput {
  conversationId: string
  query: string
  response: string
  bookPassage?: string
  userReaction?: 'confused' | 'understood' | 'engaged'
  concepts?: string[]
}

class ConversationService {
  async createConversation(userId: string, bookId: string, title?: string): Promise<Conversation> {
    const now = new Date();
    return await prisma.conversation.create({
      data: {
        id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        bookId,
        title: title || 'New Conversation',
        createdAt: now,
        updatedAt: now,
      },
    })
  }

  async findOrCreateConversation(
    userId: string,
    bookId: string
  ): Promise<ConversationWithMessages> {
    // Check if this is an external book
    const isExternalBook = bookId.includes('-') && !bookId.match(/^[0-9a-f-]{36}$/)
    
    // For external books, we need to ensure the book exists in the database first
    if (isExternalBook) {
      const existingBook = await prisma.book.findUnique({
        where: { id: bookId }
      })
      
      if (!existingBook) {
        // Extract source and ID from external book ID (e.g., "gutenberg-2701")
        const [source, externalId] = bookId.split('-')
        
        // Create a placeholder book record for external books
        await prisma.book.create({
          data: {
            id: bookId,
            title: `External Book (${source} #${externalId})`,
            author: 'Unknown',
            publicDomain: true,
            genre: source,
            language: 'en',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
      }
    }

    // First try to find an existing conversation
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        userId,
        bookId,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    if (existingConversation) {
      return existingConversation
    }

    // Create a new conversation if none exists
    const newConversation = await prisma.conversation.create({
      data: {
        userId,
        bookId,
        title: 'New Discussion',
      },
      include: {
        messages: true,
      },
    })

    return newConversation
  }

  async addMessage(
    conversationId: string,
    message: MessageInput
  ): Promise<Message> {
    const now = new Date();
    const messageData: Prisma.MessageCreateInput = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversation: {
        connect: { id: conversationId },
      },
      content: message.content,
      sender: message.sender,
      tokensUsed: message.tokensUsed,
      model: message.model,
      cost: message.cost,
      createdAt: now,
    }

    const createdMessage = await prisma.message.create({
      data: messageData,
    })

    // Update conversation's updatedAt timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    })

    return createdMessage
  }

  async getConversationContext(
    conversationId: string,
    lastN: number = 10
  ): Promise<ConversationContext | null> {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: lastN,
        },
      },
    })

    if (!conversation) {
      return null
    }

    // Reverse messages to get chronological order
    const messages = conversation.messages.reverse()

    return {
      conversationId: conversation.id,
      userId: conversation.userId,
      bookId: conversation.bookId,
      messages: messages,
      lastMessages: messages.slice(-5), // Last 5 messages for immediate context
    }
  }

  async getRelatedConversations(
    userId: string,
    bookId: string,
    limit: number = 5
  ): Promise<Conversation[]> {
    return await prisma.conversation.findMany({
      where: {
        userId,
        bookId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: limit,
    })
  }

  async getAllUserConversations(userId: string): Promise<ConversationWithMessages[]> {
    return await prisma.conversation.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await prisma.conversation.delete({
      where: { id: conversationId },
    })
  }

  async addEpisodicMemory(memory: EpisodicMemoryInput): Promise<void> {
    await prisma.episodicMemory.create({
      data: {
        conversationId: memory.conversationId,
        query: memory.query,
        response: memory.response,
        bookPassage: memory.bookPassage,
        userReaction: memory.userReaction,
        concepts: memory.concepts,
      },
    })
  }

  async getEpisodicMemories(conversationId: string): Promise<any[]> {
    return await prisma.episodicMemory.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'desc' },
    })
  }

  async buildConversationPromptContext(context: ConversationContext): Promise<string> {
    if (context.messages.length === 0) {
      return ''
    }

    const conversationHistory = context.messages
      .map((msg) => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n')

    return `Previous conversation context:
${conversationHistory}

Please continue this conversation naturally, building on what we've discussed.`
  }
}

export const conversationService = new ConversationService()