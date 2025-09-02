'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ExternalBook } from '@/types/book-sources';

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
          background: 'rgba(139, 92, 246, 0.1)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          borderRadius: '12px',
          padding: '16px',
          color: '#e2e8f0',
          lineHeight: '1.5',
          marginBottom: hasRichData ? '12px' : '0'
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
              background: showDetails ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)',
              border: `1px solid ${showDetails ? '#8b5cf6' : 'rgba(139, 92, 246, 0.3)'}`,
              borderRadius: '20px',
              padding: '8px 16px',
              color: showDetails ? '#c4b5fd' : '#a78bfa',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseEnter={(e) => {
              if (!showDetails) {
                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.3)';
                e.currentTarget.style.borderColor = '#8b5cf6';
                e.currentTarget.style.color = '#c4b5fd';
              }
            }}
            onMouseLeave={(e) => {
              if (!showDetails) {
                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                e.currentTarget.style.color = '#a78bfa';
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
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
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
                color: '#8b5cf6',
                fontSize: '18px',
                fontWeight: '700',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}>
                🎯 Think About This
              </h4>
              <div
                style={{
                  background: 'rgba(139, 92, 246, 0.08)',
                  borderLeft: '4px solid #8b5cf6',
                  padding: '16px 20px',
                  borderRadius: '0 12px 12px 0',
                  color: '#e2e8f0',
                  lineHeight: '1.7',
                  fontSize: '15px',
                  boxShadow: '0 2px 8px rgba(139, 92, 246, 0.1)'
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
                color: '#10b981',
                fontSize: '18px',
                fontWeight: '700',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}>
                🧠 Deep Insights
              </h4>
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  borderLeft: '4px solid #10b981',
                  padding: '16px 20px',
                  borderRadius: '0 12px 12px 0',
                  color: '#e2e8f0',
                  lineHeight: '1.7',
                  fontSize: '15px',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.1)'
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
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}>
                📚 Learning Context
              </h4>
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  borderLeft: '4px solid #f59e0b',
                  padding: '16px 20px',
                  borderRadius: '0 12px 12px 0',
                  color: '#e2e8f0',
                  lineHeight: '1.7',
                  fontSize: '15px',
                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.1)'
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

  // Initialize welcome message when book changes
  useEffect(() => {
    if (book && isOpen) {
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
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '900px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
            }}
          >
            {/* Chat Header */}
            <div 
              className="ai-chat-header"
              style={{
                background: '#1e293b',
                borderBottom: '1px solid #334155',
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
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    textAlign: 'center',
                    flexShrink: 0
                  }}
                >
                  {book.title.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 style={{
                    color: '#e2e8f0',
                    fontSize: '18px',
                    fontWeight: 700,
                    marginBottom: '4px',
                    lineHeight: '1.3'
                  }}>
                    {book.title.length > 50 ? book.title.substring(0, 47) + '...' : book.title}
                  </h3>
                  <p style={{
                    color: '#94a3b8',
                    fontSize: '14px',
                    margin: 0
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
                  color: '#94a3b8',
                  fontSize: '20px',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(148, 163, 184, 0.1)';
                  e.currentTarget.style.color = '#e2e8f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#94a3b8';
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
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(167, 139, 250, 0.1) 100%)',
                    borderBottom: '1px solid #334155'
                  }}
                >
                  <h4 style={{
                    color: '#8b5cf6',
                    fontSize: '20px',
                    fontWeight: 700,
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}>
                    🤖 Ready to explore this book together?
                  </h4>
                  <p style={{
                    color: '#94a3b8',
                    fontSize: '16px',
                    lineHeight: '1.5',
                    marginBottom: '20px'
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
                        background: 'rgba(139, 92, 246, 0.2)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        borderRadius: '20px',
                        color: '#a78bfa',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(139, 92, 246, 0.3)';
                        e.currentTarget.style.borderColor = '#8b5cf6';
                        e.currentTarget.style.color = '#c4b5fd';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                        e.currentTarget.style.color = '#a78bfa';
                      }}
                    >
                      What are the main themes?
                    </button>
                    <button
                      onClick={() => askQuestion('Tell me about the characters')}
                      style={{
                        padding: '8px 16px',
                        background: 'rgba(139, 92, 246, 0.2)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        borderRadius: '20px',
                        color: '#a78bfa',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(139, 92, 246, 0.3)';
                        e.currentTarget.style.borderColor = '#8b5cf6';
                        e.currentTarget.style.color = '#c4b5fd';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                        e.currentTarget.style.color = '#a78bfa';
                      }}
                    >
                      Tell me about the characters
                    </button>
                    <button
                      onClick={() => askQuestion('What is the writing style?')}
                      style={{
                        padding: '8px 16px',
                        background: 'rgba(139, 92, 246, 0.2)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        borderRadius: '20px',
                        color: '#a78bfa',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(139, 92, 246, 0.3)';
                        e.currentTarget.style.borderColor = '#8b5cf6';
                        e.currentTarget.style.color = '#c4b5fd';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                        e.currentTarget.style.color = '#a78bfa';
                      }}
                    >
                      What is the writing style?
                    </button>
                    <button
                      onClick={() => askQuestion('Why is this book important?')}
                      style={{
                        padding: '8px 16px',
                        background: 'rgba(139, 92, 246, 0.2)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        borderRadius: '20px',
                        color: '#a78bfa',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(139, 92, 246, 0.3)';
                        e.currentTarget.style.borderColor = '#8b5cf6';
                        e.currentTarget.style.color = '#c4b5fd';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                        e.currentTarget.style.color = '#a78bfa';
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
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
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
                          background: 'rgba(102, 126, 234, 0.1)',
                          border: '1px solid rgba(102, 126, 234, 0.2)',
                          borderRadius: '12px',
                          padding: '16px',
                          color: '#e2e8f0',
                          lineHeight: '1.5',
                          flex: 1,
                          textAlign: 'right'
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
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '16px',
                      flexShrink: 0
                    }}>
                      🤖
                    </div>
                    <div style={{
                      background: 'rgba(139, 92, 246, 0.1)',
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                      borderRadius: '12px',
                      padding: '16px',
                      color: '#94a3b8',
                      lineHeight: '1.5',
                      flex: 1
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
                  background: '#1e293b',
                  borderTop: '1px solid #334155',
                  padding: '20px 24px',
                  marginBottom: window.innerWidth <= 768 ? '20px' : '0'
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
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      color: '#e2e8f0',
                      fontSize: '16px',
                      resize: 'none',
                      minHeight: '44px',
                      maxHeight: '120px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      transition: 'border-color 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#8b5cf6';
                      e.currentTarget.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#334155';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    style={{
                      width: '44px',
                      height: '44px',
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
                      border: 'none',
                      borderRadius: '12px',
                      color: 'white',
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
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)';
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
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderTop: '1px solid #334155',
                  textAlign: 'center',
                  fontSize: '12px',
                  color: '#94a3b8',
                  lineHeight: '1.4'
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