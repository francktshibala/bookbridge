'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ExternalBook } from '@/types/book-sources';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIBookChatModalProps {
  isOpen: boolean;
  book: ExternalBook | null;
  onClose: () => void;
  onSendMessage?: (message: string) => Promise<string>;
}

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
      
      if (onSendMessage) {
        aiResponse = await onSendMessage(message);
      } else {
        // Default demo response
        await new Promise(resolve => setTimeout(resolve, 1000));
        aiResponse = `I'm processing your question about "${book?.title}". In a real implementation, this would connect to an AI service to provide detailed analysis and answers about the literary work.`;
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
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
                    <div
                      style={{
                        background: message.role === 'user'
                          ? 'rgba(102, 126, 234, 0.1)'
                          : 'rgba(139, 92, 246, 0.1)',
                        border: `1px solid ${message.role === 'user'
                          ? 'rgba(102, 126, 234, 0.2)'
                          : 'rgba(139, 92, 246, 0.2)'}`,
                        borderRadius: '12px',
                        padding: '16px',
                        color: '#e2e8f0',
                        lineHeight: '1.5',
                        flex: 1,
                        textAlign: message.role === 'user' ? 'right' : 'left'
                      }}
                      dangerouslySetInnerHTML={{
                        __html: message.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      }}
                    />
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
                  padding: '20px 24px'
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