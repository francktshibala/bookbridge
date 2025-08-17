'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';

interface Book {
  id: string;
  title: string;
  author: string;
  description?: string;
  genre?: string;
  cefrLevels?: string;
  estimatedHours?: number;
  totalChunks?: number;
  status: 'enhanced' | 'processing' | 'planned';
  progress?: number;
  chaptersRead?: number;
}

const ENHANCED_BOOK_IDS = [
  'gutenberg-1342', // Pride and Prejudice
  'gutenberg-1513', // Romeo and Juliet  
  'gutenberg-11',   // Alice in Wonderland
  'gutenberg-84',   // Frankenstein
  'gutenberg-514',  // Little Women
  'gutenberg-46',   // A Christmas Carol
  'gutenberg-64317' // The Great Gatsby
];

const BOOK_METADATA = {
  'gutenberg-1342': {
    description: 'Follow Elizabeth Bennet\'s journey through love, social expectations, and personal growth in this timeless romance.',
    genre: 'Romance',
    cefrLevels: 'B1-C2',
    estimatedHours: 8,
    status: 'enhanced' as const
  },
  'gutenberg-1513': {
    description: 'Shakespeare\'s tragic tale of star-crossed lovers, adapted for modern ESL learners with simplified language options.',
    genre: 'Tragedy',
    cefrLevels: 'B1-C2',
    estimatedHours: 3,
    status: 'enhanced' as const
  },
  'gutenberg-11': {
    description: 'Join Alice on her whimsical journey down the rabbit hole in this beloved children\'s classic.',
    genre: 'Fantasy',
    cefrLevels: 'A2-C1',
    estimatedHours: 2.5,
    status: 'enhanced' as const
  },
  'gutenberg-84': {
    description: 'Mary Shelley\'s groundbreaking Gothic novel about science, ambition, and the consequences of playing God.',
    genre: 'Gothic',
    cefrLevels: 'B2-C2',
    estimatedHours: 6,
    status: 'enhanced' as const
  },
  'gutenberg-514': {
    description: 'Follow the March sisters as they navigate childhood, dreams, and growing up during the American Civil War.',
    genre: 'Coming of Age',
    cefrLevels: 'A2-B2',
    estimatedHours: 10,
    status: 'enhanced' as const
  },
  'gutenberg-46': {
    description: 'Ebenezer Scrooge\'s transformative Christmas journey in Dickens\' beloved holiday tale.',
    genre: 'Classic',
    cefrLevels: 'B1-C1',
    estimatedHours: 2,
    status: 'processing' as const
  },
  'gutenberg-64317': {
    description: 'Jazz Age glamour and the American Dream in Fitzgerald\'s iconic novel.',
    genre: 'American Classic',
    cefrLevels: 'B2-C2',
    estimatedHours: 4,
    status: 'planned' as const
  }
};

const ENHANCED_FEATURES = [
  {
    icon: '🎯',
    title: 'AI Text Simplification',
    description: '6 CEFR levels (A1-C2)'
  },
  {
    icon: '🎧',
    title: 'Premium Audio',
    description: '12 voices, word highlighting'
  },
  {
    icon: '📚',
    title: 'Vocabulary Builder',
    description: 'Interactive word definitions'
  },
  {
    icon: '📊',
    title: 'Progress Tracking',
    description: 'Reading analytics'
  }
];

export default function EnhancedCollectionPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchBooks();
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchBooks = async () => {
    try {
      const supabase = createClient();
      
      // Fetch books from database
      const { data: dbBooks, error } = await supabase
        .from('books')
        .select('*')
        .in('id', ENHANCED_BOOK_IDS);

      if (error) {
        console.error('Error fetching books:', error);
        // Fallback to metadata only
        setBooks(createFallbackBooks());
        return;
      }

      // Combine database data with metadata
      const enhancedBooks = ENHANCED_BOOK_IDS.map(bookId => {
        const dbBook = dbBooks?.find(b => b.id === bookId);
        const metadata = BOOK_METADATA[bookId as keyof typeof BOOK_METADATA];
        
        return {
          id: bookId,
          title: dbBook?.title || bookId.replace('gutenberg-', 'Book '),
          author: dbBook?.author || 'Unknown Author',
          description: metadata?.description || '',
          genre: metadata?.genre || 'Classic',
          cefrLevels: metadata?.cefrLevels || 'B1-C2',
          estimatedHours: metadata?.estimatedHours || 4,
          totalChunks: dbBook?.total_chunks || 25,
          status: metadata?.status || 'planned',
          progress: 0,
          chaptersRead: 0
        };
      });

      setBooks(enhancedBooks);
    } catch (error) {
      console.error('Error in fetchBooks:', error);
      setBooks(createFallbackBooks());
    } finally {
      setLoading(false);
    }
  };

  const createFallbackBooks = (): Book[] => {
    return [
      {
        id: 'gutenberg-1342',
        title: 'Pride and Prejudice',
        author: 'Jane Austen',
        description: 'Follow Elizabeth Bennet\'s journey through love, social expectations, and personal growth in this timeless romance.',
        genre: 'Romance',
        cefrLevels: 'B1-C2',
        estimatedHours: 8,
        totalChunks: 61,
        status: 'enhanced',
        progress: 0,
        chaptersRead: 0
      },
      {
        id: 'gutenberg-1513',
        title: 'Romeo and Juliet',
        author: 'William Shakespeare',
        description: 'Shakespeare\'s tragic tale of star-crossed lovers, adapted for modern ESL learners with simplified language options.',
        genre: 'Tragedy',
        cefrLevels: 'B1-C2',
        estimatedHours: 3,
        totalChunks: 25,
        status: 'enhanced',
        progress: 0,
        chaptersRead: 0
      },
      {
        id: 'gutenberg-11',
        title: 'Alice in Wonderland',
        author: 'Lewis Carroll',
        description: 'Join Alice on her whimsical journey down the rabbit hole in this beloved children\'s classic.',
        genre: 'Fantasy',
        cefrLevels: 'A2-C1',
        estimatedHours: 2.5,
        totalChunks: 12,
        status: 'enhanced',
        progress: 0,
        chaptersRead: 0
      },
      {
        id: 'gutenberg-84',
        title: 'Frankenstein',
        author: 'Mary Wollstonecraft Shelley',
        description: 'Mary Shelley\'s groundbreaking Gothic novel about science, ambition, and the consequences of playing God.',
        genre: 'Gothic',
        cefrLevels: 'B2-C2',
        estimatedHours: 6,
        totalChunks: 24,
        status: 'enhanced',
        progress: 0,
        chaptersRead: 0
      },
      {
        id: 'gutenberg-514',
        title: 'Little Women',
        author: 'Louisa May Alcott',
        description: 'Follow the March sisters as they navigate childhood, dreams, and growing up during the American Civil War.',
        genre: 'Coming of Age',
        cefrLevels: 'A2-B2',
        estimatedHours: 10,
        totalChunks: 47,
        status: 'enhanced',
        progress: 0,
        chaptersRead: 0
      },
      {
        id: 'gutenberg-46',
        title: 'A Christmas Carol',
        author: 'Charles Dickens',
        description: 'Ebenezer Scrooge\'s transformative Christmas journey in Dickens\' beloved holiday tale.',
        genre: 'Classic',
        cefrLevels: 'B1-C1',
        estimatedHours: 2,
        totalChunks: 5,
        status: 'processing',
        progress: 0,
        chaptersRead: 0
      },
      {
        id: 'gutenberg-64317',
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        description: 'Jazz Age glamour and the American Dream in Fitzgerald\'s iconic novel.',
        genre: 'American Classic',
        cefrLevels: 'B2-C2',
        estimatedHours: 4,
        totalChunks: 30,
        status: 'planned',
        progress: 0,
        chaptersRead: 0
      }
    ];
  };

  const getGenres = (): string[] => {
    const genres = Array.from(new Set(books.map(book => book.genre).filter(Boolean) as string[]));
    return ['All', ...genres];
  };

  const getFilteredBooks = () => {
    if (selectedFilter === 'All') return books;
    return books.filter(book => book.genre === selectedFilter);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'enhanced':
        return { text: '✨ Enhanced', bgColor: '#10b981', textColor: 'white' };
      case 'processing':
        return { text: '🔄 Processing', bgColor: '#f59e0b', textColor: 'white' };
      case 'planned':
        return { text: '⏳ Planned', bgColor: '#6b7280', textColor: 'white' };
      default:
        return { text: '📖 Available', bgColor: '#6366f1', textColor: 'white' };
    }
  };

  const getButtonConfig = (status: string) => {
    switch (status) {
      case 'enhanced':
        return {
          text: 'Start Reading',
          disabled: false,
          bgColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          textColor: 'white'
        };
      case 'processing':
        return {
          text: 'Coming Soon',
          href: '#',
          disabled: true,
          bgColor: '#475569',
          textColor: '#94a3b8'
        };
      case 'planned':
        return {
          text: 'Coming Soon',
          href: '#',
          disabled: true,
          bgColor: '#475569',
          textColor: '#94a3b8'
        };
      default:
        return {
          text: 'Coming Soon',
          href: '#',
          disabled: true,
          bgColor: '#475569',
          textColor: '#94a3b8'
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-lg text-gray-300">Loading enhanced collection...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a' }}>

      {/* Page Header - exactly matching wireframe */}
      <div style={{
        padding: '60px 40px 40px',
        textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: '800',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '16px',
          margin: '0 0 16px 0'
        }}>
          ✨ Enhanced Collection
        </h1>
        <p style={{
          fontSize: '20px',
          color: '#94a3b8',
          marginBottom: '32px',
          margin: '0 0 32px 0'
        }}>
          Classic literature enhanced with AI-powered ESL learning tools
        </p>
        
        {/* Filter Pills - exactly matching wireframe */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          {getGenres().map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedFilter(genre)}
              style={{
                padding: '8px 16px',
                background: selectedFilter === genre ? '#667eea' : 'rgba(102, 126, 234, 0.2)',
                color: selectedFilter === genre ? 'white' : '#667eea',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {genre} ({genre === 'All' ? books.length : books.filter(b => b.genre === genre).length})
            </button>
          ))}
        </div>
      </div>

      {/* Enhanced Features Overview - exactly matching wireframe */}
      <div style={{ 
        padding: '40px', 
        background: '#1e293b',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <h3 style={{
          color: '#e2e8f0',
          textAlign: 'center',
          marginBottom: '32px',
          fontSize: '24px',
          margin: '0 0 32px 0'
        }}>
          ✨ Enhanced Features
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '24px',
          maxWidth: '1000px',
          width: '100%'
        }}>
          {ENHANCED_FEATURES.map((feature) => (
            <div key={feature.title} style={{
              textAlign: 'center',
              padding: '20px'
            }}>
              <div style={{
                fontSize: '32px',
                marginBottom: '12px'
              }}>
                {feature.icon}
              </div>
              <h4 style={{
                color: '#10b981',
                marginBottom: '8px',
                margin: '0 0 8px 0'
              }}>
                {feature.title}
              </h4>
              <p style={{
                color: '#94a3b8',
                fontSize: '14px',
                margin: '0'
              }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Full Book Collection - exactly matching wireframe */}
      <div style={{ 
        padding: '40px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '24px',
          justifyItems: 'center'
        }}>
          {getFilteredBooks().map((book) => {
            const badge = getStatusBadge(book.status);
            const buttonConfig = getButtonConfig(book.status);
            
            return (
              <div
                key={book.id}
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '16px',
                  padding: '24px',
                  position: 'relative',
                  width: '100%',
                  maxWidth: '350px'
                }}
              >
                {/* Status Badge */}
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: badge.bgColor,
                  color: badge.textColor,
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {badge.text}
                </div>
                
                {/* Book Info */}
                <h3 style={{
                  color: '#e2e8f0',
                  fontSize: '20px',
                  fontWeight: '700',
                  marginBottom: '8px',
                  margin: '0 0 8px 0'
                }}>
                  {book.title}
                </h3>
                <p style={{
                  color: '#94a3b8',
                  marginBottom: '12px',
                  margin: '0 0 12px 0'
                }}>
                  {book.author}
                </p>
                
                {/* Stats */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  marginBottom: '16px',
                  fontSize: '14px'
                }}>
                  <span style={{ color: '#10b981' }}>{book.cefrLevels}</span>
                  <span style={{ color: '#94a3b8' }}>~{book.estimatedHours} hours</span>
                  <span style={{ color: '#94a3b8' }}>{book.genre}</span>
                </div>
                
                {/* Description */}
                <p style={{
                  color: '#94a3b8',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  marginBottom: '16px',
                  margin: '0 0 16px 0'
                }}>
                  {book.description}
                </p>
                
                {/* Progress/Status Area */}
                {book.status === 'enhanced' && (
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      color: '#10b981',
                      marginBottom: '4px'
                    }}>
                      <span>Progress: {book.progress}%</span>
                      <span>{book.chaptersRead}/{book.totalChunks} chapters</span>
                    </div>
                    <div style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      height: '4px',
                      borderRadius: '2px'
                    }}>
                      <div style={{
                        background: '#10b981',
                        height: '100%',
                        width: `${book.progress}%`,
                        borderRadius: '2px'
                      }}></div>
                    </div>
                  </div>
                )}
                
                {book.status === 'processing' && (
                  <div style={{
                    background: 'rgba(251, 158, 11, 0.1)',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      fontSize: '12px',
                      color: '#f59e0b'
                    }}>
                      <span>🔄 AI enhancement in progress...</span>
                    </div>
                  </div>
                )}
                
                {book.status === 'planned' && (
                  <div style={{
                    background: 'rgba(107, 114, 128, 0.1)',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      fontSize: '12px',
                      color: '#6b7280'
                    }}>
                      <span>⏳ Planned for enhancement</span>
                    </div>
                  </div>
                )}
                
                {/* Action Button */}
                {buttonConfig.disabled ? (
                  <button
                    disabled
                    style={{
                      width: '100%',
                      background: buttonConfig.bgColor,
                      color: buttonConfig.textColor,
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: '600',
                      cursor: 'not-allowed'
                    }}
                  >
                    {buttonConfig.text}
                  </button>
                ) : (
                  <a
                    href={`/library/${book.id}/read`}
                    style={{
                      display: 'block',
                      width: '100%',
                      background: buttonConfig.bgColor,
                      color: buttonConfig.textColor,
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textAlign: 'center',
                      textDecoration: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    {buttonConfig.text}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}