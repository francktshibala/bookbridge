'use client';

import { CEFRDemo } from '@/components/ui/CEFRDemo';
import { EnhancedBooksGrid } from '@/components/ui/EnhancedBooksGrid';

export default function TestComponentsPage() {
  return (
    <div className="page-container magical-bg min-h-screen" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
      <div className="page-content" style={{ 
        padding: '4rem 2rem', 
        maxWidth: '1200px', 
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h1 style={{
            fontSize: '48px',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '16px'
          }}>
            Component Test Page
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '18px' }}>
            Testing the new ESL components
          </p>
        </div>

        {/* CEFR Demo Section */}
        <section style={{ marginBottom: '6rem' }}>
          <h2 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#ffffff',
            textAlign: 'center',
            marginBottom: '2rem'
          }}>
            CEFR Level Demo
          </h2>
          <CEFRDemo bookId="gutenberg-1342" chunkIndex={0} />
        </section>

        {/* Enhanced Books Grid Section */}
        <section>
          <EnhancedBooksGrid 
            books={['gutenberg-1342', 'gutenberg-1513', 'gutenberg-84']}
            showFeatureBadges={true}
            layout="grid-3x3"
          />
        </section>
      </div>
    </div>
  );
}