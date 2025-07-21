import { NextRequest, NextResponse } from 'next/server'
import { knowledgeGraphService } from '@/lib/knowledge-graph'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const action = url.searchParams.get('action')
    const format = url.searchParams.get('format') || 'json'

    switch (action) {
      case 'insights':
        const insights = await knowledgeGraphService.generateInsights(user.id)
        return NextResponse.json({ insights })

      case 'export':
        const exportData = await knowledgeGraphService.exportGraph(user.id, format as any)
        
        if (format === 'json' || format === 'cytoscape') {
          return NextResponse.json(JSON.parse(exportData))
        }
        
        return new NextResponse(exportData, {
          headers: {
            'Content-Type': 'application/xml',
            'Content-Disposition': `attachment; filename="knowledge-graph.${format}"`
          }
        })

      case 'query':
        const nodeTypes = url.searchParams.get('nodeTypes')?.split(',')
        const edgeTypes = url.searchParams.get('edgeTypes')?.split(',')
        const minWeight = url.searchParams.get('minWeight') ? parseFloat(url.searchParams.get('minWeight')!) : undefined

        const queryResult = await knowledgeGraphService.queryGraph(user.id, {
          nodeTypes,
          edgeTypes,
          minWeight
        })

        return NextResponse.json(queryResult)

      case 'path':
        const startNodeId = url.searchParams.get('start')
        const targetNodeId = url.searchParams.get('target')

        if (!startNodeId || !targetNodeId) {
          return NextResponse.json({ error: 'Start and target node IDs required' }, { status: 400 })
        }

        const path = await knowledgeGraphService.findShortestPath(user.id, startNodeId, targetNodeId)
        return NextResponse.json({ path })

      default:
        // Return full graph overview
        const graph = await knowledgeGraphService.buildUserKnowledgeGraph(user.id)
        
        return NextResponse.json({
          nodeCount: graph.nodes.size,
          edgeCount: graph.edges.size,
          clusterCount: graph.clusters.length,
          pathCount: graph.paths.length,
          lastUpdated: graph.lastUpdated,
          clusters: graph.clusters.map(cluster => ({
            id: cluster.id,
            name: cluster.name,
            nodeCount: cluster.nodeIds.length,
            strength: cluster.strength
          })),
          paths: graph.paths.map(path => ({
            id: path.id,
            pathType: path.pathType,
            nodeCount: path.nodeIds.length,
            strength: path.strength,
            description: path.description
          }))
        })
    }
  } catch (error) {
    console.error('Knowledge graph API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'rebuild':
        const graph = await knowledgeGraphService.buildUserKnowledgeGraph(user.id)
        return NextResponse.json({ 
          message: 'Knowledge graph rebuilt successfully',
          nodeCount: graph.nodes.size,
          edgeCount: graph.edges.size
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Knowledge graph API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}