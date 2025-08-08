export interface VocabularyMapping {
  complex: string;
  simple: string;
  context?: string; // Optional context where this mapping applies
}

export class VocabularySimplifier {
  private static instance: VocabularySimplifier;
  
  // Core vocabulary mappings for common literary terms
  private readonly vocabularyMappings: VocabularyMapping[] = [
    // Literary terms
    { complex: 'protagonist', simple: 'main character' },
    { complex: 'antagonist', simple: 'bad guy' },
    { complex: 'symbolism', simple: 'hidden meaning' },
    { complex: 'metaphor', simple: 'comparison' },
    { complex: 'allegory', simple: 'story with a hidden message' },
    { complex: 'foreshadowing', simple: 'hints about what will happen' },
    { complex: 'irony', simple: 'opposite of what you expect' },
    { complex: 'motif', simple: 'repeated idea or image' },
    { complex: 'juxtaposition', simple: 'putting opposites together' },
    { complex: 'paradox', simple: 'seems wrong but is true' },
    
    // General academic terms
    { complex: 'analyze', simple: 'look closely at' },
    { complex: 'evaluate', simple: 'judge' },
    { complex: 'synthesize', simple: 'combine' },
    { complex: 'articulate', simple: 'explain clearly' },
    { complex: 'comprehend', simple: 'understand' },
    { complex: 'demonstrate', simple: 'show' },
    { complex: 'illustrate', simple: 'show with examples' },
    { complex: 'interpret', simple: 'explain the meaning' },
    { complex: 'perceive', simple: 'see or understand' },
    { complex: 'significant', simple: 'important' },
    
    // Complex descriptive words
    { complex: 'ambiguous', simple: 'unclear' },
    { complex: 'enigmatic', simple: 'mysterious' },
    { complex: 'poignant', simple: 'touching' },
    { complex: 'profound', simple: 'deep' },
    { complex: 'melancholy', simple: 'sad' },
    { complex: 'ephemeral', simple: 'short-lived' },
    { complex: 'ubiquitous', simple: 'everywhere' },
    { complex: 'dichotomy', simple: 'split or division' },
    { complex: 'nuanced', simple: 'detailed' },
    { complex: 'intricate', simple: 'complicated' },
  ];

  private constructor() {}

  static getInstance(): VocabularySimplifier {
    if (!this.instance) {
      this.instance = new VocabularySimplifier();
    }
    return this.instance;
  }

  /**
   * Simplify text by replacing complex terms with simpler alternatives
   */
  simplifyText(text: string, targetAge?: number): string {
    let simplifiedText = text;
    
    // Apply vocabulary mappings
    this.vocabularyMappings.forEach(mapping => {
      // Use word boundaries to avoid partial replacements
      const regex = new RegExp(`\\b${mapping.complex}\\b`, 'gi');
      simplifiedText = simplifiedText.replace(regex, mapping.simple);
    });
    
    // Apply age-specific simplifications
    if (targetAge && targetAge <= 12) {
      simplifiedText = this.applyChildFriendlySimplifications(simplifiedText);
    }
    
    return simplifiedText;
  }

  /**
   * Apply context-aware term replacement
   */
  simplifyWithContext(text: string, context: string, targetAge?: number): string {
    let simplifiedText = text;
    
    // Context-aware mappings for literature
    const contextualMappings = this.getContextualMappings(context);
    contextualMappings.forEach(mapping => {
      const regex = new RegExp(`\\b${mapping.complex}\\b`, 'gi');
      simplifiedText = simplifiedText.replace(regex, mapping.simple);
    });
    
    // Apply general simplifications
    simplifiedText = this.simplifyText(simplifiedText, targetAge);
    
    return simplifiedText;
  }

  /**
   * Get context-specific vocabulary mappings
   */
  private getContextualMappings(context: string): VocabularyMapping[] {
    const contextLower = context.toLowerCase();
    const mappings: VocabularyMapping[] = [];
    
    // Shakespeare-specific
    if (contextLower.includes('shakespeare') || contextLower.includes('hamlet') || contextLower.includes('romeo')) {
      mappings.push(
        { complex: 'soliloquy', simple: 'speech to self' },
        { complex: 'aside', simple: 'comment to audience' },
        { complex: 'foil', simple: 'opposite character' },
        { complex: 'tragic flaw', simple: 'weakness that causes problems' }
      );
    }
    
    // Poetry-specific
    if (contextLower.includes('poetry') || contextLower.includes('poem')) {
      mappings.push(
        { complex: 'stanza', simple: 'verse or section' },
        { complex: 'meter', simple: 'rhythm pattern' },
        { complex: 'alliteration', simple: 'repeated sounds' },
        { complex: 'assonance', simple: 'repeated vowel sounds' }
      );
    }
    
    // Novel-specific
    if (contextLower.includes('novel') || contextLower.includes('chapter')) {
      mappings.push(
        { complex: 'exposition', simple: 'background information' },
        { complex: 'denouement', simple: 'ending' },
        { complex: 'climax', simple: 'most exciting part' },
        { complex: 'resolution', simple: 'how it ends' }
      );
    }
    
    return mappings;
  }

  /**
   * Apply additional simplifications for young children
   */
  private applyChildFriendlySimplifications(text: string): string {
    // Simplify sentence structure
    let simplified = text
      // Remove complex punctuation
      .replace(/;/g, '.')
      .replace(/—/g, '-')
      .replace(/…/g, '...')
      // Simplify complex connectors
      .replace(/\bhowever\b/gi, 'but')
      .replace(/\btherefore\b/gi, 'so')
      .replace(/\bmoreover\b/gi, 'also')
      .replace(/\bnevertheless\b/gi, 'but')
      .replace(/\bfurthermore\b/gi, 'also');
    
    return simplified;
  }

  /**
   * Check if text needs simplification based on complexity
   */
  needsSimplification(text: string): boolean {
    const complexTermCount = this.vocabularyMappings.filter(mapping => {
      const regex = new RegExp(`\\b${mapping.complex}\\b`, 'gi');
      return regex.test(text);
    }).length;
    
    // If more than 3 complex terms per 100 words, needs simplification
    const wordCount = text.split(/\s+/).length;
    const complexityRatio = complexTermCount / (wordCount / 100);
    
    return complexityRatio > 3;
  }

  /**
   * Add custom vocabulary mapping
   */
  addMapping(complex: string, simple: string, context?: string): void {
    this.vocabularyMappings.push({ complex, simple, context });
  }
}

export const vocabularySimplifier = VocabularySimplifier.getInstance();