'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { EnhancedBooksGrid } from '@/components/ui/EnhancedBooksGrid';
import { AIBookChatModal } from '@/lib/dynamic-imports';
import { InteractiveReadingDemo } from '@/components/hero/InteractiveReadingDemo';
import { useAuth } from '@/components/AuthProvider';
import type { ExternalBook } from '@/types/book-sources';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Hybrid approach: Redirect logged-in users to catalog, show demo to non-logged-in users
  useEffect(() => {
    // Only redirect if we're certain a user is logged in (not while loading)
    if (!loading && user) {
      console.log('[HomePage] User logged in, redirecting to /catalog');
      router.push('/catalog');
    }
  }, [user, loading, router]);

  // Don't render homepage content if user is logged in (will redirect)
  // Show homepage immediately for non-logged-in users (even while loading)
  if (user) {
    return null;
  }

  // Don't render homepage content if user is logged in (will redirect)
  if (user) {
    return null;
  }

  // AI Chat Modal State
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [selectedAIBook, setSelectedAIBook] = useState<ExternalBook | null>(null);
  
  // AI Chat Handlers
  const handleAskAI = (book: ExternalBook) => {
    console.log('Opening AI chat for book:', book);
    setSelectedAIBook(book);
    setIsAIChatOpen(true);
  };

  const handleCloseAIChat = () => {
    setIsAIChatOpen(false);
    setSelectedAIBook(null);
  };

  const handleSendAIMessage = async (message: string): Promise<string> => {
    if (!selectedAIBook) {
      throw new Error('No book selected for AI chat');
    }

    try {
      const bookContext = `Title: ${selectedAIBook.title}, Author: ${selectedAIBook.author}${
        selectedAIBook.description ? `, Description: ${selectedAIBook.description}` : ''
      }${
        selectedAIBook.subjects?.length ? `, Subjects: ${selectedAIBook.subjects.join(', ')}` : ''
      }`;

      // Add timeout to prevent hanging - increased for complex AI analysis
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout for complex AI processing

      const { ApiAdapter } = await import('../lib/api-adapter');
      
      const response = await ApiAdapter.fetch('/api/ai', {
        method: 'POST',
        body: JSON.stringify({
          query: message,
          bookId: selectedAIBook.id,
          bookContext: bookContext,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Return the full AI response data for progressive disclosure
      const aiResponse = {
        content: data.response || data.content || data.message || 'I received your question but had trouble generating a response. Please try again.',
        context: data.tutoringAgents?.context ? { content: data.tutoringAgents.context, confidence: 0.9 } : undefined,
        insights: data.tutoringAgents?.insights ? { content: data.tutoringAgents.insights, confidence: 0.9 } : undefined,
        questions: data.tutoringAgents?.questions ? { content: data.tutoringAgents.questions, confidence: 0.9 } : undefined,
        crossBookConnections: data.crossBookConnections,
        agentResponses: data.agentResponses,
        multiAgent: data.multiAgent
      };
      
      return JSON.stringify(aiResponse);
    } catch (error) {
      console.error('Error sending AI message:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('⏱️ Request timed out after 90 seconds. Your AI analysis was too complex - try asking a simpler question or try again later.');
        }
        if (error.message.includes('limit exceeded') || error.message.includes('usage limit')) {
          throw new Error('You have reached your AI usage limit. Please upgrade your plan or try again later.');
        }
        if (error.message.includes('rate_limit_error') || error.message.includes('429')) {
          throw new Error('🚦 AI service is temporarily busy due to high usage. Please wait 1-2 minutes and try again.');
        }
        throw new Error(error.message);
      }
      
      throw new Error('Failed to get AI response. Please try again.');
    }
  };

  return (
    <div className="page-container magical-bg min-h-screen theme-transition" style={{
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      position: 'relative'
    }}>

      <div className="page-content theme-transition" style={{
        padding: '0 1rem 4rem 1rem',
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0'
      }}>
        {/* Interactive Reading Demo - Main Hero */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          aria-labelledby="interactive-demo"
          className="w-full"
          style={{ marginTop: '0', paddingTop: '0' }}
        >
          <InteractiveReadingDemo />
        </motion.section>

        {/* Video Demo Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="w-full"
          style={{ 
            marginTop: '3rem',
            maxWidth: '900px',
            margin: '3rem auto 0 auto',
            padding: '0 1rem'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h2 className="neo-classic-title" style={{
              fontSize: '1.75rem',
              fontWeight: 'bold',
              color: 'var(--text-accent)',
              marginBottom: '0.5rem'
            }}>
              See BookBridge in Action
            </h2>
            <p className="neo-classic-subtitle" style={{
              color: 'var(--text-secondary)',
              fontSize: '1rem'
            }}>
              Watch a quick demo and learn how to use the app
            </p>
          </div>

          {/* YouTube Video Embed */}
          <div style={{
            position: 'relative',
            paddingBottom: '56.25%', // 16:9 aspect ratio
            height: 0,
            overflow: 'hidden',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
            border: '2px solid var(--border-light)',
            background: 'var(--bg-secondary)'
          }}>
            <iframe
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: '12px'
              }}
              src="https://www.youtube.com/embed/ASw886ZCaaA"
              title="BookBridge App Demo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </motion.section>

        {/* Enhanced Books Grid */}
        <motion.section
          style={{ marginTop: '2.5rem' }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="w-full"
        >
          <EnhancedBooksGrid 
            books={['gutenberg-1342', 'gutenberg-1513', 'gutenberg-11']} 
            onAskAI={handleAskAI}
          />
        </motion.section>


        {/* How ESL Reading Works */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.0, duration: 0.6 }}
          className="w-full"
          style={{ 
            marginTop: '3rem',
            maxWidth: '1200px',
            margin: '3rem auto 0 auto',
            padding: '0 2rem'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 className="neo-classic-title" style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: 'var(--text-accent)',
              marginBottom: '0.5rem'
            }}>
              How It Works
            </h2>
            <p className="neo-classic-subtitle" style={{
              color: 'var(--text-secondary)',
              fontSize: '1.125rem'
            }}>
              Three simple steps to start reading at your level
            </p>
          </div>

          {/* Single horizontal row for steps */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'stretch',
            gap: '2rem',
            maxWidth: '900px',
            margin: '0 auto',
            flexWrap: 'wrap'
          }}>
              {/* Step 1 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.2, duration: 0.5 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="neo-classic-surface theme-transition"
                style={{
                  textAlign: 'center',
                  position: 'relative',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '12px',
                  padding: '1.5rem 1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  flex: '1',
                  minWidth: '250px',
                  maxWidth: '280px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-secondary)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(205, 127, 50, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-light)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Step number */}
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '24px',
                  height: '24px',
                  background: 'var(--accent-secondary)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: 'var(--bg-secondary)'
                }}>
                  1
                </div>
                
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'var(--accent-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.75rem auto',
                  fontSize: '1.5rem',
                  boxShadow: '0 4px 16px rgba(var(--accent-secondary-rgb), 0.3)'
                }}>
                  📚
                </div>
                <h3 className="neo-classic-subtitle" style={{
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  color: 'var(--text-primary)',
                  marginBottom: '0.5rem'
                }}>
                  Choose Your Level
                </h3>
                <p className="neo-classic-body" style={{
                  color: 'var(--text-secondary)',
                  lineHeight: '1.5',
                  marginBottom: '0.75rem',
                  fontSize: '0.9rem'
                }}>
                  Select A1-C2 level for automatic text simplification
                </p>
                {/* Mini demo */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  {['A1', 'B1', 'C1'].map(level => (
                    <span key={level} style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      background: 'rgba(var(--accent-secondary-rgb), 0.15)',
                      color: 'var(--accent-secondary)'
                    }}>
                      {level}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Step 2 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.4, duration: 0.5 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="neo-classic-surface theme-transition"
                style={{
                  textAlign: 'center',
                  position: 'relative',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '12px',
                  padding: '1.5rem 1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  flex: '1',
                  minWidth: '250px',
                  maxWidth: '280px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-primary)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(var(--accent-primary-rgb), 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-light)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Step number */}
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '24px',
                  height: '24px',
                  background: 'var(--accent-primary)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: 'var(--bg-secondary)'
                }}>
                  2
                </div>
                
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.75rem auto',
                  fontSize: '1.5rem',
                  boxShadow: '0 4px 16px rgba(var(--accent-primary-rgb), 0.3)'
                }}>
                  🎧
                </div>
                <h3 className="neo-classic-subtitle" style={{
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  color: 'var(--text-primary)',
                  marginBottom: '0.5rem'
                }}>
                  Listen & Read
                </h3>
                <p className="neo-classic-body" style={{
                  color: 'var(--text-secondary)',
                  lineHeight: '1.5',
                  marginBottom: '0.75rem',
                  fontSize: '0.9rem'
                }}>
                  Word-by-word highlighting with premium voices
                </p>
                {/* Mini demo */}
                <div style={{
                  background: 'rgba(var(--accent-primary-rgb), 0.1)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'var(--accent-primary)'
                }}>
                  <span style={{ background: 'rgba(var(--accent-primary-rgb), 0.3)', padding: '2px 4px', borderRadius: '2px' }}>Word</span> highlighting demo
                </div>
              </motion.div>

              {/* Step 3 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.6, duration: 0.5 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="neo-classic-surface theme-transition"
                style={{
                  textAlign: 'center',
                  position: 'relative',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '12px',
                  padding: '1.5rem 1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  flex: '1',
                  minWidth: '250px',
                  maxWidth: '280px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-tertiary)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(var(--accent-tertiary-rgb), 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-light)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Step number */}
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '24px',
                  height: '24px',
                  background: 'var(--accent-tertiary)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: 'var(--bg-secondary)'
                }}>
                  3
                </div>
                
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'var(--accent-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.75rem auto',
                  fontSize: '1.5rem',
                  boxShadow: '0 4px 16px rgba(var(--accent-tertiary-rgb), 0.3)'
                }}>
                  🤖
                </div>
                <h3 className="neo-classic-subtitle" style={{
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  color: 'var(--text-primary)',
                  marginBottom: '0.5rem'
                }}>
                  Ask AI Tutor
                </h3>
                <p className="neo-classic-body" style={{
                  color: 'var(--text-secondary)',
                  lineHeight: '1.5',
                  marginBottom: '0.75rem',
                  fontSize: '0.9rem'
                }}>
                  Get instant help with vocabulary and comprehension
                </p>
                {/* Mini demo */}
                <div style={{
                  fontSize: '12px',
                  color: 'var(--accent-tertiary)'
                }}>
                  <a href="#ai-demo" style={{
                    color: 'var(--accent-tertiary)',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    Try it now →
                  </a>
                </div>
              </motion.div>
          </div>
        </motion.section>
      </div>

      {/* AI Chat Modal */}
      <AIBookChatModal
        isOpen={isAIChatOpen}
        book={selectedAIBook}
        onClose={handleCloseAIChat}
        onSendMessage={handleSendAIMessage}
      />
    </div>
  );
}