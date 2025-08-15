import { prisma } from './prisma'
import { crossBookConnectionsService, CrossBookConnection, BookTheme } from './cross-book-connections'
import { learningProfileService, LearningProfile } from './learning-profile'

export interface KnowledgeNode {
  id: string
  type: 'book' | 'theme' | 'topic' | 'concept' | 'user' | 'question'
  label: string
  properties: Record<string, any>
  weight: number // Importance/frequency score
  createdAt: Date
  lastAccessedAt: Date
}

export interface KnowledgeEdge {
  id: string
  sourceId: string
  targetId: string
  type: 'contains' | 'relates_to' | 'explores' | 'connects' | 'discussed_in' | 'similar_to'
  weight: number // Connection strength
  properties: Record<string, any>
  createdAt: Date
}

export interface KnowledgeGraph {
  userId: string
  nodes: Map<string, KnowledgeNode>
  edges: Map<string, KnowledgeEdge>
  clusters: KnowledgeCluster[]
  paths: KnowledgePath[]
  lastUpdated: Date
}

export interface KnowledgeCluster {
  id: string
  name: string
  nodeIds: string[]
  centralTheme: string
  strength: number
}

export interface KnowledgePath {
  id: string
  nodeIds: string[]
  pathType: 'learning-journey' | 'thematic-progression' | 'cross-book-connection'
  strength: number
  description: string
}

export interface GraphQuery {
  nodeTypes?: string[]
  edgeTypes?: string[]
  minWeight?: number
  maxHops?: number
  startNodeId?: string
  targetNodeId?: string
}

export interface GraphInsight {
  type: 'gap' | 'strength' | 'pattern' | 'recommendation'
  title: string
  description: string
  relevantNodes: string[]
  score: number
}

export class KnowledgeGraphService {
  
  async buildUserKnowledgeGraph(userId: string): Promise<KnowledgeGraph> {
    const graph: KnowledgeGraph = {
      userId,
      nodes: new Map(),
      edges: new Map(),
      clusters: [],
      paths: [],
      lastUpdated: new Date()
    }

    // Get user's reading patterns and learning profile
    const readingPatterns = await crossBookConnectionsService.analyzeUserReadingPatterns(userId)
    const learningProfile = await learningProfileService.getProfile(userId)

    // Create user node
    this.addUserNode(graph, userId, learningProfile)

    // Create book nodes
    readingPatterns.books.forEach(book => {
      this.addBookNode(graph, book)
      this.addUserBookEdge(graph, userId, book.bookId, book.userInteractionCount)
      
      // Create theme nodes and edges
      book.themes.forEach(theme => {
        this.addThemeNode(graph, theme)
        this.addBookThemeEdge(graph, book.bookId, theme)
      })
      
      // Create topic nodes and edges
      book.topics.forEach(topic => {
        this.addTopicNode(graph, topic)
        this.addBookTopicEdge(graph, book.bookId, topic)
      })
      
      // Create concept nodes and edges
      book.concepts.forEach(concept => {
        this.addConceptNode(graph, concept)
        this.addBookConceptEdge(graph, book.bookId, concept)
      })

      // Create question nodes
      book.userQuestions.forEach((question, index) => {
        const questionId = `${book.bookId}-q${index}`
        this.addQuestionNode(graph, questionId, question, book.bookId)
        this.addBookQuestionEdge(graph, book.bookId, questionId)
      })
    })

    // Add cross-book connections as edges
    readingPatterns.connections.forEach(connection => {
      this.addCrossBookEdge(graph, connection)
    })

    // Build clusters
    graph.clusters = this.identifyClusters(graph)

    // Build learning paths
    graph.paths = this.identifyLearningPaths(graph, readingPatterns)

    return graph
  }

  private addUserNode(graph: KnowledgeGraph, userId: string, profile: LearningProfile | null): void {
    const node: KnowledgeNode = {
      id: userId,
      type: 'user',
      label: 'User',
      properties: {
        readingLevel: profile?.readingLevel || 'intermediate',
        comprehensionScore: profile?.comprehensionScore || 50,
        preferredStyle: profile?.preferredExplanationStyle || 'step-by-step',
        totalInteractions: profile?.totalInteractions || 0,
        strugglingTopics: profile?.strugglingTopics || [],
        strongTopics: profile?.strongTopics || []
      },
      weight: 1.0,
      createdAt: new Date(),
      lastAccessedAt: new Date()
    }
    graph.nodes.set(userId, node)
  }

  private addBookNode(graph: KnowledgeGraph, book: BookTheme): void {
    if (graph.nodes.has(book.bookId)) return

    const node: KnowledgeNode = {
      id: book.bookId,
      type: 'book',
      label: book.bookTitle,
      properties: {
        title: book.bookTitle,
        interactionCount: book.userInteractionCount,
        questionCount: book.userQuestions.length,
        themeCount: book.themes.length,
        topicCount: book.topics.length,
        conceptCount: book.concepts.length
      },
      weight: Math.min(book.userInteractionCount / 10, 1.0),
      createdAt: new Date(),
      lastAccessedAt: new Date()
    }
    graph.nodes.set(book.bookId, node)
  }

  private addThemeNode(graph: KnowledgeGraph, theme: string): void {
    if (graph.nodes.has(`theme:${theme}`)) {
      // Increase weight if theme already exists
      const node = graph.nodes.get(`theme:${theme}`)!
      node.weight = Math.min(node.weight + 0.1, 1.0)
      node.lastAccessedAt = new Date()
      return
    }

    const node: KnowledgeNode = {
      id: `theme:${theme}`,
      type: 'theme',
      label: theme,
      properties: {
        category: 'literary-theme',
        occurrenceCount: 1
      },
      weight: 0.3,
      createdAt: new Date(),
      lastAccessedAt: new Date()
    }
    graph.nodes.set(`theme:${theme}`, node)
  }

  private addTopicNode(graph: KnowledgeGraph, topic: string): void {
    if (graph.nodes.has(`topic:${topic}`)) {
      const node = graph.nodes.get(`topic:${topic}`)!
      node.weight = Math.min(node.weight + 0.1, 1.0)
      node.lastAccessedAt = new Date()
      return
    }

    const node: KnowledgeNode = {
      id: `topic:${topic}`,
      type: 'topic',
      label: topic,
      properties: {
        category: 'literary-topic',
        occurrenceCount: 1
      },
      weight: 0.4,
      createdAt: new Date(),
      lastAccessedAt: new Date()
    }
    graph.nodes.set(`topic:${topic}`, node)
  }

  private addConceptNode(graph: KnowledgeGraph, concept: string): void {
    if (graph.nodes.has(`concept:${concept}`)) {
      const node = graph.nodes.get(`concept:${concept}`)!
      node.weight = Math.min(node.weight + 0.15, 1.0)
      node.lastAccessedAt = new Date()
      return
    }

    const node: KnowledgeNode = {
      id: `concept:${concept}`,
      type: 'concept',
      label: concept,
      properties: {
        category: 'literary-concept',
        occurrenceCount: 1
      },
      weight: 0.5,
      createdAt: new Date(),
      lastAccessedAt: new Date()
    }
    graph.nodes.set(`concept:${concept}`, node)
  }

  private addQuestionNode(graph: KnowledgeGraph, questionId: string, question: string, bookId: string): void {
    const node: KnowledgeNode = {
      id: questionId,
      type: 'question',
      label: question.substring(0, 50) + (question.length > 50 ? '...' : ''),
      properties: {
        fullText: question,
        bookId,
        length: question.length
      },
      weight: 0.2,
      createdAt: new Date(),
      lastAccessedAt: new Date()
    }
    graph.nodes.set(questionId, node)
  }

  private addUserBookEdge(graph: KnowledgeGraph, userId: string, bookId: string, interactionCount: number): void {
    const edge: KnowledgeEdge = {
      id: `${userId}-reads-${bookId}`,
      sourceId: userId,
      targetId: bookId,
      type: 'explores',
      weight: Math.min(interactionCount / 20, 1.0),
      properties: {
        interactionCount,
        relationship: 'reads'
      },
      createdAt: new Date()
    }
    graph.edges.set(edge.id, edge)
  }

  private addBookThemeEdge(graph: KnowledgeGraph, bookId: string, theme: string): void {
    const edge: KnowledgeEdge = {
      id: `${bookId}-contains-theme:${theme}`,
      sourceId: bookId,
      targetId: `theme:${theme}`,
      type: 'contains',
      weight: 0.7,
      properties: {
        relationship: 'contains_theme'
      },
      createdAt: new Date()
    }
    graph.edges.set(edge.id, edge)
  }

  private addBookTopicEdge(graph: KnowledgeGraph, bookId: string, topic: string): void {
    const edge: KnowledgeEdge = {
      id: `${bookId}-contains-topic:${topic}`,
      sourceId: bookId,
      targetId: `topic:${topic}`,
      type: 'contains',
      weight: 0.6,
      properties: {
        relationship: 'contains_topic'
      },
      createdAt: new Date()
    }
    graph.edges.set(edge.id, edge)
  }

  private addBookConceptEdge(graph: KnowledgeGraph, bookId: string, concept: string): void {
    const edge: KnowledgeEdge = {
      id: `${bookId}-contains-concept:${concept}`,
      sourceId: bookId,
      targetId: `concept:${concept}`,
      type: 'contains',
      weight: 0.8,
      properties: {
        relationship: 'contains_concept'
      },
      createdAt: new Date()
    }
    graph.edges.set(edge.id, edge)
  }

  private addBookQuestionEdge(graph: KnowledgeGraph, bookId: string, questionId: string): void {
    const edge: KnowledgeEdge = {
      id: `${bookId}-discusses-${questionId}`,
      sourceId: bookId,
      targetId: questionId,
      type: 'discussed_in',
      weight: 0.4,
      properties: {
        relationship: 'user_question'
      },
      createdAt: new Date()
    }
    graph.edges.set(edge.id, edge)
  }

  private addCrossBookEdge(graph: KnowledgeGraph, connection: CrossBookConnection): void {
    const edge: KnowledgeEdge = {
      id: `${connection.sourceBookId}-connects-${connection.targetBookId}`,
      sourceId: connection.sourceBookId,
      targetId: connection.targetBookId,
      type: 'connects',
      weight: connection.connectionStrength,
      properties: {
        sharedThemes: connection.sharedThemes,
        sharedTopics: connection.sharedTopics,
        connectionType: connection.connectionType
      },
      createdAt: new Date()
    }
    graph.edges.set(edge.id, edge)
  }

  private identifyClusters(graph: KnowledgeGraph): KnowledgeCluster[] {
    const clusters: KnowledgeCluster[] = []
    const visited = new Set<string>()

    // Find theme-based clusters
    const themeNodes = Array.from(graph.nodes.values()).filter(node => node.type === 'theme')
    
    themeNodes.forEach(themeNode => {
      if (visited.has(themeNode.id)) return

      const cluster = this.buildClusterFromNode(graph, themeNode.id, visited)
      if (cluster.nodeIds.length >= 3) { // Minimum cluster size
        clusters.push(cluster)
      }
    })

    return clusters.sort((a, b) => b.strength - a.strength)
  }

  private buildClusterFromNode(graph: KnowledgeGraph, startNodeId: string, visited: Set<string>): KnowledgeCluster {
    const clusterNodes = new Set<string>()
    const queue = [startNodeId]
    
    while (queue.length > 0) {
      const nodeId = queue.shift()!
      if (visited.has(nodeId) || clusterNodes.has(nodeId)) continue
      
      clusterNodes.add(nodeId)
      visited.add(nodeId)
      
      // Find connected nodes with high weights
      Array.from(graph.edges.values())
        .filter(edge => 
          (edge.sourceId === nodeId || edge.targetId === nodeId) && 
          edge.weight > 0.5
        )
        .forEach(edge => {
          const connectedNodeId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId
          if (!visited.has(connectedNodeId) && !clusterNodes.has(connectedNodeId)) {
            queue.push(connectedNodeId)
          }
        })
    }

    const startNode = graph.nodes.get(startNodeId)!
    const strength = Array.from(clusterNodes).reduce((sum, nodeId) => {
      const node = graph.nodes.get(nodeId)!
      return sum + node.weight
    }, 0) / clusterNodes.size

    return {
      id: `cluster-${startNodeId}`,
      name: `${startNode.label} Cluster`,
      nodeIds: Array.from(clusterNodes),
      centralTheme: startNode.label,
      strength
    }
  }

  private identifyLearningPaths(graph: KnowledgeGraph, readingPatterns: any): KnowledgePath[] {
    const paths: KnowledgePath[] = []

    // Create chronological reading journey
    const books = readingPatterns.books.sort((a: any, b: any) => 
      new Date(a.lastRead || 0).getTime() - new Date(b.lastRead || 0).getTime()
    )
    
    if (books.length > 1) {
      paths.push({
        id: 'reading-journey',
        nodeIds: books.map((book: any) => book.bookId),
        pathType: 'learning-journey',
        strength: 0.8,
        description: 'User\'s chronological reading journey'
      })
    }

    // Create thematic progression paths
    const dominantThemes = readingPatterns.dominantThemes.slice(0, 3)
    dominantThemes.forEach((theme: string) => {
      const themeBooks = books.filter((book: any) => book.themes.includes(theme))
      if (themeBooks.length > 1) {
        paths.push({
          id: `theme-path-${theme}`,
          nodeIds: themeBooks.map((book: any) => book.bookId),
          pathType: 'thematic-progression',
          strength: 0.7,
          description: `Books exploring the theme of ${theme}`
        })
      }
    })

    return paths
  }

  async queryGraph(userId: string, query: GraphQuery): Promise<{
    nodes: KnowledgeNode[]
    edges: KnowledgeEdge[]
  }> {
    const graph = await this.buildUserKnowledgeGraph(userId)
    
    let filteredNodes = Array.from(graph.nodes.values())
    let filteredEdges = Array.from(graph.edges.values())

    // Apply filters
    if (query.nodeTypes && query.nodeTypes.length > 0) {
      filteredNodes = filteredNodes.filter(node => query.nodeTypes!.includes(node.type))
    }

    if (query.edgeTypes && query.edgeTypes.length > 0) {
      filteredEdges = filteredEdges.filter(edge => query.edgeTypes!.includes(edge.type))
    }

    if (query.minWeight !== undefined) {
      filteredNodes = filteredNodes.filter(node => node.weight >= query.minWeight!)
      filteredEdges = filteredEdges.filter(edge => edge.weight >= query.minWeight!)
    }

    // Filter edges to only include those between filtered nodes
    const nodeIds = new Set(filteredNodes.map(node => node.id))
    filteredEdges = filteredEdges.filter(edge => 
      nodeIds.has(edge.sourceId) && nodeIds.has(edge.targetId)
    )

    return {
      nodes: filteredNodes,
      edges: filteredEdges
    }
  }

  async findShortestPath(userId: string, startNodeId: string, targetNodeId: string): Promise<string[]> {
    const graph = await this.buildUserKnowledgeGraph(userId)
    
    // Dijkstra's algorithm implementation
    const distances = new Map<string, number>()
    const previous = new Map<string, string>()
    const unvisited = new Set<string>()

    // Initialize
    graph.nodes.forEach((_, nodeId) => {
      distances.set(nodeId, nodeId === startNodeId ? 0 : Infinity)
      unvisited.add(nodeId)
    })

    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
      let currentNode = ''
      let minDistance = Infinity
      unvisited.forEach(nodeId => {
        const distance = distances.get(nodeId)!
        if (distance < minDistance) {
          minDistance = distance
          currentNode = nodeId
        }
      })

      if (currentNode === targetNodeId) break
      if (minDistance === Infinity) break // No path exists

      unvisited.delete(currentNode)

      // Check neighbors
      graph.edges.forEach(edge => {
        let neighbor = ''
        if (edge.sourceId === currentNode) neighbor = edge.targetId
        else if (edge.targetId === currentNode) neighbor = edge.sourceId
        
        if (neighbor && unvisited.has(neighbor)) {
          const newDistance = distances.get(currentNode)! + (1 - edge.weight) // Use inverse weight as distance
          if (newDistance < distances.get(neighbor)!) {
            distances.set(neighbor, newDistance)
            previous.set(neighbor, currentNode)
          }
        }
      })
    }

    // Reconstruct path
    const path: string[] = []
    let current = targetNodeId
    while (current && previous.has(current)) {
      path.unshift(current)
      current = previous.get(current)!
    }
    if (current === startNodeId) path.unshift(startNodeId)

    return path
  }

  async generateInsights(userId: string): Promise<GraphInsight[]> {
    const graph = await this.buildUserKnowledgeGraph(userId)
    const insights: GraphInsight[] = []

    // Identify knowledge gaps
    const themeNodes = Array.from(graph.nodes.values()).filter(node => node.type === 'theme')
    const weakThemes = themeNodes.filter(node => node.weight < 0.3)
    
    if (weakThemes.length > 0) {
      insights.push({
        type: 'gap',
        title: 'Unexplored Themes',
        description: `You've lightly touched on these themes: ${weakThemes.map(t => t.label).join(', ')}. Consider exploring them more deeply.`,
        relevantNodes: weakThemes.map(t => t.id),
        score: 0.7
      })
    }

    // Identify strengths
    const strongConcepts = Array.from(graph.nodes.values())
      .filter(node => node.type === 'concept' && node.weight > 0.7)
    
    if (strongConcepts.length > 0) {
      insights.push({
        type: 'strength',
        title: 'Strong Conceptual Understanding',
        description: `You have deep understanding of: ${strongConcepts.map(c => c.label).join(', ')}`,
        relevantNodes: strongConcepts.map(c => c.id),
        score: 0.8
      })
    }

    // Identify patterns
    if (graph.clusters.length > 0) {
      const largestCluster = graph.clusters[0]
      insights.push({
        type: 'pattern',
        title: 'Reading Pattern Detected',
        description: `Your strongest interest area is ${largestCluster.centralTheme} with ${largestCluster.nodeIds.length} connected concepts`,
        relevantNodes: largestCluster.nodeIds,
        score: largestCluster.strength
      })
    }

    return insights.sort((a, b) => b.score - a.score)
  }

  async exportGraph(userId: string, format: 'json' | 'graphml' | 'cytoscape'): Promise<string> {
    const graph = await this.buildUserKnowledgeGraph(userId)
    
    switch (format) {
      case 'json':
        return JSON.stringify({
          nodes: Array.from(graph.nodes.values()),
          edges: Array.from(graph.edges.values()),
          clusters: graph.clusters,
          paths: graph.paths
        }, null, 2)
      
      case 'cytoscape':
        return JSON.stringify({
          elements: [
            ...Array.from(graph.nodes.values()).map(node => ({
              data: {
                id: node.id,
                label: node.label,
                type: node.type,
                weight: node.weight,
                ...node.properties
              }
            })),
            ...Array.from(graph.edges.values()).map(edge => ({
              data: {
                id: edge.id,
                source: edge.sourceId,
                target: edge.targetId,
                type: edge.type,
                weight: edge.weight,
                ...edge.properties
              }
            }))
          ]
        }, null, 2)
      
      default:
        return this.exportGraph(userId, 'json')
    }
  }
}

export const knowledgeGraphService = new KnowledgeGraphService()