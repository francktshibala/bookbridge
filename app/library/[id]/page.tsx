'use client';

import React, { useState, useEffect, use } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { AccessibleWrapper } from '@/components/AccessibleWrapper';
import { AIChat } from '@/components/AIChat';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Book {
  id: string;
  title: string;
  author: string;
  description?: string;
  genre?: string;
  publishYear?: number;
  language: string;
  publicDomain: boolean;
}

interface BookDetailPageProps {
  params: { id: string };
}

export default function BookDetailPage({ params }: BookDetailPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBook = async () => {
      try {
        // Try to fetch book details from external API
        const response = await fetch(`/api/books/external/${resolvedParams.id}`);
        if (response.ok) {
          const bookData = await response.json();
          setBook({
            id: resolvedParams.id,
            title: bookData.title || 'Unknown Title',
            author: bookData.author || 'Unknown Author',
            description: bookData.description || '',
            genre: bookData.genre || 'Literature',
            publishYear: bookData.publishYear,
            language: bookData.language || 'en',
            publicDomain: true
          });
        } else {
          // Fallback: create a basic book object
          setBook({
            id: resolvedParams.id,
            title: 'Book Title Loading...',
            author: 'Author Loading...',
            description: '',
            language: 'en',
            publicDomain: true
          });
        }
      } catch (error) {
        console.error('Error loading book:', error);
        // Still create a fallback book to enable chat
        setBook({
          id: params.id,
          title: 'Book Analysis',
          author: 'Various Authors',
          description: 'Analyzing book content...',
          language: 'en',
          publicDomain: true
        });
      } finally {
        setLoading(false);
      }
    };

    loadBook();
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
        <div className="fixed inset-0 pointer-events-none" style={{
          background: `
            radial-gradient(circle at 20% 50%, rgba(102, 126, 234, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(118, 75, 162, 0.12) 0%, transparent 50%),
            radial-gradient(circle at 40% 20%, rgba(240, 147, 251, 0.08) 0%, transparent 50%)
          `
        }} />
        <div className="relative flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
            <p className="text-white/70">Loading book details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
        <div className="relative p-8 text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Book Not Found</h1>
          <Link href="/library" className="text-purple-400 hover:text-purple-300">
            ← Back to Library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
        {/* Magical Background */}
        <div className="fixed inset-0 pointer-events-none" style={{
          background: `
            radial-gradient(circle at 20% 50%, rgba(102, 126, 234, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(118, 75, 162, 0.12) 0%, transparent 50%),
            radial-gradient(circle at 40% 20%, rgba(240, 147, 251, 0.08) 0%, transparent 50%)
          `
        }} />

        <div className="relative max-w-7xl mx-auto">
          {/* Navigation & Book Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 pb-0"
          >
            <div className="flex items-center justify-between mb-6">
              {/* Enhanced Back to Library Link */}
              <Link 
                href="/library"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  background: 'rgba(26, 32, 44, 0.6)',
                  backdropFilter: 'blur(15px)',
                  border: '1px solid rgba(102, 126, 234, 0.3)',
                  borderRadius: '12px',
                  color: '#cbd5e0',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(102, 126, 234, 0.15)';
                  e.currentTarget.style.borderColor = '#667eea';
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(26, 32, 44, 0.6)';
                  e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.3)';
                  e.currentTarget.style.color = '#cbd5e0';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
                }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Library
              </Link>
              
              {/* Improved Book Info with Read Button */}
              <div className="flex items-center gap-6">
                <div className="text-right" style={{ 
                  minWidth: '200px',
                  margin: '8px 0'
                }}>
                  <h1 style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#ffffff',
                    marginBottom: '6px',
                    marginTop: '4px',
                    lineHeight: '1.2',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                  }}>
                    {book.title}
                  </h1>
                  <p style={{
                    fontSize: '14px',
                    color: '#a5b4fc',
                    fontWeight: '500',
                    lineHeight: '1.3',
                    marginBottom: '4px',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                  }}>
                    by {book.author}
                  </p>
                </div>
                
                {/* Enhanced Read Book Button */}
                <Link
                  href={`/library/${book.id}/read`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '600',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                    boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    minWidth: '90px',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.3)';
                  }}
                  aria-label={`Read ${book.title}`}
                >
                  <span style={{ fontSize: '16px' }}>📖</span>
                  Read
                </Link>
              </div>
            </div>
          </motion.div>

          {/* AI Chat Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="px-8 pb-8 h-full"
            style={{ minHeight: 'calc(100vh - 120px)' }}
          >
            <AIChat
              bookId={book.id}
              bookTitle={book.title}
              bookContext={`Title: ${book.title}, Author: ${book.author}${book.description ? `, Description: ${book.description}` : ''}`}
            />
          </motion.div>
        </div>
      </div>

    </>
  );
}