import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';

export interface ExtractedContent {
  text: string;
  chapters?: Chapter[];
  metadata?: {
    pageCount?: number;
    wordCount?: number;
    language?: string;
  };
}

export interface Chapter {
  title: string;
  content: string;
  order: number;
}

export class ContentExtractor {
  async extract(buffer: Buffer, fileType: string): Promise<ExtractedContent> {
    switch (fileType.toLowerCase()) {
      case 'txt':
        return this.extractText(buffer);
      case 'pdf':
        return this.extractPDF(buffer);
      case 'epub':
        return this.extractEPUB(buffer);
      case 'html':
      case 'htm':
        return this.extractHTML(buffer);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  private async extractText(buffer: Buffer): Promise<ExtractedContent> {
    const text = buffer.toString('utf-8');
    const wordCount = text.split(/\s+/).filter((word: string) => word.length > 0).length;
    
    return {
      text,
      metadata: {
        wordCount,
        language: this.detectLanguage(text)
      }
    };
  }

  private async extractPDF(buffer: Buffer): Promise<ExtractedContent> {
    try {
      // For now, use pdf-lib to get basic info
      // Note: pdf-lib doesn't extract text, only metadata
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const pageCount = pdfDoc.getPages().length;
      
      // Return a message indicating PDF text extraction is limited
      const message = `[PDF Document - ${pageCount} pages]\n\nNote: Full text extraction from PDF files is currently limited. For best results, please upload books in .txt or .epub format.\n\nTo enable full PDF text extraction, the system administrator needs to install additional PDF processing libraries.`;
      
      return {
        text: message,
        metadata: {
          pageCount,
          wordCount: pageCount * 250, // Rough estimate
          language: 'en'
        }
      };
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error('Failed to process PDF file - please try uploading a .txt or .epub file instead');
    }
  }

  private async extractEPUB(buffer: Buffer): Promise<ExtractedContent> {
    try {
      const zip = new JSZip();
      const epub = await zip.loadAsync(buffer);
      
      // Find content.opf file which contains the spine (reading order)
      let opfPath = '';
      const containerXml = await epub.file('META-INF/container.xml')?.async('string');
      
      if (containerXml) {
        const match = containerXml.match(/full-path="([^"]+)"/);
        if (match) {
          opfPath = match[1];
        }
      }
      
      if (!opfPath) {
        throw new Error('Invalid EPUB: Could not find content.opf');
      }
      
      // Extract text from HTML/XHTML files
      const chapters: Chapter[] = [];
      let fullText = '';
      let chapterIndex = 0;
      
      // Get all HTML/XHTML files
      const htmlFiles = Object.keys(epub.files).filter(
        path => path.endsWith('.html') || path.endsWith('.xhtml')
      );
      
      for (const filePath of htmlFiles) {
        const content = await epub.file(filePath)?.async('string');
        if (content) {
          // Basic HTML tag removal
          const cleanContent = content
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (cleanContent.length > 50) { // Skip very short files
            chapters.push({
              title: `Chapter ${chapterIndex + 1}`,
              content: cleanContent,
              order: chapterIndex
            });
            
            fullText += cleanContent + '\n\n';
            chapterIndex++;
          }
        }
      }
      
      const wordCount = fullText.split(/\s+/).filter((word: string) => word.length > 0).length;
      
      return {
        text: fullText,
        chapters,
        metadata: {
          wordCount,
          language: this.detectLanguage(fullText)
        }
      };
    } catch (error) {
      console.error('EPUB extraction error:', error);
      throw new Error('Failed to extract EPUB content');
    }
  }

  private async extractHTML(buffer: Buffer): Promise<ExtractedContent> {
    const html = buffer.toString('utf-8');
    // Remove script and style tags first
    const cleanHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    // Extract text content
    const text = cleanHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = text.split(/\s+/).filter((word: string) => word.length > 0).length;
    
    return {
      text,
      metadata: {
        wordCount,
        language: this.detectLanguage(text)
      }
    };
  }

  private detectLanguage(text: string): string {
    // Simple language detection heuristic
    const sample = text.toLowerCase().slice(0, 1000);
    
    const languagePatterns = {
      en: /\b(the|and|of|to|in|is|are|was|were|been|have|has|had|do|does|did)\b/g,
      es: /\b(el|la|de|que|y|en|un|una|es|son|está|están)\b/g,
      fr: /\b(le|la|de|et|un|une|est|sont|dans|pour|avec)\b/g,
      de: /\b(der|die|das|und|in|von|zu|mit|ist|sind|war|waren)\b/g,
      it: /\b(il|la|di|e|un|una|è|sono|in|per|con)\b/g,
      pt: /\b(o|a|de|que|e|em|um|uma|é|são|está|estão)\b/g,
    };
    
    let maxMatches = 0;
    let detectedLang = 'en';
    
    for (const [lang, pattern] of Object.entries(languagePatterns)) {
      const matches = sample.match(pattern)?.length || 0;
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedLang = lang;
      }
    }
    
    return detectedLang;
  }
}

export const contentExtractor = new ContentExtractor();