'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { EnhancedBooksGrid } from '@/components/ui/EnhancedBooksGrid';
import { AIBookChatModal } from '@/components/ai/AIBookChatModal';
import type { ExternalBook } from '@/types/book-sources';

export default function HomePage() {
  const [selectedLevel, setSelectedLevel] = useState('B1');
  const cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  
  // AI Chat Modal State
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [selectedAIBook, setSelectedAIBook] = useState<ExternalBook | null>(null);
  
  const sampleTexts = {
    A1: "Elizabeth is a young woman. She meets Mr. Darcy. He is rich but proud.",
    A2: "Elizabeth Bennet is a smart young woman. She meets Mr. Darcy at a party. He seems proud and unfriendly.",
    B1: "Elizabeth Bennet is an intelligent young woman from a middle-class family. When she meets the wealthy Mr. Darcy, she finds him arrogant and dismissive.",
    B2: "Elizabeth Bennet, a spirited and perceptive young woman, encounters the aristocratic Mr. Darcy at a social gathering, where his apparent pride and disdain immediately prejudice her against him.",
    C1: "Elizabeth Bennet, whose lively intelligence and independent spirit distinguish her from her contemporaries, finds herself profoundly antipathetic toward the enigmatic Mr. Darcy following their initial encounter.",
    C2: "Elizabeth Bennet, possessed of a penetrating wit and an unwavering moral compass that renders her peculiarly resistant to the superficial allurements of society, experiences an immediate and visceral aversion to the ostensibly supercilious Mr. Darcy."
  };
  
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

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
    <div className="page-container magical-bg min-h-screen" style={{ 
      background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', 
      color: '#ffffff',
      position: 'relative'
    }}>
      <div className="page-content" style={{ 
        padding: '4rem 2rem', 
        maxWidth: '1200px', 
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2.5rem'
      }}>
        {/* Hero Section */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          aria-labelledby="welcome-heading" 
          className="page-header text-center hero-section"
          style={{ marginBottom: '2rem' }}
        >
          <motion.h1 
            id="welcome-heading"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-gradient hero-title"
            style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}
          >
            Read Classic Literature at Your English Level
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="hero-subtitle"
            style={{ 
              color: '#94a3b8', 
              marginBottom: '3rem', 
              fontSize: '1.125rem', 
              maxWidth: '800px', 
              margin: '0 auto 3rem auto',
              lineHeight: '1.6'
            }}
          >
            AI-powered text simplification • Word-by-word audio • Vocabulary learning
          </motion.p>

          {/* CEFR Level Selector */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="flex flex-wrap justify-center gap-3 mb-8"
          >
            {cefrLevels.map((level, index) => (
              <motion.button
                key={level}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + index * 0.1, duration: 0.4 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedLevel(level)}
                className="cefr-level-button"
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: selectedLevel === level 
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: selectedLevel === level
                    ? '0 4px 12px rgba(16, 185, 129, 0.4)'
                    : '0 4px 12px rgba(102, 126, 234, 0.4)'
                }}
              >
                {level}
              </motion.button>
            ))}
          </motion.div>

          {/* Sample Text Demo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            style={{
              backgroundColor: '#1e293b',
              borderRadius: '16px',
              padding: '1.5rem 2rem',
              marginBottom: '1.5rem',
              border: '1px solid #334155',
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              maxWidth: '900px',
              width: '100%',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              margin: '0 auto 1.5rem auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div style={{
              textAlign: 'center',
              marginBottom: '1rem'
            }}>
              <span style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#10b981',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {selectedLevel} Level Example
              </span>
            </div>
            <motion.p
              key={selectedLevel}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                fontSize: '1.125rem',
                lineHeight: '1.7',
                color: '#f1f5f9',
                textAlign: 'center',
                fontStyle: 'italic',
                margin: '0 auto',
                maxWidth: '800px'
              }}
            >
              "{sampleTexts[selectedLevel as keyof typeof sampleTexts]}"
            </motion.p>
            <div style={{
              textAlign: 'center',
              marginTop: '1rem',
              fontSize: '0.875rem',
              color: '#64748b'
            }}>
              From Pride and Prejudice
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.6 }}
            className="flex gap-6 justify-center flex-wrap hero-buttons"
          >
            <motion.a 
              href="/library/gutenberg-1342/read"
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.95 }}
              className="btn btn-brand inline-flex items-center gap-3 px-8 py-4 font-semibold"
              style={{ 
                fontSize: '1.125rem', 
                textDecoration: 'none',
                borderRadius: '12px'
              }}
            >
              Start Reading Pride & Prejudice
            </motion.a>
            
            <motion.a 
              href="#level-assessment"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="btn btn-secondary inline-flex items-center gap-3 px-8 py-4 font-semibold"
              style={{ 
                fontSize: '1.125rem', 
                textDecoration: 'none',
                borderRadius: '12px',
                background: 'transparent',
                border: '2px solid #667eea',
                color: '#667eea'
              }}
            >
              Take Level Assessment
            </motion.a>
          </motion.div>
        </motion.section>

        {/* Enhanced Features Section - Mobile Only */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          className="w-full enhanced-features-mobile"
          style={{ 
            display: 'none',
            marginTop: '2rem',
            marginBottom: '2rem'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '0.5rem'
            }}>
              ✨ Enhanced Features
            </h2>
          </div>

          <div className="features-grid-mobile" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            maxWidth: '320px',
            margin: '0 auto'
          }}>
            <div className="feature-card-mobile" style={{
              textAlign: 'center',
              padding: '16px',
              background: 'rgba(30, 41, 59, 0.8)',
              borderRadius: '12px',
              border: '1px solid #334155'
            }}>
              <span style={{ fontSize: '1.5rem' }}>🎯</span>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#ffffff', margin: '8px 0 4px 0' }}>
                AI Simplification
              </h4>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0' }}>
                6 CEFR levels
              </p>
            </div>
            
            <div className="feature-card-mobile" style={{
              textAlign: 'center',
              padding: '16px',
              background: 'rgba(30, 41, 59, 0.8)',
              borderRadius: '12px',
              border: '1px solid #334155'
            }}>
              <span style={{ fontSize: '1.5rem' }}>🎧</span>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#ffffff', margin: '8px 0 4px 0' }}>
                Premium Audio
              </h4>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0' }}>
                12 voices
              </p>
            </div>
            
            <div className="feature-card-mobile" style={{
              textAlign: 'center',
              padding: '16px',
              background: 'rgba(30, 41, 59, 0.8)',
              borderRadius: '12px',
              border: '1px solid #334155'
            }}>
              <span style={{ fontSize: '1.5rem' }}>📚</span>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#ffffff', margin: '8px 0 4px 0' }}>
                Vocabulary
              </h4>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0' }}>
                Word definitions
              </p>
            </div>
            
            <div className="feature-card-mobile" style={{
              textAlign: 'center',
              padding: '16px',
              background: 'rgba(30, 41, 59, 0.8)',
              borderRadius: '12px',
              border: '1px solid #334155'
            }}>
              <span style={{ fontSize: '1.5rem' }}>📊</span>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#ffffff', margin: '8px 0 4px 0' }}>
                Progress
              </h4>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0' }}>
                Track reading
              </p>
            </div>
          </div>
        </motion.section>

        {/* Enhanced Books Grid */}
        <motion.section
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
            <h2 style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '0.5rem'
            }}>
              How It Works
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '1.125rem' }}>
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
                style={{ 
                  textAlign: 'center',
                  position: 'relative',
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  padding: '1.5rem 1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  flex: '1',
                  minWidth: '250px',
                  maxWidth: '280px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#10b981';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(16, 185, 129, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#334155';
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
                  background: '#10b981',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: 'white'
                }}>
                  1
                </div>
                
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.75rem auto',
                  fontSize: '1.5rem',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)'
                }}>
                  📚
                </div>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  marginBottom: '0.5rem'
                }}>
                  Choose Your Level
                </h3>
                <p style={{
                  color: '#94a3b8',
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
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#10b981'
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
                style={{ 
                  textAlign: 'center',
                  position: 'relative',
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  padding: '1.5rem 1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  flex: '1',
                  minWidth: '250px',
                  maxWidth: '280px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(59, 130, 246, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#334155';
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
                  background: '#3b82f6',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: 'white'
                }}>
                  2
                </div>
                
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.75rem auto',
                  fontSize: '1.5rem',
                  boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)'
                }}>
                  🎧
                </div>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  marginBottom: '0.5rem'
                }}>
                  Listen & Read
                </h3>
                <p style={{
                  color: '#94a3b8',
                  lineHeight: '1.5',
                  marginBottom: '0.75rem',
                  fontSize: '0.9rem'
                }}>
                  Word-by-word highlighting with premium voices
                </p>
                {/* Mini demo */}
                <div style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#3b82f6'
                }}>
                  <span style={{ background: 'rgba(59, 130, 246, 0.3)', padding: '2px 4px', borderRadius: '2px' }}>Word</span> highlighting demo
                </div>
              </motion.div>

              {/* Step 3 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.6, duration: 0.5 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                style={{ 
                  textAlign: 'center',
                  position: 'relative',
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  padding: '1.5rem 1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  flex: '1',
                  minWidth: '250px',
                  maxWidth: '280px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#8b5cf6';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(139, 92, 246, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#334155';
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
                  background: '#8b5cf6',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: 'white'
                }}>
                  3
                </div>
                
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.75rem auto',
                  fontSize: '1.5rem',
                  boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3)'
                }}>
                  🤖
                </div>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  marginBottom: '0.5rem'
                }}>
                  Ask AI Tutor
                </h3>
                <p style={{
                  color: '#94a3b8',
                  lineHeight: '1.5',
                  marginBottom: '0.75rem',
                  fontSize: '0.9rem'
                }}>
                  Get instant help with vocabulary and comprehension
                </p>
                {/* Mini demo */}
                <div style={{
                  fontSize: '12px',
                  color: '#8b5cf6'
                }}>
                  <a href="#ai-demo" style={{
                    color: '#8b5cf6',
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