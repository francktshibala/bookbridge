'use client';

import { useEffect, useState } from 'react';

interface Book {
  id: string;
  title: string;
  author: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  audioGenerated: boolean;
  createdAt: string;
  priority: 'low' | 'medium' | 'high';
}

type CEFR = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

interface CoverageLevel { total: number; withAudio: number; percent: number }
interface BookCoverage { title: string; author: string; levels: Record<CEFR, CoverageLevel> }

const mockBooks: Book[] = [
  {
    id: '1',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    status: 'completed',
    audioGenerated: true,
    createdAt: '2025-08-15T10:30:00Z',
    priority: 'high'
  },
  {
    id: '2',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    status: 'processing',
    audioGenerated: false,
    createdAt: '2025-08-18T14:20:00Z',
    priority: 'medium'
  },
  {
    id: '3',
    title: '1984',
    author: 'George Orwell',
    status: 'failed',
    audioGenerated: false,
    createdAt: '2025-08-19T09:15:00Z',
    priority: 'high'
  },
  {
    id: '4',
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    status: 'pending',
    audioGenerated: false,
    createdAt: '2025-08-20T08:00:00Z',
    priority: 'low'
  },
  {
    id: '5',
    title: 'The Catcher in the Rye',
    author: 'J.D. Salinger',
    status: 'completed',
    audioGenerated: true,
    createdAt: '2025-08-16T16:45:00Z',
    priority: 'medium'
  },
  {
    id: '6',
    title: 'Jane Eyre',
    author: 'Charlotte Brontë',
    status: 'pending',
    audioGenerated: false,
    createdAt: '2025-08-20T10:30:00Z',
    priority: 'high'
  }
];

export function BookManagement() {
  const [books, setBooks] = useState<Book[]>(mockBooks);
  const [filter, setFilter] = useState<'all' | 'pending' | 'processing' | 'completed' | 'failed'>('all');

  // Load real enhanced books if available
  useEffect(() => {
    fetch('/api/books/enhanced')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (Array.isArray(data?.books) && data.books.length > 0) {
          const mapped: Book[] = data.books.map((b: any, idx: number) => ({
            id: b.id || String(idx + 1),
            title: b.title,
            author: b.author,
            status: 'pending',
            audioGenerated: false,
            createdAt: new Date().toISOString(),
            priority: 'medium'
          }));
          setBooks(mapped);
        }
      })
      .catch(() => {});
  }, []);

  // Load per-book/level coverage
  const [coverage, setCoverage] = useState<Record<string, BookCoverage>>({});
  useEffect(() => {
    fetch('/api/admin/books/coverage')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (data?.coverage) setCoverage(data.coverage);
      })
      .catch(() => {});
  }, []);

  const getStatusBadge = (status: Book['status']) => {
    const styles = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      completed: 'bg-green-500/20 text-green-400 border-green-500/30',
      failed: 'bg-red-500/20 text-red-400 border-red-500/30'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPriorityBadge = (priority: Book['priority']) => {
    const styles = {
      low: 'bg-gray-500/20 text-gray-400',
      medium: 'bg-orange-500/20 text-orange-400',
      high: 'bg-red-500/20 text-red-400'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[priority]}`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  };

  const filteredBooks = filter === 'all' ? books : books.filter(book => book.status === filter);

  const triggerGeneration = async (bookId: string) => {
    try {
      const res = await fetch('/api/admin/audio/backfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId })
      });
      if (!res.ok) throw new Error('Backfill failed');
      setBooks(books.map(book => 
        book.id === bookId 
          ? { ...book, status: 'processing' as const }
          : book
      ));
    } catch (_) {
      setBooks(books.map(book => 
        book.id === bookId 
          ? { ...book, status: 'failed' as const }
          : book
      ));
    }
  };

  return (
    <div className="space-y-6">
      {/* Book Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
            <span className="mr-2">➕</span>
            Add New Book
          </button>
          <button className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
            <span className="mr-2">🎵</span>
            Generate All Pending
          </button>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2">
          {(['all', 'pending', 'processing', 'completed', 'failed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status !== 'all' && (
                <span className="ml-1 text-xs">
                  ({books.filter(b => b.status === status).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Book Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{books.length}</div>
          <div className="text-sm text-slate-400">Total Books</div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">{books.filter(b => b.audioGenerated).length}</div>
          <div className="text-sm text-slate-400">Audio Ready</div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">{books.filter(b => b.status === 'processing').length}</div>
          <div className="text-sm text-slate-400">Processing</div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-400">{books.filter(b => b.status === 'failed').length}</div>
          <div className="text-sm text-slate-400">Failed</div>
        </div>
      </div>

      {/* Book Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBooks.map((book) => (
          <div key={book.id} className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-blue-500 transition-colors">
            {/* Book Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="w-12 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white text-xs font-bold">
                    {book.title.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-white font-semibold line-clamp-2">{book.title}</h3>
                  <p className="text-slate-400 text-sm">by {book.author}</p>
                </div>
              </div>
            </div>

            {/* Status and Priority */}
            <div className="flex items-center justify-between mb-4">
              {getStatusBadge(book.status)}
              {getPriorityBadge(book.priority)}
            </div>

            {/* Audio Coverage by CEFR */}
            <div className="space-y-2 mb-4">
              {(['A1','A2','B1','B2','C1','C2'] as CEFR[]).map(level => {
                const cov = coverage[book.id]?.levels?.[level];
                const total = cov?.total ?? 0;
                const withAudio = cov?.withAudio ?? 0;
                const percent = cov?.percent ?? 0;
                return (
                  <div key={level} className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 w-8">{level}</span>
                    <div className="flex-1 mx-2 h-2 bg-slate-700 rounded-full">
                      <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="text-xs text-slate-300 w-20 text-right">{withAudio}/{total} ({percent}%)</span>
                    {total > withAudio && (
                      <button
                        onClick={() => triggerGeneration(book.id)}
                        className="ml-2 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                      >Fill</button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {!book.audioGenerated && book.status !== 'processing' && (
                <button 
                  onClick={() => triggerGeneration(book.id)}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  🎵 Generate Audio
                </button>
              )}
              {book.status === 'processing' && (
                <button className="flex-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors">
                  ⏸️ Pause
                </button>
              )}
              {book.status === 'failed' && (
                <button 
                  onClick={() => triggerGeneration(book.id)}
                  className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  🔄 Retry
                </button>
              )}
              <button className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors">
                ⚙️
              </button>
            </div>

            {/* Created Date */}
            <div className="mt-3 pt-3 border-t border-slate-700">
              <p className="text-xs text-slate-500">
                Added {new Date(book.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}