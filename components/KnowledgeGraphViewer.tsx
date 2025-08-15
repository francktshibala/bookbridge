'use client'

import { useState, useEffect } from 'react'

interface GraphOverview {
  nodeCount: number
  edgeCount: number
  clusterCount: number
  pathCount: number
  lastUpdated: string
  clusters: Array<{
    id: string
    name: string
    nodeCount: number
    strength: number
  }>
  paths: Array<{
    id: string
    pathType: string
    nodeCount: number
    strength: number
    description: string
  }>
}

interface GraphInsight {
  type: 'gap' | 'strength' | 'pattern' | 'recommendation'
  title: string
  description: string
  relevantNodes: string[]
  score: number
}

export default function KnowledgeGraphViewer() {
  const [overview, setOverview] = useState<GraphOverview | null>(null)
  const [insights, setInsights] = useState<GraphInsight[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGraphOverview = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/knowledge-graph')
      if (!response.ok) throw new Error('Failed to fetch knowledge graph')
      
      const data = await response.json()
      setOverview(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const fetchInsights = async () => {
    try {
      const response = await fetch('/api/knowledge-graph?action=insights')
      if (!response.ok) throw new Error('Failed to fetch insights')
      
      const data = await response.json()
      setInsights(data.insights)
    } catch (err) {
      console.error('Failed to fetch insights:', err)
    }
  }

  const rebuildGraph = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/knowledge-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rebuild' })
      })
      
      if (!response.ok) throw new Error('Failed to rebuild graph')
      
      await fetchGraphOverview()
      await fetchInsights()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const exportGraph = async (format: string) => {
    try {
      const response = await fetch(`/api/knowledge-graph?action=export&format=${format}`)
      if (!response.ok) throw new Error('Failed to export graph')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `knowledge-graph.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    }
  }

  useEffect(() => {
    fetchGraphOverview()
    fetchInsights()
  }, [])

  const getInsightBadgeClass = (type: string) => {
    switch (type) {
      case 'strength': return 'bg-green-100 text-green-800'
      case 'gap': return 'bg-yellow-100 text-yellow-800'
      case 'pattern': return 'bg-blue-100 text-blue-800'
      case 'recommendation': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading && !overview) {
    return (
      <div className="w-full max-w-4xl mx-auto bg-white border border-gray-200 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            📊 Knowledge Graph
          </h2>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading knowledge graph...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto bg-white border border-gray-200 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            📊 Knowledge Graph
          </h2>
        </div>
        <div className="p-6">
          <div className="text-red-600 text-center py-8">
            <p>{error}</p>
            <button 
              onClick={fetchGraphOverview} 
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Main Knowledge Graph Card */}
      <div className="bg-white border border-gray-200 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            📊 Your Literary Knowledge Graph
          </h2>
          <p className="text-gray-600 mt-1">
            A visual representation of your reading journey, themes, and learning connections
          </p>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-2 mb-4">
            <button 
              onClick={rebuildGraph} 
              disabled={loading}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded disabled:opacity-50"
            >
              {loading ? '🔄' : '🔄'} Rebuild Graph
            </button>
            <button 
              onClick={() => exportGraph('json')} 
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded"
            >
              💾 Export JSON
            </button>
            <button 
              onClick={() => exportGraph('cytoscape')} 
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded"
            >
              💾 Export Cytoscape
            </button>
          </div>

          {overview && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{overview.nodeCount}</div>
                <div className="text-sm text-gray-600">Concepts</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{overview.edgeCount}</div>
                <div className="text-sm text-gray-600">Connections</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{overview.clusterCount}</div>
                <div className="text-sm text-gray-600">Clusters</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{overview.pathCount}</div>
                <div className="text-sm text-gray-600">Learning Paths</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Knowledge Clusters */}
      {overview && overview.clusters.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Knowledge Clusters</h3>
            <p className="text-gray-600 mt-1">Groups of related concepts you've explored</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {overview.clusters.slice(0, 5).map((cluster) => (
                <div key={cluster.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{cluster.name}</div>
                    <div className="text-sm text-gray-600">
                      {cluster.nodeCount} concepts
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {Math.round(cluster.strength * 100)}% strength
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Learning Paths */}
      {overview && overview.paths.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Learning Paths</h3>
            <p className="text-gray-600 mt-1">Your journey through different topics and themes</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {overview.paths.map((path) => (
                <div key={path.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {path.pathType.replace('-', ' ')}
                    </span>
                    <span className="text-sm font-medium">
                      {Math.round(path.strength * 100)}% strength
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">{path.description}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {path.nodeCount} connected items
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Learning Insights */}
      {insights.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Learning Insights</h3>
            <p className="text-gray-600 mt-1">AI-generated insights about your reading patterns and knowledge</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getInsightBadgeClass(insight.type)}`}>
                      {insight.type}
                    </span>
                    <span className="text-sm text-gray-500">
                      Score: {Math.round(insight.score * 100)}%
                    </span>
                  </div>
                  <h4 className="font-medium mb-2">{insight.title}</h4>
                  <p className="text-sm text-gray-600">{insight.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Graph Information */}
      {overview && (
        <div className="bg-white border border-gray-200 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Graph Information</h3>
          </div>
          <div className="p-6">
            <div className="text-sm text-gray-600">
              <p>Last updated: {new Date(overview.lastUpdated).toLocaleString()}</p>
              <p className="mt-2">
                Your knowledge graph automatically updates as you read and ask questions. 
                It tracks themes, concepts, and connections across all your books to provide 
                personalized insights and enhance your learning experience.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}