import KnowledgeGraphViewer from '@/components/KnowledgeGraphViewer'

export default function KnowledgeGraphPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Knowledge Graph</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Explore your literary knowledge graph to understand themes, concepts, and connections across all your books.
          </p>
        </div>
        <KnowledgeGraphViewer />
      </div>
    </div>
  )
}