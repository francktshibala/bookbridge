'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AccessibleWrapper } from '@/components/AccessibleWrapper';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { motion, AnimatePresence } from 'framer-motion';
import { voiceService } from '@/lib/voice-service';
import { AudioPlayer } from '@/components/AudioPlayer';

// Component to format AI responses with better styling and citation support
const FormattedAIResponse: React.FC<{ 
  content: string; 
  isMultiAgent?: boolean;
  agentResponses?: {
    research?: string;
    analysis?: string;
    citations?: string;
  };
  voiceSupported?: boolean;
}> = ({ content, isMultiAgent, agentResponses, voiceSupported }) => {
  const [showAgentDetails, setShowAgentDetails] = useState(false);

  // Safety check
  if (!content) {
    return <div>No content to display</div>;
  }

  // Enhanced formatting for multi-agent responses
  const formatContent = (text: string) => {
    const paragraphs = text.split('\n\n');
    
    return paragraphs.map((paragraph, index) => {
      let formattedParagraph = paragraph;
      
      // Highlight quoted text with special styling
      formattedParagraph = formattedParagraph.replace(
        /"([^"]+)"/g,
        '<span style="background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); padding: 2px 6px; border-radius: 4px; font-weight: 600; border-left: 3px solid #fdcb6e;">"$1"</span>'
      );
      
      // Highlight citations in parentheses
      formattedParagraph = formattedParagraph.replace(
        /\(([^)]+)\)/g,
        '<span style="color: #667eea; font-weight: 600; font-size: 13px;">($1)</span>'
      );
      
      // Bold text formatting
      formattedParagraph = formattedParagraph.replace(
        /\*\*([^*]+)\*\*/g,
        '<strong style="color: #2d3748; font-weight: 700;">$1</strong>'
      );

      return (
        <div
          key={index}
          style={{
            marginBottom: '16px',
            lineHeight: '1.7',
            fontSize: '15px'
          }}
          dangerouslySetInnerHTML={{ __html: formattedParagraph }}
        />
      );
    });
  };

  try {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          background: isMultiAgent 
            ? 'linear-gradient(135deg, rgba(248, 250, 255, 0.8) 0%, rgba(240, 244, 255, 0.6) 100%)'
            : 'rgba(248, 250, 255, 0.5)',
          borderRadius: '12px',
          padding: '16px',
          margin: '-8px',
          border: isMultiAgent 
            ? '2px solid rgba(102, 126, 234, 0.3)'
            : '1px solid rgba(224, 231, 255, 0.5)',
          position: 'relative'
        }}
      >
        {isMultiAgent && (
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '10px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            🧠 Multi-Agent
          </div>
        )}
        
        {formatContent(content)}
        
        {/* Professional Audio Player */}
        {voiceSupported && (
          <div style={{ marginTop: '16px' }}>
            <AudioPlayer 
              text={content}
              onStart={() => console.log('Audio started')}
              onEnd={() => console.log('Audio ended')}
              onError={(error) => console.error('Audio error:', error)}
            />
          </div>
        )}
        
        {isMultiAgent && agentResponses && (
          <div style={{ marginTop: '16px', borderTop: '1px solid rgba(224, 231, 255, 0.5)', paddingTop: '16px' }}>
            <button
              onClick={() => setShowAgentDetails(!showAgentDetails)}
              style={{
                background: 'none',
                border: 'none',
                color: '#667eea',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 0',
                textDecoration: 'underline'
              }}
            >
              {showAgentDetails ? '🔼' : '🔽'} {showAgentDetails ? 'Hide' : 'Show'} Agent Analysis
            </button>
            
            <AnimatePresence>
              {showAgentDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    marginTop: '12px',
                    background: 'white',
                    borderRadius: '8px',
                    padding: '12px',
                    border: '1px solid rgba(224, 231, 255, 0.8)'
                  }}
                >
                  {agentResponses.research && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#667eea', marginBottom: '6px' }}>
                        🔍 RESEARCH AGENT
                      </div>
                      <div style={{ fontSize: '13px', lineHeight: '1.5', color: '#4a5568' }}>
                        {agentResponses.research}
                      </div>
                    </div>
                  )}
                  
                  {agentResponses.analysis && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#667eea', marginBottom: '6px' }}>
                        📊 ANALYSIS AGENT
                      </div>
                      <div style={{ fontSize: '13px', lineHeight: '1.5', color: '#4a5568' }}>
                        {agentResponses.analysis}
                      </div>
                    </div>
                  )}
                  
                  {agentResponses.citations && (
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#667eea', marginBottom: '6px' }}>
                        📚 CITATION AGENT
                      </div>
                      <div style={{ fontSize: '13px', lineHeight: '1.5', color: '#4a5568' }}>
                        {agentResponses.citations}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    );
  } catch (error) {
    console.error('Error rendering FormattedAIResponse:', error);
    // Fallback to plain text display
    return (
      <div style={{ 
        whiteSpace: 'pre-wrap',
        padding: '8px',
        background: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        {String(content || '')}
      </div>
    );
  }
};

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  isMultiAgent?: boolean;
  agentResponses?: {
    research?: string;
    analysis?: string;
    citations?: string;
  };
}

interface AIChatProps {
  bookId?: string;
  bookTitle?: string;
  bookContext?: string;
}

export const AIChat: React.FC<AIChatProps> = ({ bookId, bookTitle, bookContext }) => {
  const { announceToScreenReader } = useAccessibility();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);
  const [responseMode, setResponseMode] = useState<'brief' | 'detailed'>('detailed');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Initialize voice capabilities
  useEffect(() => {
    const initVoice = () => {
      // Check for speech recognition support
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.addEventListener('result', (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setInputValue(finalTranscript.trim());
          }
        });

        recognition.addEventListener('start', () => {
          setIsListening(true);
          announceToScreenReader('Voice input started. Speak your question.', 'polite');
        });

        recognition.addEventListener('end', () => {
          setIsListening(false);
          announceToScreenReader('Voice input stopped.', 'polite');
        });

        recognition.addEventListener('error', (event: any) => {
          setIsListening(false);
          setError(`Voice recognition error: ${event.error}`);
          announceToScreenReader(`Voice recognition error: ${event.error}`, 'assertive');
        });

        setSpeechRecognition(recognition);
      }

      // Check for text-to-speech support
      setVoiceSupported(voiceService.isTextToSpeechSupported());
    };

    initVoice();
  }, [announceToScreenReader]);

  const startVoiceInput = () => {
    if (speechRecognition && !isListening) {
      setError(null);
      speechRecognition.start();
    }
  };

  const stopVoiceInput = () => {
    if (speechRecognition && isListening) {
      speechRecognition.stop();
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: inputValue.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);
    setProcessingStatus('');
    setError(null);

    announceToScreenReader('Processing your question...');

    try {
      // Simulate progress updates
      if (bookId) {
        setProcessingStatus('Accessing book content...');
        announceToScreenReader('Accessing book content...');
      }

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessage.content,
          bookId,
          bookContext,
          responseMode
        })
      });

      if (bookId) {
        setProcessingStatus('Analyzing your question...');
        announceToScreenReader('Analyzing your question...');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get AI response');
      }

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        content: data.response,
        sender: 'ai',
        timestamp: new Date(),
        isMultiAgent: data.multiAgent,
        agentResponses: data.agentResponses
      };

      setMessages(prev => [...prev, aiMessage]);
      announceToScreenReader('AI response received. Use arrow keys to navigate to the answer.');

    } catch (error) {
      console.error('AI request error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
      announceToScreenReader(`Error: ${errorMessage}`, 'assertive');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
    announceToScreenReader('Chat cleared');
    inputRef.current?.focus();
  };

  return (
    <AccessibleWrapper
      as="section"
      ariaLabelledBy="ai-chat-heading"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: '600px',
        background: 'transparent'
      }}
    >
      <motion.header 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          padding: '24px 24px 20px 24px',
          borderBottom: '1px solid #f0f4ff',
          background: 'linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%)',
          borderRadius: '20px 20px 0 0'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 id="ai-chat-heading" style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#1a202c',
              marginBottom: '8px',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
            }}>
              💬 AI Conversation
            </h2>
            <p style={{
              fontSize: '14px',
              color: '#667eea',
              fontWeight: '500',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              lineHeight: '1.5'
            }}>
              Ask thoughtful questions about <strong>{bookTitle || 'this book'}</strong> and get intelligent insights
            </p>
          </div>
          
          {/* Response Mode Toggle */}
          <div style={{
            display: 'flex',
            gap: '8px',
            background: 'white',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid #e0e7ff',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
          }}>
            <motion.button
              onClick={() => setResponseMode('brief')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: '8px 16px',
                background: responseMode === 'brief' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'transparent',
                color: responseMode === 'brief' ? 'white' : '#6b7280',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              aria-label="Quick answer mode"
              aria-pressed={responseMode === 'brief'}
            >
              ⚡ Quick Answer
            </motion.button>
            
            <motion.button
              onClick={() => setResponseMode('detailed')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: '8px 16px',
                background: responseMode === 'detailed' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'transparent',
                color: responseMode === 'detailed' ? 'white' : '#6b7280',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              aria-label="Detailed analysis mode"
              aria-pressed={responseMode === 'detailed'}
            >
              📚 Detailed Analysis
            </motion.button>
          </div>
        </div>
      </motion.header>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          background: '#fafbff'
        }}
        role="log"
        aria-live="polite"
        aria-label="Chat conversation"
      >
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                background: 'white',
                borderRadius: '16px',
                border: '2px dashed #e0e7ff',
                margin: '20px 0'
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>🌟</div>
              <p style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
              }}>
                Ready to explore this book together?
              </p>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                lineHeight: '1.5',
                marginBottom: '16px'
              }}>
                Ask about themes, characters, plot details, writing style, or anything that sparks your curiosity!
              </p>
              <div style={{
                fontSize: '12px',
                color: '#9ca3af',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                lineHeight: '1.4',
                padding: '12px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <strong>📚 Analysis Disclaimer:</strong> AI responses are based on training knowledge and educational commentary, not text reproduction. 
                All analyses represent fair use discussion of literary works for educational purposes.
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <AccessibleWrapper
                as="article"
                role="article"
                ariaSetsize={messages.length}
                ariaPosinset={index + 1}
                ariaLabelledBy={`message-${message.id}-sender`}
                style={{
                  display: 'flex',
                  justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    borderRadius: '18px',
                    padding: '16px 20px',
                    background: message.sender === 'user' 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : 'white',
                    color: message.sender === 'user' ? 'white' : '#1f2937',
                    boxShadow: message.sender === 'user'
                      ? '0 4px 12px rgba(102, 126, 234, 0.25)'
                      : '0 2px 8px rgba(0, 0, 0, 0.08)',
                    border: message.sender === 'user' ? 'none' : '1px solid #f0f4ff',
                    position: 'relative'
                  }}
                >
                  <div
                    id={`message-${message.id}-sender`}
                    style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      marginBottom: '8px',
                      color: message.sender === 'user' ? 'rgba(255,255,255,0.9)' : '#667eea',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    {message.sender === 'user' ? '👤 You' : '🤖 AI Assistant'}
                  </div>
                  <div style={{
                    fontSize: '15px',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                    fontWeight: '500'
                  }}>
                    {message.sender === 'ai' ? (
                      <FormattedAIResponse 
                        content={message.content} 
                        isMultiAgent={message.isMultiAgent}
                        agentResponses={message.agentResponses}
                        voiceSupported={voiceSupported}
                      />
                    ) : (
                      message.content
                    )}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    opacity: 0.7,
                    marginTop: '8px',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                    color: message.sender === 'user' ? 'rgba(255,255,255,0.8)' : '#9ca3af'
                  }}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </AccessibleWrapper>
            </motion.div>
          ))}
        </AnimatePresence>

        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <AccessibleWrapper
              as="div"
              aria-live="polite"
              style={{ display: 'flex', justifyContent: 'flex-start' }}
            >
              <div style={{
                background: 'white',
                borderRadius: '18px',
                padding: '16px 20px',
                maxWidth: '85%',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                border: '1px solid #f0f4ff'
              }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#667eea',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  🤖 AI Assistant
                </div>
                <div style={{
                  fontSize: '15px',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#667eea'
                    }}
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#667eea'
                    }}
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#667eea'
                    }}
                  />
                  <span style={{ marginLeft: '8px', color: '#6b7280' }}>
                    {processingStatus || 'Thinking deeply...'}
                  </span>
                </div>
              </div>
            </AccessibleWrapper>
          </motion.div>
        )}

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <AccessibleWrapper
                as="div"
                role="alert"
                aria-live="assertive"
                style={{
                  background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                  border: '1px solid #fca5a5',
                  borderRadius: '16px',
                  padding: '16px 20px'
                }}
              >
                <div style={{
                  fontSize: '14px',
                  color: '#dc2626',
                  fontWeight: '600',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  marginBottom: '8px'
                }}>
                  ⚠️ <strong>Oops!</strong> {error}
                </div>
                <button
                  onClick={() => setError(null)}
                  style={{
                    color: '#dc2626',
                    fontSize: '13px',
                    fontWeight: '500',
                    textDecoration: 'underline',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                  }}
                >
                  Dismiss
                </button>
              </AccessibleWrapper>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      <motion.footer 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        style={{
          padding: '20px 24px 24px 24px',
          borderTop: '1px solid #f0f4ff',
          background: 'linear-gradient(135deg, #f8faff 0%, #ffffff 100%)',
          borderRadius: '0 0 20px 20px'
        }}
      >
        <form onSubmit={handleSubmit} style={{ marginBottom: '12px' }}>
          {/* Input Row with Voice Button */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
            <motion.input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening... speak your question" : "Type your question about the book..."}
              disabled={isProcessing || isListening}
              whileFocus={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
              style={{
                flex: 1,
                padding: '14px 18px',
                border: isListening ? '2px solid #10b981' : '2px solid #e0e7ff',
                borderRadius: '14px',
                fontSize: '15px',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                fontWeight: '500',
                background: isListening ? '#f0fdf4' : 'white',
                color: '#1f2937',
                outline: 'none',
                transition: 'all 0.2s ease',
                opacity: (isProcessing || isListening) ? 0.8 : 1
              }}
              onFocus={(e) => {
                if (!isListening) {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                }
              }}
              onBlur={(e) => {
                if (!isListening) {
                  e.target.style.borderColor = '#e0e7ff';
                  e.target.style.boxShadow = 'none';
                }
              }}
              aria-label="Enter your question"
              aria-describedby="input-help"
            />

            {/* Voice Input Button */}
            {speechRecognition && (
              <motion.button
                type="button"
                onClick={isListening ? stopVoiceInput : startVoiceInput}
                disabled={isProcessing}
                whileHover={{ scale: isProcessing ? 1 : 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  padding: '14px',
                  background: isListening
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : '#f8faff',
                  color: isListening ? 'white' : '#667eea',
                  border: isListening ? 'none' : '2px solid #e0e7ff',
                  borderRadius: '14px',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  opacity: isProcessing ? 0.5 : 1,
                  transition: 'all 0.2s ease',
                  boxShadow: isListening ? '0 4px 12px rgba(16, 185, 129, 0.25)' : 'none'
                }}
                aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                title={isListening ? 'Stop listening' : 'Click to speak your question'}
              >
                {isListening ? (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    🛑
                  </motion.div>
                ) : (
                  '🎤'
                )}
              </motion.button>
            )}
            
            <motion.button
              type="submit"
              disabled={isProcessing || !inputValue.trim()}
              whileHover={{ 
                scale: (isProcessing || !inputValue.trim()) ? 1 : 1.05,
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: '14px 24px',
                background: (isProcessing || !inputValue.trim()) 
                  ? '#e5e7eb' 
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: (isProcessing || !inputValue.trim()) ? '#9ca3af' : 'white',
                border: 'none',
                borderRadius: '14px',
                fontSize: '15px',
                fontWeight: '600',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                cursor: (isProcessing || !inputValue.trim()) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: (isProcessing || !inputValue.trim()) 
                  ? 'none' 
                  : '0 4px 12px rgba(102, 126, 234, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              aria-label="Send question"
            >
              {isProcessing ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid transparent',
                      borderTop: '2px solid currentColor',
                      borderRadius: '50%'
                    }}
                  />
                  Sending...
                </>
              ) : (
                <>
                  ✨ Send
                </>
              )}
            </motion.button>
          </div>
        </form>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          gap: '16px'
        }}>
          <div id="input-help" style={{
            fontSize: '12px',
            color: '#6b7280',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            fontWeight: '500'
          }}>
            💡 Press <kbd style={{
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '11px',
              fontWeight: '600'
            }}>Enter</kbd> to send, <kbd style={{
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '11px',
              fontWeight: '600'
            }}>Shift+Enter</kbd> for new line
            {speechRecognition && (
              <span style={{ display: 'block', marginTop: '4px' }}>
                🎤 Click microphone to speak your question • 🔊 Click "Listen" on responses for audio
              </span>
            )}
          </div>
          
          <AnimatePresence>
            {messages.length > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={clearChat}
                style={{
                  fontSize: '12px',
                  color: '#ef4444',
                  fontWeight: '600',
                  background: 'none',
                  border: 'none',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fef2f2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none';
                }}
                aria-label="Clear chat history"
              >
                🗑️ Clear Chat
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.footer>
    </AccessibleWrapper>
  );
};