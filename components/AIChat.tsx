'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AccessibleWrapper } from '@/components/AccessibleWrapper';
import { useAccessibility } from '@/contexts/AccessibilityContext';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
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
  const [error, setError] = useState<string | null>(null);
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
    setError(null);

    announceToScreenReader('Processing your question...');

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessage.content,
          bookId,
          bookContext
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get AI response');
      }

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        content: data.response,
        sender: 'ai',
        timestamp: new Date()
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
      className="flex flex-col h-full max-h-[600px] border border-gray-200 rounded-lg bg-white"
    >
      <header className="p-4 border-b border-gray-200 bg-gray-50">
        <h2 id="ai-chat-heading" className="text-lg font-semibold">
          {bookTitle ? `AI Assistant - ${bookTitle}` : 'AI Assistant'}
        </h2>
        <p className="text-sm text-secondary">
          Ask questions about the book and get AI-powered answers
        </p>
      </header>

      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        role="log"
        aria-live="polite"
        aria-label="Chat conversation"
      >
        {messages.length === 0 && (
          <div className="text-center text-secondary py-8">
            <p>Start a conversation by asking a question about the book!</p>
            <p className="text-sm mt-2">
              Try asking about themes, characters, plot, or specific passages.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <AccessibleWrapper
            key={message.id}
            as="article"
            role="article"
            ariaSetsize={messages.length}
            ariaPosinset={index + 1}
            ariaLabelledBy={`message-${message.id}-sender`}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.sender === 'user'
                  ? 'bg-accent-primary text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div
                id={`message-${message.id}-sender`}
                className="text-xs font-medium mb-1"
              >
                {message.sender === 'user' ? 'You' : 'AI Assistant'}
              </div>
              <div className="text-sm whitespace-pre-wrap">
                {message.content}
              </div>
              <div className="text-xs opacity-75 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </AccessibleWrapper>
        ))}

        {isProcessing && (
          <AccessibleWrapper
            as="div"
            ariaLive="polite"
            className="flex justify-start"
          >
            <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
              <div className="text-xs font-medium mb-1">AI Assistant</div>
              <div className="text-sm">
                <span className="animate-pulse">Thinking...</span>
              </div>
            </div>
          </AccessibleWrapper>
        )}

        {error && (
          <AccessibleWrapper
            as="div"
            role="alert"
            ariaLive="assertive"
            className="bg-red-50 border border-red-200 rounded-lg p-3"
          >
            <div className="text-sm text-red-800">
              <strong>Error:</strong> {error}
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 text-sm mt-1 underline"
            >
              Dismiss
            </button>
          </AccessibleWrapper>
        )}

        <div ref={messagesEndRef} />
      </div>

      <footer className="p-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about the book..."
            disabled={isProcessing}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent disabled:opacity-50"
            aria-label="Enter your question"
            aria-describedby="input-help"
          />
          
          <button
            type="submit"
            disabled={isProcessing || !inputValue.trim()}
            className="px-4 py-2 bg-accent-primary text-white rounded-md hover:bg-accent-primary/90 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send question"
          >
            {isProcessing ? 'Sending...' : 'Send'}
          </button>
        </form>

        <div className="flex justify-between items-center mt-2">
          <div id="input-help" className="text-xs text-secondary">
            Press Enter to send, Shift+Enter for new line
          </div>
          
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-xs text-secondary hover:text-gray-700 underline"
              aria-label="Clear chat history"
            >
              Clear Chat
            </button>
          )}
        </div>
      </footer>
    </AccessibleWrapper>
  );
};