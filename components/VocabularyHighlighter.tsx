'use client';

import { useState } from 'react';

interface VocabularyWord {
  word: string;
  definition: string;
  level: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface VocabularyHighlighterProps {
  text: string;
  eslLevel: string;
  mode: 'original' | 'simplified';
}

// Common difficult words for ESL learners by CEFR level
const VOCABULARY_DATABASE: Record<string, VocabularyWord> = {
  'rented': {
    word: 'rented',
    definition: 'To pay money to use something that belongs to someone else',
    level: 'B1',
    difficulty: 'medium'
  },
  'prejudice': {
    word: 'prejudice',
    definition: 'An unfair feeling of dislike for a person or group',
    level: 'B2',
    difficulty: 'hard'
  },
  'possession': {
    word: 'possession',
    definition: 'Something that you own or have',
    level: 'B1',
    difficulty: 'medium'
  },
  'acknowledged': {
    word: 'acknowledged',
    definition: 'To accept or admit that something exists or is true',
    level: 'C1',
    difficulty: 'hard'
  },
  'universally': {
    word: 'universally',
    definition: 'By everyone; in every case',
    level: 'B2',
    difficulty: 'hard'
  },
  'fortune': {
    word: 'fortune',
    definition: 'A large amount of money or valuable possessions',
    level: 'B1',
    difficulty: 'medium'
  },
  'consequently': {
    word: 'consequently',
    definition: 'As a result; therefore',
    level: 'B2',
    difficulty: 'medium'
  },
  'circumstances': {
    word: 'circumstances',
    definition: 'The conditions that affect a situation',
    level: 'B2',
    difficulty: 'medium'
  }
};

export function VocabularyHighlighter({ text, eslLevel, mode }: VocabularyHighlighterProps) {
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });


  // Get CEFR level difficulty mapping
  const getLevelDifficulty = (level: string): number => {
    const levels = { 'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 6 };
    return levels[level as keyof typeof levels] || 3;
  };

  const userLevel = getLevelDifficulty(eslLevel);

  // Format text into proper paragraphs and highlight vocabulary
  const formatAndHighlightText = (text: string) => {
    if (!text) return text;

    // Split into paragraphs (by double newlines or periods followed by capital letters)
    let formattedText = text
      .replace(/\.\s*([A-Z])/g, '.</p><p>$1') // Split sentences into paragraphs
      .replace(/^\s*/, '<p>') // Add opening paragraph tag
      .replace(/\s*$/, '</p>'); // Add closing paragraph tag

    // Highlight vocabulary words
    Object.keys(VOCABULARY_DATABASE).forEach(word => {
      const vocabWord = VOCABULARY_DATABASE[word];
      const wordLevel = getLevelDifficulty(vocabWord.level);
      
      // Only highlight words above user's level (or same level for visibility)
      if (wordLevel >= userLevel) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        formattedText = formattedText.replace(regex, (match) => {
          return `<span class="vocabulary-word" data-word="${word.toLowerCase()}">${match}</span>`;
        });
      }
    });

    return formattedText;
  };

  const handleWordHover = (event: React.MouseEvent, word: string) => {
    setHoveredWord(word);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
  };

  const handleWordLeave = () => {
    setHoveredWord(null);
  };

  // Create formatted and highlighted content
  const highlightedContent = formatAndHighlightText(text);

  return (
    <div className="relative">
      <style jsx>{`
        .vocabulary-word {
          background: rgba(16, 185, 129, 0.3) !important;
          color: #10b981 !important;
          padding: 2px 6px !important;
          border-radius: 4px !important;
          cursor: pointer !important;
          border-bottom: 2px dotted #10b981 !important;
          transition: all 0.2s ease !important;
          font-weight: 500 !important;
        }
        
        .vocabulary-word:hover {
          background: rgba(16, 185, 129, 0.5) !important;
          color: #059669 !important;
          transform: translateY(-1px) !important;
        }
        
        p {
          margin-bottom: 2rem !important;
          line-height: 1.9 !important;
          text-indent: 1.5rem !important;
        }
        
        p:first-child {
          text-indent: 0 !important;
        }
        
        p:last-child {
          margin-bottom: 0 !important;
        }
      `}</style>
      
      <div
        className="leading-relaxed text-lg"
        style={{
          color: mode === 'simplified' ? '#10b981' : '#cbd5e1',
          fontSize: '18px',
          lineHeight: '1.8'
        }}
        dangerouslySetInnerHTML={{ __html: highlightedContent }}
        onMouseOver={(e) => {
          const target = e.target as HTMLElement;
          if (target.classList.contains('vocabulary-word')) {
            const word = target.getAttribute('data-word');
            if (word) handleWordHover(e, word);
          }
        }}
        onMouseLeave={handleWordLeave}
      />
      
      {/* Tooltip */}
      {hoveredWord && VOCABULARY_DATABASE[hoveredWord] && (
        <div
          className="fixed z-50 bg-gray-800 text-white p-3 rounded-lg shadow-lg max-w-xs"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 80,
            pointerEvents: 'none'
          }}
        >
          <div className="font-bold text-green-400 mb-1">
            {VOCABULARY_DATABASE[hoveredWord].word}
          </div>
          <div className="text-sm text-gray-200 mb-2">
            {VOCABULARY_DATABASE[hoveredWord].definition}
          </div>
          <div className="text-xs text-gray-400">
            {VOCABULARY_DATABASE[hoveredWord].level} Level • {VOCABULARY_DATABASE[hoveredWord].difficulty}
          </div>
        </div>
      )}
    </div>
  );
}