import { useEffect, useRef } from 'react';

export function useParagraphAutoScroll({
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
  const lastParagraphIndex = useRef(-1);
  const lastSentenceIndex = useRef(-1);
  const lastTextRef = useRef<string>('');
  const wordVelocityRef = useRef<number[]>([]);
  const lastWordIndexRef = useRef(-1);
  const lastUpdateTime = useRef(Date.now());

  useEffect(() => {
    if (!enabled || !isPlaying || !text) return;

    // Track text changes for page transitions
    if (text !== lastTextRef.current) {
      console.log('📄 Text content changed - resetting trackers');
      lastTextRef.current = text;
      lastParagraphIndex.current = -1;
      lastSentenceIndex.current = -1;
      lastWordIndexRef.current = -1;
      wordVelocityRef.current = [];
    }

    // Calculate reading velocity (words per second)
    const now = Date.now();
    if (lastWordIndexRef.current >= 0 && currentWordIndex > lastWordIndexRef.current) {
      const timeDelta = (now - lastUpdateTime.current) / 1000; // seconds
      const wordDelta = currentWordIndex - lastWordIndexRef.current;
      const velocity = wordDelta / timeDelta;

      // Keep rolling average of last 5 velocity measurements
      wordVelocityRef.current.push(velocity);
      if (wordVelocityRef.current.length > 5) {
        wordVelocityRef.current.shift();
      }
    }
    lastWordIndexRef.current = currentWordIndex;
    lastUpdateTime.current = now;

    // Split text into paragraphs (by double newlines or long spaces)
    const paragraphs = text.split(/\n\n+|\r\n\r\n+/).filter(p => p.trim());

    // Map word index to paragraph
    let wordCount = 0;
    let currentParagraphIndex = -1;
    let currentParagraphStartWord = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraphWords = paragraphs[i].trim().split(/\s+/).length;
      if (currentWordIndex >= wordCount && currentWordIndex < wordCount + paragraphWords) {
        currentParagraphIndex = i;
        currentParagraphStartWord = wordCount;
        break;
      }
      wordCount += paragraphWords;
    }

    // Also track sentences within the paragraph for fine-tuning
    let currentSentenceIndex = -1;
    if (currentParagraphIndex >= 0) {
      const currentParagraph = paragraphs[currentParagraphIndex];
      const sentences = currentParagraph.match(/[^.!?]+[.!?]+/g) || [currentParagraph];

      let sentenceWordCount = 0;
      const wordInParagraph = currentWordIndex - currentParagraphStartWord;

      for (let i = 0; i < sentences.length; i++) {
        const sentenceWords = sentences[i].trim().split(/\s+/).length;
        if (wordInParagraph >= sentenceWordCount && wordInParagraph < sentenceWordCount + sentenceWords) {
          currentSentenceIndex = i;
          break;
        }
        sentenceWordCount += sentenceWords;
      }
    }

    // Calculate average reading velocity
    const avgVelocity = wordVelocityRef.current.length > 0
      ? wordVelocityRef.current.reduce((a, b) => a + b, 0) / wordVelocityRef.current.length
      : 3; // Default 3 words per second

    console.log('📖 Reading tracking:', {
      paragraph: `${currentParagraphIndex + 1}/${paragraphs.length}`,
      sentence: currentSentenceIndex + 1,
      wordIndex: currentWordIndex,
      readingSpeed: `${avgVelocity.toFixed(1)} words/sec`
    });

    // Handle paragraph changes (coarse scrolling)
    if (currentParagraphIndex !== lastParagraphIndex.current && currentParagraphIndex >= 0) {
      console.log(`📑 Paragraph changed: ${lastParagraphIndex.current} → ${currentParagraphIndex}`);
      lastParagraphIndex.current = currentParagraphIndex;

      // Find paragraph position in DOM
      const contentElement = document.querySelector('[data-content="true"]') as HTMLElement;
      if (contentElement) {
        // Calculate paragraph position
        const textBeforeParagraph = paragraphs.slice(0, currentParagraphIndex).join('\n\n');
        const paragraphProgress = textBeforeParagraph.length / text.length;

        const elementHeight = contentElement.scrollHeight;
        const paragraphPosition = elementHeight * paragraphProgress;

        const viewportHeight = window.innerHeight;
        const currentScroll = window.scrollY;

        const elementRect = contentElement.getBoundingClientRect();
        const elementTop = elementRect.top + window.scrollY;
        const absoluteParagraphPosition = elementTop + paragraphPosition;

        // Calculate lookahead based on reading speed
        // At 3 words/sec, we want to see ahead about 3-4 seconds worth
        const lookaheadSeconds = 3;
        const lookaheadWords = avgVelocity * lookaheadSeconds;
        const lookaheadPixels = (lookaheadWords / 15) * 50; // Rough estimate: 15 words per line, 50px per line

        // Position paragraph at 25% from top to leave room for lookahead
        const targetScrollPosition = absoluteParagraphPosition - (viewportHeight * 0.25);

        // Check if we need to scroll
        const paragraphViewportPosition = absoluteParagraphPosition - currentScroll;
        const shouldScroll = paragraphViewportPosition > viewportHeight * 0.7 ||
                           paragraphViewportPosition < viewportHeight * 0.1;

        if (shouldScroll) {
          console.log('📜 Scrolling to new paragraph with lookahead:', {
            targetScroll: targetScrollPosition,
            lookaheadPixels,
            readingSpeed: `${avgVelocity.toFixed(1)} w/s`
          });

          window.scrollTo({
            top: Math.max(0, targetScrollPosition),
            behavior: 'smooth'
          });
        }
      }
    }

    // Handle sentence changes within paragraph (fine-tuning)
    else if (currentSentenceIndex !== lastSentenceIndex.current && currentSentenceIndex >= 0) {
      lastSentenceIndex.current = currentSentenceIndex;

      // Only micro-adjust if sentence is getting out of view
      const contentElement = document.querySelector('[data-content="true"]') as HTMLElement;
      if (contentElement && paragraphs[currentParagraphIndex]) {
        const currentParagraph = paragraphs[currentParagraphIndex];
        const sentences = currentParagraph.match(/[^.!?]+[.!?]+/g) || [currentParagraph];

        if (sentences[currentSentenceIndex]) {
          // Calculate sentence position within paragraph
          const textBeforeParagraph = paragraphs.slice(0, currentParagraphIndex).join('\n\n');
          const textBeforeSentence = sentences.slice(0, currentSentenceIndex).join('');
          const sentenceProgress = (textBeforeParagraph.length + textBeforeSentence.length) / text.length;

          const elementHeight = contentElement.scrollHeight;
          const sentencePosition = elementHeight * sentenceProgress;

          const viewportHeight = window.innerHeight;
          const currentScroll = window.scrollY;

          const elementRect = contentElement.getBoundingClientRect();
          const elementTop = elementRect.top + window.scrollY;
          const absoluteSentencePosition = elementTop + sentencePosition;

          const sentenceViewportPosition = absoluteSentencePosition - currentScroll;
          const sentenceViewportPercent = (sentenceViewportPosition / viewportHeight) * 100;

          // Only adjust if sentence is really close to edges
          if (sentenceViewportPercent > 85 || sentenceViewportPercent < 5) {
            const targetScroll = absoluteSentencePosition - (viewportHeight * 0.4);

            console.log('🔧 Fine-tuning scroll for sentence:', {
              sentencePos: `${sentenceViewportPercent.toFixed(0)}%`,
              adjustment: targetScroll - currentScroll
            });

            window.scrollTo({
              top: Math.max(0, targetScroll),
              behavior: 'smooth'
            });
          }
        }
      }
    }
  }, [text, currentWordIndex, isPlaying, enabled]);

  return {};
}