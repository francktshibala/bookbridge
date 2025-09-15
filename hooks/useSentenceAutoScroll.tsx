import { useEffect, useRef } from 'react';
import { TextProcessor } from '@/lib/text-processor';

export function useSentenceAutoScroll({
  text,
  currentWordIndex,
  isPlaying,
  enabled = true
}: {
  text: string;
  currentWordIndex: number;
  isPlaying: boolean;
  enabled?: boolean;
}) {
  const lastSentenceIndex = useRef(-1);
  const lastTextRef = useRef<string>('');
  const pageJustChanged = useRef(false);

  useEffect(() => {
    if (!enabled || !isPlaying || !text) return;

    // Track text changes for page transitions
    if (text !== lastTextRef.current) {
      const isNewPage = lastTextRef.current !== '' &&
                       !text.startsWith(lastTextRef.current.substring(0, Math.min(100, lastTextRef.current.length)));

      if (isNewPage) {
        console.log('📄 New page detected - will ensure first sentences are visible');
        pageJustChanged.current = true;
      }

      lastTextRef.current = text;
      lastSentenceIndex.current = -1; // Reset sentence tracking on new page
    }

    // Split text into sentences using TextProcessor (matches audio generation)
    const processedSentences = TextProcessor.splitIntoSentences(text);
    const sentences = processedSentences.map(s => s.text);

    // Map word index to sentence index
    let wordCount = 0;
    let currentSentenceIndex = -1;

    for (let i = 0; i < sentences.length; i++) {
      const sentenceWords = sentences[i].trim().split(/\s+/).length;
      if (currentWordIndex >= wordCount && currentWordIndex < wordCount + sentenceWords) {
        currentSentenceIndex = i;
        break;
      }
      wordCount += sentenceWords;
    }

    // Log for debugging
    console.log('📍 Sentence Tracking:', {
      currentWordIndex,
      currentSentenceIndex,
      totalSentences: sentences.length,
      sentence: currentSentenceIndex >= 0 ? sentences[currentSentenceIndex].substring(0, 50) + '...' : 'none'
    });

    // Track sentence changes and scroll
    if (currentSentenceIndex !== lastSentenceIndex.current && currentSentenceIndex >= 0) {
      console.log(`📜 Sentence changed: ${lastSentenceIndex.current} → ${currentSentenceIndex}`);
      lastSentenceIndex.current = currentSentenceIndex;

      // Find content element and calculate scroll position
      const contentElement = document.querySelector('[data-content="true"]') as HTMLElement;
      if (contentElement && sentences[currentSentenceIndex]) {
        // Calculate relative position in the text
        const textBefore = sentences.slice(0, currentSentenceIndex).join('');
        const textProgress = textBefore.length / text.length;
        const elementHeight = contentElement.scrollHeight;
        const targetScrollPosition = elementHeight * textProgress;

        // Get viewport dimensions
        const viewportHeight = window.innerHeight;
        const currentScroll = window.scrollY;

        // Calculate the element's position relative to the page
        const elementRect = contentElement.getBoundingClientRect();
        const elementTop = elementRect.top + window.scrollY;
        const absoluteTargetPosition = elementTop + targetScrollPosition;

        // Check where the sentence is in the viewport
        const sentenceViewportPosition = absoluteTargetPosition - currentScroll;
        const sentenceViewportPercent = (sentenceViewportPosition / viewportHeight) * 100;

        console.log('📏 Sentence position:', {
          textProgress: `${(textProgress * 100).toFixed(1)}%`,
          sentenceInViewport: `${sentenceViewportPercent.toFixed(0)}% down`,
          absolutePosition: absoluteTargetPosition,
          currentScroll
        });

        // Determine scroll behavior based on context
        let shouldScroll = false;
        let desiredScrollPosition = currentScroll;

        // Special handling for first few sentences on a new page
        if (pageJustChanged.current && currentSentenceIndex < 3) {
          // For new pages, ensure first sentences are visible
          if (sentenceViewportPercent < 20 || sentenceViewportPercent > 60) {
            desiredScrollPosition = absoluteTargetPosition - (viewportHeight * 0.35); // Position at 35% from top
            shouldScroll = true;
            console.log('📖 New page adjustment - bringing first sentences into view');
          }
          // Clear the flag after handling first few sentences
          if (currentSentenceIndex >= 2) {
            pageJustChanged.current = false;
          }
        }
        // Normal scrolling behavior - only at edges
        else {
          // If sentence is below 75% of viewport (getting too far down)
          if (sentenceViewportPercent > 75) {
            // Scroll to bring it to 50% of viewport
            desiredScrollPosition = absoluteTargetPosition - (viewportHeight * 0.5);
            shouldScroll = true;
            console.log('⬇️ Sentence approaching bottom, scrolling down');
          }
          // If sentence is above 20% of viewport (too far up)
          else if (sentenceViewportPercent < 20) {
            // Scroll to bring it to 35% of viewport
            desiredScrollPosition = absoluteTargetPosition - (viewportHeight * 0.35);
            shouldScroll = true;
            console.log('⬆️ Sentence too far up, scrolling to show it');
          }
        }

        // Perform smooth scroll if needed
        if (shouldScroll) {
          // Make sure we don't scroll past the content bounds
          const maxScroll = document.documentElement.scrollHeight - viewportHeight;
          const finalScrollPosition = Math.max(0, Math.min(desiredScrollPosition, maxScroll));

          // Only scroll if the change is significant (more than 40px)
          if (Math.abs(finalScrollPosition - currentScroll) > 40) {
            console.log('📜 Auto-scrolling:', {
              from: currentScroll,
              to: finalScrollPosition,
              sentencePos: `${sentenceViewportPercent.toFixed(0)}%`
            });

            window.scrollTo({
              top: finalScrollPosition,
              behavior: 'smooth'
            });
          }
        }
      }
    }
  }, [text, currentWordIndex, isPlaying, enabled]);

  return {};
}