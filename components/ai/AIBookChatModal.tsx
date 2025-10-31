'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ExternalBook } from '@/types/book-sources';
import { useIsMobile } from '@/hooks/useIsMobile';
import { trackEvent, withCommon } from '@/lib/services/analytics-service';

// Helper function to format AI responses with better paragraph structure
const formatAIResponse = (content: string): string => {
  return content
    // Convert bold markdown to HTML with better styling
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #f1f5f9; font-weight: 600;">$1</strong>')
    // Handle quoted text
    .replace(/"([^"]+)"/g, '<span style="color: #8b5cf6; font-style: italic;">"$1"</span>')
    // Clean up any escaped HTML/CSS that shouldn't be displayed as text
    .replace(/style="[^"]*"/g, '') // Remove any style attributes that got through
    .replace(/color:\s*#[a-fA-F0-9]{6};\s*/g, '') // Remove color properties
    .replace(/font-weight:\s*\d+;\s*/g, '') // Remove font-weight properties
    .replace(/"">/g, '') // Remove formatting artifacts from AI responses
    // Split into paragraphs and add proper spacing
    .split('\n\n')
    .map(paragraph => {
      if (paragraph.trim()) {
        // Check if it contains list items
        if (paragraph.includes('- ')) {
          const lines = paragraph.split('\n').filter(line => line.trim());
          const nonListLines = lines.filter(line => !line.trim().startsWith('- '));
          const listLines = lines.filter(line => line.trim().startsWith('- '));
          
          let result = '';
          
          // Add non-list content as a paragraph
          if (nonListLines.length > 0) {
            result += `<p style="margin-bottom: 12px; line-height: 1.6;">${nonListLines.join(' ')}</p>`;
          }
          
          // Add list items
          if (listLines.length > 0) {
            result += '<ul style="margin: 12px 0; padding-left: 24px; list-style-type: disc;">';
            listLines.forEach(item => {
              const cleanItem = item.replace(/^- /, '').trim();
              result += `<li style="margin-bottom: 6px; line-height: 1.5;">${cleanItem}</li>`;
            });
            result += '</ul>';
          }
          return result;
        } else {
          // Check if this is a question section
          if (paragraph.includes('?')) {
            return `<p style="margin-bottom: 18px; line-height: 1.7; padding: 12px 0; border-left: 3px solid rgba(139, 92, 246, 0.3); padding-left: 16px; margin-left: 8px;">${paragraph.trim()}</p>`;
          } else {
            // Regular paragraph with better styling
            return `<p style="margin-bottom: 18px; line-height: 1.7;">${paragraph.trim()}</p>`;
          }
        }
      }
      return '';
    })
    .join('')
    // Remove trailing margin from last element
    .replace(/margin-bottom: 18px;(?=[^>]*>(?:[^<]|<(?!\/p>))*<\/p>\s*$)/, 'margin-bottom: 0;');
};

interface AIResponseData {
  content: string;
  context?: {
    content: string;
    confidence: number;
  };
  insights?: {
    content: string;
    confidence: number;
  };
  questions?: {
    content: string;
    confidence: number;
  };
  crossBookConnections?: any;
  agentResponses?: any;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  aiData?: AIResponseData; // Rich AI analysis data
}

interface AIBookChatModalProps {
  isOpen: boolean;
  book: ExternalBook | null;
  onClose: () => void;
  onSendMessage?: (message: string) => Promise<string>;
}

// Progressive Disclosure AI Message Component
const AIMessageWithDisclosure: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const [showDetails, setShowDetails] = useState(false);
  
  if (message.role !== 'assistant' || !message.aiData) {
    return null;
  }

  const { aiData } = message;
  const hasRichData = aiData.context || aiData.insights || aiData.questions;

  return (
    <div style={{ width: '100%' }}>
      {/* Main AI Response */}
      <div
        style={{
          background: 'var(--accent-primary)/10',
          border: '2px solid var(--accent-primary)/30',
          borderRadius: '12px',
          padding: '16px',
          color: 'var(--text-primary)',
          lineHeight: '1.5',
          marginBottom: hasRichData ? '12px' : '0',
          fontFamily: 'Source Serif Pro, Georgia, serif'
        }}
        dangerouslySetInnerHTML={{
          __html: formatAIResponse(message.content)
        }}
      />
      
      {/* Progressive Disclosure Button */}
      {hasRichData && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: showDetails ? '16px' : '0' }}>
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              background: showDetails ? 'var(--accent-primary)/20' : 'var(--accent-primary)/10',
              border: `2px solid ${showDetails ? 'var(--accent-primary)' : 'var(--accent-primary)/30'}`,
              borderRadius: '20px',
              padding: '8px 16px',
              color: showDetails ? 'var(--accent-secondary)' : 'var(--accent-primary)',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'Source Serif Pro, Georgia, serif'
            }}
            onMouseEnter={(e) => {
              if (!showDetails) {
                e.currentTarget.style.background = 'var(--accent-primary)/20';
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                e.currentTarget.style.color = 'var(--accent-secondary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!showDetails) {
                e.currentTarget.style.background = 'var(--accent-primary)/10';
                e.currentTarget.style.borderColor = 'var(--accent-primary)/30';
                e.currentTarget.style.color = 'var(--accent-primary)';
              }
            }}
          >
            {showDetails ? '🔼 Hide Details' : '💡 Explore Deeper'}
          </button>
        </div>
      )}
      
      {/* Expanded Details */}
      {showDetails && hasRichData && (
        <div style={{
          background: 'var(--bg-primary)',
          border: '2px solid var(--accent-primary)/20',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          
          {/* Questions Section */}
          {aiData.questions && (
            <div>
              <h4 style={{
                color: 'var(--accent-primary)',
                fontSize: '18px',
                fontWeight: '700',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontFamily: 'Playfair Display, serif'
              }}>
                🎯 Think About This
              </h4>
              <div
                style={{
                  background: 'var(--accent-primary)/8',
                  borderLeft: '4px solid var(--accent-primary)',
                  padding: '16px 20px',
                  borderRadius: '0 12px 12px 0',
                  color: 'var(--text-primary)',
                  lineHeight: '1.7',
                  fontSize: '15px',
                  boxShadow: '0 2px 8px var(--shadow-soft)',
                  fontFamily: 'Source Serif Pro, Georgia, serif'
                }}
                dangerouslySetInnerHTML={{
                  __html: formatAIResponse(aiData.questions.content)
                }}
              />
            </div>
          )}
          
          {/* Insights Section */}
          {aiData.insights && (
            <div>
              <h4 style={{
                color: 'var(--accent-secondary)',
                fontSize: '18px',
                fontWeight: '700',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontFamily: 'Playfair Display, serif'
              }}>
                🧠 Deep Insights
              </h4>
              <div
                style={{
                  background: 'var(--accent-secondary)/8',
                  borderLeft: '4px solid var(--accent-secondary)',
                  padding: '16px 20px',
                  borderRadius: '0 12px 12px 0',
                  color: 'var(--text-primary)',
                  lineHeight: '1.7',
                  fontSize: '15px',
                  boxShadow: '0 2px 8px var(--shadow-soft)',
                  fontFamily: 'Source Serif Pro, Georgia, serif'
                }}
                dangerouslySetInnerHTML={{
                  __html: formatAIResponse(aiData.insights.content)
                }}
              />
            </div>
          )}
          
          {/* Context Section */}
          {aiData.context && (
            <div>
              <h4 style={{
                color: '#f59e0b',
                fontSize: '18px',
                fontWeight: '700',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontFamily: 'Playfair Display, serif'
              }}>
                📚 Learning Context
              </h4>
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  borderLeft: '4px solid #f59e0b',
                  padding: '16px 20px',
                  borderRadius: '0 12px 12px 0',
                  color: 'var(--text-primary)',
                  lineHeight: '1.7',
                  fontSize: '15px',
                  boxShadow: '0 2px 8px var(--shadow-soft)',
                  fontFamily: 'Source Serif Pro, Georgia, serif'
                }}
                dangerouslySetInnerHTML={{
                  __html: formatAIResponse(aiData.context.content)
                }}
              />
            </div>
          )}
          
        </div>
      )}
    </div>
  );
};

export function AIBookChatModal({ 
  isOpen, 
  book, 
  onClose, 
  onSendMessage 
}: AIBookChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { isMobile, windowWidth } = useIsMobile();
  
  // Debug logging
  useEffect(() => {
    console.log('[AIBookChatModal] Window width:', windowWidth, 'isMobile:', isMobile);
  }, [windowWidth, isMobile]);

  // Initialize welcome message when book changes
  useEffect(() => {
    if (book && isOpen) {
      // Feature 11: Track AI tutor opened
      trackEvent('tutor_opened', withCommon({
        book_id: book.id,
        book_title: book.title
      }));

      const welcomeMessage: ChatMessage = {
        role: 'assistant',
        content: `Hello! I'm here to help you explore **${book.title}**. This ${book.subjects?.[0]?.toLowerCase() || 'classic'} work explores themes of ${book.subjects?.slice(0, 2).join(', ').toLowerCase() || 'literature and human nature'}. What would you like to know about this masterpiece?`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [book, isOpen]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    const message = inputValue.trim();
    if (!message || isLoading) return;

    // Feature 11: Track message sent
    const streamStartTime = Date.now();
    trackEvent('tutor_message_sent', withCommon({
      chars_in: message.length,
      book_id: book?.id,
      book_title: book?.title
    }));

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      let aiResponse: string;

      let aiData: AIResponseData = { content: '' };

      if (onSendMessage) {
        aiResponse = await onSendMessage(message);

        // Try to parse rich AI data
        try {
          aiData = JSON.parse(aiResponse);
          console.log('🎯 Parsed AI Data:', aiData); // Debug log
          aiResponse = aiData.content; // Use the main content for display
        } catch (e) {
          // If parsing fails, treat as simple string response
          console.log('❌ Failed to parse AI data:', e, 'Raw response:', aiResponse);
          aiData = { content: aiResponse };
        }
      } else {
        // Default demo response
        await new Promise(resolve => setTimeout(resolve, 1000));
        aiResponse = `I'm processing your question about "${book?.title}". In a real implementation, this would connect to an AI service to provide detailed analysis and answers about the literary work.`;
        aiData = { content: aiResponse };
      }

      // Feature 11: Track stream completed
      const streamDuration = Date.now() - streamStartTime;
      trackEvent('tutor_stream_completed', withCommon({
        chars_out: aiResponse.length,
        ms_stream: streamDuration,
        turns: messages.filter(m => m.role === 'user').length + 1,
        book_id: book?.id,
        book_title: book?.title
      }));

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        aiData: aiData
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const askQuestion = (question: string) => {
    setInputValue(question);
    setTimeout(() => handleSendMessage(), 100);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!book) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="ai-chat-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={handleOverlayClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="ai-chat-modal"
            style={{
              background: 'var(--bg-primary)',
              border: '2px solid var(--border-light)',
              borderRadius: isMobile ? '16px' : '20px',
              width: '100%',
              maxWidth: isMobile ? '100%' : '900px', // FULL WIDTH on mobile
              maxHeight: isMobile ? '100vh' : '80vh', // FULL HEIGHT on mobile
              margin: isMobile ? '0' : '0 auto',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 60px var(--shadow-heavy)'
            }}
          >
            {/* Chat Header */}
            <div 
              className="ai-chat-header"
              style={{
                background: 'var(--bg-secondary)',
                borderBottom: '2px solid var(--border-light)',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div 
                  className="ai-chat-book-cover"
                  style={{
                    width: '48px',
                    height: '72px',
                    background: 'var(--accent-primary)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--bg-primary)',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    textAlign: 'center',
                    flexShrink: 0,
                    fontFamily: 'Source Serif Pro, Georgia, serif'
                  }}
                >
                  {book.title.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 style={{
                    color: 'var(--text-accent)',
                    fontSize: '18px',
                    fontWeight: 700,
                    marginBottom: '4px',
                    lineHeight: '1.3',
                    fontFamily: 'Playfair Display, serif'
                  }}>
                    {book.title.length > 50 ? book.title.substring(0, 47) + '...' : book.title}
                  </h3>
                  <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '14px',
                    margin: 0,
                    fontFamily: 'Source Serif Pro, Georgia, serif'
                  }}>
                    by {book.author}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: '32px',
                  height: '32px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '20px',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--accent-primary)/10';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                ×
              </button>
            </div>

            {/* Chat Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Welcome Section */}
              {messages.length === 1 && (
                <div 
                  className="ai-chat-welcome"
                  style={{
                    padding: '32px 24px',
                    textAlign: 'center',
                    background: 'var(--accent-secondary)/10',
                    borderBottom: '2px solid var(--border-light)'
                  }}
                >
                  <h4 style={{
                    color: 'var(--accent-primary)',
                    fontSize: '20px',
                    fontWeight: 700,
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontFamily: 'Playfair Display, serif'
                  }}>
                    🤖 Ready to explore this book together?
                  </h4>
                  <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '16px',
                    lineHeight: '1.5',
                    marginBottom: '20px',
                    fontFamily: 'Source Serif Pro, Georgia, serif'
                  }}>
                    Ask about themes, characters, plot details, writing style, or anything that sparks your curiosity!
                  </p>
                  
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                  }}>
                    <button
                      onClick={() => askQuestion('What are the main themes?')}
                      style={{
                        padding: '8px 16px',
                        background: 'var(--accent-primary)/10',
                        border: '2px solid var(--accent-primary)/30',
                        borderRadius: '20px',
                        color: 'var(--accent-primary)',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--accent-primary)/20';
                        e.currentTarget.style.borderColor = 'var(--accent-primary)';
                        e.currentTarget.style.color = 'var(--accent-secondary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--accent-primary)/10';
                        e.currentTarget.style.borderColor = 'var(--accent-primary)/30';
                        e.currentTarget.style.color = 'var(--accent-primary)';
                      }}
                    >
                      What are the main themes?
                    </button>
                    <button
                      onClick={() => askQuestion('Tell me about the characters')}
                      style={{
                        padding: '8px 16px',
                        background: 'var(--accent-primary)/10',
                        border: '2px solid var(--accent-primary)/30',
                        borderRadius: '20px',
                        color: 'var(--accent-primary)',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--accent-primary)/20';
                        e.currentTarget.style.borderColor = 'var(--accent-primary)';
                        e.currentTarget.style.color = 'var(--accent-secondary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--accent-primary)/10';
                        e.currentTarget.style.borderColor = 'var(--accent-primary)/30';
                        e.currentTarget.style.color = 'var(--accent-primary)';
                      }}
                    >
                      Tell me about the characters
                    </button>
                    <button
                      onClick={() => askQuestion('What is the writing style?')}
                      style={{
                        padding: '8px 16px',
                        background: 'var(--accent-primary)/10',
                        border: '2px solid var(--accent-primary)/30',
                        borderRadius: '20px',
                        color: 'var(--accent-primary)',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--accent-primary)/20';
                        e.currentTarget.style.borderColor = 'var(--accent-primary)';
                        e.currentTarget.style.color = 'var(--accent-secondary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--accent-primary)/10';
                        e.currentTarget.style.borderColor = 'var(--accent-primary)/30';
                        e.currentTarget.style.color = 'var(--accent-primary)';
                      }}
                    >
                      What is the writing style?
                    </button>
                    <button
                      onClick={() => askQuestion('Why is this book important?')}
                      style={{
                        padding: '8px 16px',
                        background: 'var(--accent-primary)/10',
                        border: '2px solid var(--accent-primary)/30',
                        borderRadius: '20px',
                        color: 'var(--accent-primary)',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--accent-primary)/20';
                        e.currentTarget.style.borderColor = 'var(--accent-primary)';
                        e.currentTarget.style.color = 'var(--accent-secondary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--accent-primary)/10';
                        e.currentTarget.style.borderColor = 'var(--accent-primary)/30';
                        e.currentTarget.style.color = 'var(--accent-primary)';
                      }}
                    >
                      Why is this book important?
                    </button>
                  </div>
                </div>
              )}

              {/* Chat Messages */}
              <div
                ref={messagesContainerRef}
                className="ai-chat-messages"
                style={{
                  flex: 1,
                  padding: '24px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                {messages.map((message, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                      flexDirection: message.role === 'user' ? 'row-reverse' : 'row'
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        background: message.role === 'user'
                          ? 'var(--accent-secondary)'
                          : 'var(--accent-primary)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '16px',
                        flexShrink: 0
                      }}
                    >
                      {message.role === 'user' ? '👤' : '🤖'}
                    </div>
                    
                    {/* Use Progressive Disclosure for AI messages, simple display for user messages */}
                    {message.role === 'assistant' ? (
                      <AIMessageWithDisclosure message={message} />
                    ) : (
                      <div
                        style={{
                          background: 'var(--accent-secondary)/10',
                          border: '2px solid var(--accent-secondary)/30',
                          borderRadius: '12px',
                          padding: '16px',
                          color: 'var(--text-primary)',
                          lineHeight: '1.5',
                          flex: 1,
                          textAlign: 'right',
                          fontFamily: 'Source Serif Pro, Georgia, serif'
                        }}
                        dangerouslySetInnerHTML={{
                          __html: formatAIResponse(message.content)
                        }}
                      />
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      background: 'var(--accent-primary)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--bg-primary)',
                      fontSize: '16px',
                      flexShrink: 0
                    }}>
                      🤖
                    </div>
                    <div style={{
                      background: 'var(--accent-primary)/10',
                      border: '2px solid var(--accent-primary)/30',
                      borderRadius: '12px',
                      padding: '16px',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.5',
                      flex: 1,
                      fontFamily: 'Source Serif Pro, Georgia, serif'
                    }}>
                      Thinking...
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div 
                className="ai-chat-input-area"
                style={{
                  background: 'var(--bg-secondary)',
                  borderTop: '2px solid var(--border-light)',
                  padding: '20px 24px',
                  marginBottom: isMobile ? '20px' : '0'
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your question about the book..."
                    disabled={isLoading}
                    style={{
                      flex: 1,
                      background: 'var(--bg-primary)',
                      border: '2px solid var(--border-light)',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      color: 'var(--text-primary)',
                      fontSize: '16px',
                      resize: 'none',
                      minHeight: '44px',
                      maxHeight: '120px',
                      fontFamily: 'Source Serif Pro, Georgia, serif',
                      outline: 'none',
                      transition: 'border-color 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-primary)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-light)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-light)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    style={{
                      width: '44px',
                      height: '44px',
                      background: 'var(--accent-primary)',
                      border: 'none',
                      borderRadius: '12px',
                      color: 'var(--bg-primary)',
                      fontSize: '18px',
                      cursor: !inputValue.trim() || isLoading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: !inputValue.trim() || isLoading ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading && inputValue.trim()) {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px var(--shadow-medium)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    ↑
                  </button>
                </div>
              </div>

              {/* Educational Disclaimer */}
              <div 
                className="ai-chat-disclaimer"
                style={{
                  padding: '12px 24px',
                  background: 'var(--accent-primary)/10',
                  borderTop: '2px solid var(--border-light)',
                  textAlign: 'center',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.4',
                  fontFamily: 'Source Serif Pro, Georgia, serif'
                }}
              >
                ⚠️ AI responses are based on training knowledge and educational commentary, not text reproduction. All analyses represent fair use discussion of literary works for educational purposes.
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}