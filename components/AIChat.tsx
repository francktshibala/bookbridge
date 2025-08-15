'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AccessibleWrapper } from '@/components/AccessibleWrapper';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { motion, AnimatePresence } from 'framer-motion';
import { voiceService } from '@/lib/voice-service';
import { SmartAudioPlayer } from '@/components/SmartAudioPlayer';

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

  // Debug logging to track component lifecycle
  useEffect(() => {
    console.log('🎵 FormattedAIResponse mounted with content length:', content?.length || 0);
    return () => {
      console.log('🎵 FormattedAIResponse unmounting');
    };
  }, []);

  useEffect(() => {
    console.log('🎵 FormattedAIResponse content changed, length:', content?.length || 0);
  }, [content]);

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
        '<span class="ai-quote">"$1"</span>'
      );
      
      // Highlight citations in parentheses
      formattedParagraph = formattedParagraph.replace(
        /\(([^)]+)\)/g,
        '<span style="color: #667eea; font-weight: 600; font-size: 13px;">($1)</span>'
      );
      
      // Bold text formatting
      formattedParagraph = formattedParagraph.replace(
        /\*\*([^*]+)\*\*/g,
        '<strong style="color: #e2e8f0; font-weight: 700;">$1</strong>'
      );

      return (
        <div
          key={index}
          style={{
            marginBottom: '16px',
            lineHeight: '1.8',
            fontSize: '18px'
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
            ? 'rgba(45, 55, 72, 0.8)'
            : 'rgba(26, 32, 44, 0.6)',
          backdropFilter: 'blur(15px)',
          borderRadius: '12px',
          padding: '16px',
          margin: '-8px',
          border: isMultiAgent 
            ? '2px solid rgba(102, 126, 234, 0.4)'
            : '1px solid rgba(102, 126, 234, 0.2)',
          position: 'relative',
          boxShadow: isMultiAgent 
            ? '0 8px 32px rgba(0, 0, 0, 0.3)'
            : '0 4px 20px rgba(0, 0, 0, 0.2)'
        }}
      >
        
        {formatContent(content)}
        
        {/* Professional Audio Player */}
        <div style={{ marginTop: '16px' }}>
          <SmartAudioPlayer 
            key={`audio-${content.substring(0, 50)}`} // Stable key based on content
            text={content}
            enableHighlighting={false}
            showHighlightedText={false}
            variant="chat"
            onStart={() => console.log('Audio started')}
            onEnd={() => console.log('Audio ended')}
            onError={(error) => console.error('Audio error:', error)}
          />
        </div>
        
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
                    background: 'rgba(45, 55, 72, 0.8)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '8px',
                    padding: '12px',
                    border: '1px solid rgba(102, 126, 234, 0.3)'
                  }}
                >
                  {agentResponses.research && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#667eea', marginBottom: '6px' }}>
                        🔍 RESEARCH AGENT
                      </div>
                      <div style={{ fontSize: '13px', lineHeight: '1.5', color: '#cbd5e0' }}>
                        {agentResponses.research}
                      </div>
                    </div>
                  )}
                  
                  {agentResponses.analysis && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#667eea', marginBottom: '6px' }}>
                        📊 ANALYSIS AGENT
                      </div>
                      <div style={{ fontSize: '13px', lineHeight: '1.5', color: '#cbd5e0' }}>
                        {agentResponses.analysis}
                      </div>
                    </div>
                  )}
                  
                  {agentResponses.citations && (
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#667eea', marginBottom: '6px' }}>
                        📚 CITATION AGENT
                      </div>
                      <div style={{ fontSize: '13px', lineHeight: '1.5', color: '#cbd5e0' }}>
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
  const [selectedVoice, setSelectedVoice] = useState<'standard' | 'openai' | 'elevenlabs'>('standard');
  const [selectedSubVoice, setSelectedSubVoice] = useState<string>('');
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  // Note: Response mode is now automatically determined by AI based on query intent
  // CONVERSATION PERSISTENCE RE-ENABLED - Auth cycles fixed
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loadedConversationId, setLoadedConversationId] = useState<string | null>(null);
  const [paginationMetadata, setPaginationMetadata] = useState<{
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  } | null>(null);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadOlderMessages = async () => {
    if (!conversationId || !paginationMetadata?.hasMore || isLoadingOlderMessages) {
      return;
    }

    setIsLoadingOlderMessages(true);
    console.log('📜 Loading older messages...', {
      currentOffset: paginationMetadata.offset + paginationMetadata.limit,
      hasMore: paginationMetadata.hasMore
    });

    try {
      const offset = paginationMetadata.offset + paginationMetadata.limit;
      const response = await fetch(`/api/conversations/${conversationId}/messages?offset=${offset}&limit=30`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Older messages loaded:', data.messages?.length || 0);
        
        if (data.messages && data.messages.length > 0) {
          const formattedMessages = data.messages.map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            sender: msg.sender,
            timestamp: new Date(msg.createdAt)
          }));
          
          // Prepend older messages to the beginning
          setMessages(prevMessages => [...formattedMessages, ...prevMessages]);
          setPaginationMetadata(data.metadata);
          console.log('🎉 Added', formattedMessages.length, 'older messages');
        }
      } else {
        console.error('❌ Failed to load older messages:', response.status);
      }
    } catch (error) {
      console.error('💥 Error loading older messages:', error);
    } finally {
      setIsLoadingOlderMessages(false);
    }
  };

  useEffect(() => {
    // Only scroll to bottom for new messages, not when loading older ones
    if (!isLoadingOlderMessages) {
      scrollToBottom();
    }
  }, [messages, isLoadingOlderMessages]);

  // Scroll detection for loading older messages
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const scrollPosition = scrollTop + clientHeight;
      const totalHeight = scrollHeight;
      
      // If user scrolled to top 10% of the container, load older messages
      if (scrollTop < 100 && paginationMetadata?.hasMore && !isLoadingOlderMessages) {
        console.log('🔝 User scrolled to top, loading older messages...');
        loadOlderMessages();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [paginationMetadata?.hasMore, isLoadingOlderMessages, conversationId]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // CONVERSATION PERSISTENCE RE-ENABLED - Auth cycles fixed
  // Initialize conversationId from sessionStorage on mount
  useEffect(() => {
    console.log('🚀 AIChat component mounted for bookId:', bookId);
    if (typeof window !== 'undefined' && bookId) {
      const key = `conversation-${bookId}`;
      const stored = sessionStorage.getItem(key);
      console.log('🔑 Initializing conversationId from sessionStorage:', { key, stored, hasWindow: typeof window !== 'undefined' });
      if (stored) {
        console.log('✅ Found stored conversation, setting conversationId:', stored);
        setConversationId(stored);
      } else {
        console.log('📭 No stored conversation found for this book');
      }
    } else {
      console.log('⚠️ Cannot initialize - missing window or bookId:', { hasWindow: typeof window !== 'undefined', bookId });
    }
  }, [bookId]);

  // Load messages when conversationId exists - with proper timing and Fast Refresh protection
  useEffect(() => {
    console.log('🔄 ConversationId effect triggered:', { conversationId, loadedConversationId, messagesLength: messages.length });
    
    const loadMessages = async () => {
      // Only load if we have a conversationId and haven't loaded this specific conversation yet
      if (conversationId && conversationId !== loadedConversationId) {
        console.log('📥 Loading messages for NEW conversation:', conversationId);
        
        try {
          const response = await fetch(`/api/conversations/${conversationId}/messages?latest=true`);
          console.log('📡 Messages API response:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('✅ Messages loaded:', data.messages?.length || 0, 'messages');
            console.log('📊 Pagination metadata:', data.metadata);
            
            if (data.messages && data.messages.length > 0) {
              const formattedMessages = data.messages.map((msg: any) => ({
                id: msg.id,
                content: msg.content,
                sender: msg.sender,
                timestamp: new Date(msg.createdAt),
                isMultiAgent: msg.isMultiAgent,
                agentResponses: msg.agentResponses
              }));
              
              console.log('🔍 Loaded message structure:', formattedMessages[0]);
              setMessages(formattedMessages);
              setPaginationMetadata(data.metadata);
              setLoadedConversationId(conversationId); // Mark this conversation as loaded
              console.log('🎉 Successfully set', formattedMessages.length, 'messages to state for conversation:', conversationId);
            } else {
              // Empty conversation - still mark as loaded to prevent re-attempts
              setLoadedConversationId(conversationId);
              setPaginationMetadata(data.metadata || null);
              console.log('📭 No messages in conversation, marked as loaded');
            }
          } else {
            const errorText = await response.text();
            console.log('❌ Messages API error:', errorText);
          }
        } catch (error) {
          console.log('💥 Messages loading error:', error);
        }
      } else if (!conversationId) {
        console.log('⏭️ No conversationId, skipping message load');
      } else if (conversationId === loadedConversationId) {
        console.log('⏭️ Conversation', conversationId, 'already loaded, skipping');
      }
    };

    loadMessages();
  }, [conversationId, loadedConversationId]);

  // Close voice modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showVoiceModal && !(event.target as Element).closest('[data-voice-modal]')) {
        setShowVoiceModal(false);
      }
    };

    if (showVoiceModal) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showVoiceModal]);

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
        credentials: 'include', // Include cookies for server-side auth
        body: JSON.stringify({
          query: userMessage.content,
          bookId,
          bookContext,
          // responseMode removed - AI automatically determines based on query intent
          conversationId: conversationId, // Re-enabled conversation persistence
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

      // CONVERSATION PERSISTENCE RE-ENABLED
      // Save conversationId if returned from backend
      if (data.conversationId && !conversationId) {
        console.log('💾 Saving new conversationId:', data.conversationId);
        setConversationId(data.conversationId);
        // Persist to sessionStorage
        if (typeof window !== 'undefined') {
          const key = `conversation-${bookId}`;
          sessionStorage.setItem(key, data.conversationId);
          console.log('💾 Saved to sessionStorage:', key, '=', data.conversationId);
        }
        console.log('✅ Conversation started:', data.conversationId);
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
        minHeight: 'calc(100vh - 120px)',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f1419 100%)',
        backgroundAttachment: 'fixed',
        borderRadius: '20px',
        overflow: 'hidden'
      }}
    >

      <div
        ref={messagesContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          background: 'transparent'
        }}
        role="log"
        aria-live="polite"
        aria-label="Chat conversation"
      >
        {/* Loading indicator for older messages */}
        <AnimatePresence>
          {isLoadingOlderMessages && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              style={{
                textAlign: 'center',
                padding: '16px',
                background: 'rgba(26, 32, 44, 0.6)',
                backdropFilter: 'blur(15px)',
                borderRadius: '12px',
                border: '1px solid rgba(102, 126, 234, 0.3)',
                marginBottom: '16px'
              }}
            >
              <div style={{
                fontSize: '14px',
                color: '#cbd5e0',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(102, 126, 234, 0.3)',
                    borderTop: '2px solid #667eea',
                    borderRadius: '50%'
                  }}
                />
                Loading older messages...
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                background: 'rgba(26, 32, 44, 0.6)',
                backdropFilter: 'blur(15px)',
                borderRadius: '16px',
                border: '2px dashed rgba(102, 126, 234, 0.3)',
                margin: '20px 0'
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>🌟</div>
              <p style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#f7fafc',
                marginBottom: '8px',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
              }}>
                Ready to explore this book together?
              </p>
              <p style={{
                fontSize: '14px',
                color: '#cbd5e0',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                lineHeight: '1.5',
                marginBottom: '16px'
              }}>
                Ask about themes, characters, plot details, writing style, or anything that sparks your curiosity!
              </p>
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                lineHeight: '1.4',
                padding: '12px',
                backgroundColor: 'rgba(45, 55, 72, 0.6)',
                borderRadius: '8px',
                border: '1px solid rgba(102, 126, 234, 0.2)'
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
                    maxWidth: '90%',
                    borderRadius: '20px',
                    padding: '20px 24px',
                    background: message.sender === 'user' 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : 'rgba(26, 32, 44, 0.8)',
                    backdropFilter: message.sender === 'user' ? 'none' : 'blur(15px)',
                    color: message.sender === 'user' ? 'white' : '#e2e8f0',
                    boxShadow: message.sender === 'user'
                      ? '0 4px 12px rgba(102, 126, 234, 0.25)'
                      : '0 2px 8px rgba(0, 0, 0, 0.08)',
                    border: message.sender === 'user' ? 'none' : '1px solid rgba(102, 126, 234, 0.3)',
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
                    fontSize: '18px',
                    lineHeight: '1.7',
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
                background: 'rgba(26, 32, 44, 0.8)',
                backdropFilter: 'blur(15px)',
                borderRadius: '18px',
                padding: '16px 20px',
                maxWidth: '85%',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(102, 126, 234, 0.3)'
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
                  <span style={{ marginLeft: '8px', color: '#cbd5e0' }}>
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
                  background: 'rgba(45, 55, 72, 0.8)',
                  backdropFilter: 'blur(15px)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  boxShadow: '0 4px 20px rgba(239, 68, 68, 0.2)'
                }}
              >
                <div style={{
                  fontSize: '14px',
                  color: '#fca5a5',
                  fontWeight: '600',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  marginBottom: '8px'
                }}>
                  ⚠️ <strong>Oops!</strong> {error}
                </div>
                <button
                  onClick={() => setError(null)}
                  style={{
                    color: '#fca5a5',
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

      {/* Voice Settings Modal */}
      <AnimatePresence>
        {showVoiceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(8px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setShowVoiceModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3 }}
              style={{
                background: 'rgba(26, 32, 44, 0.95)',
                backdropFilter: 'blur(20px)',
                borderRadius: '16px',
                padding: '24px',
                border: '2px solid rgba(102, 126, 234, 0.3)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                maxWidth: '400px',
                width: '100%',
                maxHeight: '80vh',
                overflowY: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
              data-voice-modal
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px'
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#f7fafc',
                  margin: 0,
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                }}>
                  🎵 Voice Settings
                </h3>
                <button
                  onClick={() => setShowVoiceModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#9ca3af',
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                    e.currentTarget.style.color = '#f87171';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.color = '#9ca3af';
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{
                  fontSize: '14px',
                  color: '#cbd5e0',
                  margin: '0 0 16px 0',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                }}>
                  Choose a voice for AI responses
                </p>

                {/* Standard Voice */}
                <button
                  onClick={() => {
                    setSelectedVoice('standard');
                    setSelectedSubVoice('');
                    setShowVoiceModal(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: selectedVoice === 'standard' 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : 'rgba(45, 55, 72, 0.6)',
                    border: selectedVoice === 'standard' 
                      ? 'none'
                      : '1px solid rgba(102, 126, 234, 0.3)',
                    borderRadius: '8px',
                    color: selectedVoice === 'standard' ? 'white' : '#cbd5e0',
                    fontSize: '14px',
                    fontWeight: '600',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedVoice !== 'standard') {
                      e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedVoice !== 'standard') {
                      e.currentTarget.style.background = 'rgba(45, 55, 72, 0.6)';
                    }
                  }}
                >
                  <span>🔊 Standard Voice</span>
                  <span style={{ 
                    fontSize: '12px', 
                    opacity: 0.8,
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#10b981',
                    padding: '4px 8px',
                    borderRadius: '6px'
                  }}>
                    Free
                  </span>
                </button>

                {/* OpenAI Voices */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{
                    fontSize: '12px',
                    color: '#667eea',
                    fontWeight: '700',
                    marginBottom: '8px',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                  }}>
                    🤖 OpenAI Voices
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {['Alloy', 'Echo', 'Fable', 'Onyx', 'Nova', 'Shimmer'].map((voice) => (
                      <button
                        key={`openai-${voice}`}
                        onClick={() => {
                          setSelectedVoice('openai');
                          setSelectedSubVoice(voice);
                          setShowVoiceModal(false);
                        }}
                        style={{
                          padding: '10px 12px',
                          background: selectedVoice === 'openai' && selectedSubVoice === voice
                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            : 'rgba(45, 55, 72, 0.6)',
                          border: selectedVoice === 'openai' && selectedSubVoice === voice
                            ? 'none'
                            : '1px solid rgba(102, 126, 234, 0.3)',
                          borderRadius: '8px',
                          color: selectedVoice === 'openai' && selectedSubVoice === voice ? 'white' : '#a5b4fc',
                          fontSize: '12px',
                          fontWeight: '500',
                          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!(selectedVoice === 'openai' && selectedSubVoice === voice)) {
                            e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!(selectedVoice === 'openai' && selectedSubVoice === voice)) {
                            e.currentTarget.style.background = 'rgba(45, 55, 72, 0.6)';
                          }
                        }}
                      >
                        {voice}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ElevenLabs Voices */}
                <div>
                  <div style={{
                    fontSize: '12px',
                    color: '#667eea',
                    fontWeight: '700',
                    marginBottom: '8px',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                  }}>
                    ✨ ElevenLabs Voices
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {['Rachel', 'Drew', 'Clyde', 'Paul', 'Domi', 'Dave'].map((voice) => (
                      <button
                        key={`elevenlabs-${voice}`}
                        onClick={() => {
                          setSelectedVoice('elevenlabs');
                          setSelectedSubVoice(voice);
                          setShowVoiceModal(false);
                        }}
                        style={{
                          padding: '10px 12px',
                          background: selectedVoice === 'elevenlabs' && selectedSubVoice === voice
                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            : 'rgba(45, 55, 72, 0.6)',
                          border: selectedVoice === 'elevenlabs' && selectedSubVoice === voice
                            ? 'none'
                            : '1px solid rgba(102, 126, 234, 0.3)',
                          borderRadius: '8px',
                          color: selectedVoice === 'elevenlabs' && selectedSubVoice === voice ? 'white' : '#a5b4fc',
                          fontSize: '12px',
                          fontWeight: '500',
                          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!(selectedVoice === 'elevenlabs' && selectedSubVoice === voice)) {
                            e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!(selectedVoice === 'elevenlabs' && selectedSubVoice === voice)) {
                            e.currentTarget.style.background = 'rgba(45, 55, 72, 0.6)';
                          }
                        }}
                      >
                        {voice}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: 'rgba(251, 191, 36, 0.1)',
                  border: '1px solid rgba(251, 191, 36, 0.2)',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: '#fbbf24',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                }}>
                  <strong>Pro voices</strong> require premium subscription for enhanced quality
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.footer 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(102, 126, 234, 0.2)',
          background: 'rgba(26, 32, 44, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '0 0 20px 20px',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)'
        }}
      >
        <form onSubmit={handleSubmit} style={{ marginBottom: '12px' }}>
          {/* Input Row with Voice Controls */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
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
                padding: '18px 22px',
                border: isListening ? '2px solid #10b981' : '2px solid rgba(102, 126, 234, 0.3)',
                borderRadius: '16px',
                fontSize: '17px',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                fontWeight: '500',
                background: isListening ? 'rgba(16, 185, 129, 0.1)' : 'rgba(45, 55, 72, 0.8)',
                backdropFilter: 'blur(10px)',
                color: '#e2e8f0',
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

            {/* Voice Settings and Microphone */}
            {speechRecognition && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Voice Settings Button */}
                <motion.button
                  type="button"
                  onClick={() => setShowVoiceModal(true)}
                  disabled={isProcessing}
                  whileHover={{ scale: isProcessing ? 1 : 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    padding: '18px',
                    background: 'rgba(45, 55, 72, 0.8)',
                    backdropFilter: 'blur(10px)',
                    color: '#a5b4fc',
                    border: '2px solid rgba(102, 126, 234, 0.3)',
                    borderRadius: '16px',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    opacity: isProcessing ? 0.5 : 1,
                    transition: 'all 0.2s ease'
                  }}
                  aria-label="Voice settings"
                  title="Configure voice settings"
                >
                  ⚙️
                </motion.button>

                {/* Voice Input Button */}
                <motion.button
                  type="button"
                  onClick={isListening ? stopVoiceInput : startVoiceInput}
                  disabled={isProcessing}
                  whileHover={{ scale: isProcessing ? 1 : 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    padding: '18px',
                    background: isListening
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : 'rgba(45, 55, 72, 0.8)',
                    backdropFilter: 'blur(10px)',
                    color: isListening ? 'white' : '#a5b4fc',
                    border: isListening ? 'none' : '2px solid rgba(102, 126, 234, 0.3)',
                    borderRadius: '16px',
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
              </div>
            )}
          </div>


          {/* Send Button Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
                  borderRadius: '12px',
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
              
              <div style={{
                fontSize: '12px',
                color: '#9ca3af',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                fontWeight: '500'
              }}>
                Press <kbd style={{
                  background: 'rgba(45, 55, 72, 0.6)',
                  border: '1px solid rgba(102, 126, 234, 0.3)',
                  color: '#cbd5e0',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>Enter</kbd> to send
              </div>
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
                    fontSize: '11px',
                    color: '#e2e8f0',
                    fontWeight: '600',
                    background: 'rgba(45, 55, 72, 0.6)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    cursor: 'pointer',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                    e.currentTarget.style.borderColor = '#f87171';
                    e.currentTarget.style.color = '#fca5a5';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(45, 55, 72, 0.6)';
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                    e.currentTarget.style.color = '#e2e8f0';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  aria-label="Clear chat history"
                >
                  🗑️ Clear Chat
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </form>

      </motion.footer>
    </AccessibleWrapper>
  );
};