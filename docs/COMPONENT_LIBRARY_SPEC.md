# Component Library Architecture Specification

## Executive Summary

Based on analysis of existing components and wireframe designs, this specification defines a minimal, efficient component library that prioritizes **simplicity, consistency, and mobile-first accessibility**. The current codebase has 30+ components with significant duplication—this architecture consolidates to **12 core components** that cover all UI needs while eliminating redundancy.

**Key Principles:**
- **Minimal Surface Area**: Fewest components possible without sacrificing functionality
- **Mobile-First Responsive**: Single components that adapt across breakpoints
- **Zero Duplication**: Shared primitives prevent code drift
- **TypeScript-First**: Strict interfaces for reliability

## Current State Analysis

### Existing Components Audit

**🔴 DELETE - Redundant/Replaced:**
- `AudioPlayer.tsx` - Replace with unified `AudioControls`
- `AudioPlayerWithHighlighting.tsx` - Merge into `AudioControls`
- `MinimalAudioPlayer.tsx` - Duplicate functionality
- `SimpleHighlightingPlayer.tsx` - Merge capabilities
- `SmartAudioPlayer.tsx` - Over-engineered, consolidate
- `ESLAudioPlayer.tsx` - ESL-specific variant unnecessary
- `AuthProvider.tsx` + `SimpleAuthProvider.tsx` - Keep one
- `VoiceNavigation.tsx` + `VoiceNavigationWrapper.tsx` - Consolidate
- `ConditionalFooter.tsx` - Logic belongs in layout, not component

**🟡 MERGE - Combine Related:**
- `CatalogBookCard.tsx` + `RecommendationCard.tsx` → `BookCard`
- `ESLControls.tsx` + `ESLControlsDemo.tsx` → `ESLControlBar` 
- `ClickableText.tsx` + `HighlightableText.tsx` → `InteractiveText`
- `ESLProgressWidget.tsx` → Merge into `ProgressIndicator`

**🟢 KEEP - Core Functionality:**
- `Navigation.tsx` - Global nav (needs refactoring)
- `Footer.tsx` - Global footer
- `SubscriptionStatus.tsx` - Business logic component
- `KnowledgeGraphViewer.tsx` - Specialized feature
- `VocabularyTooltip.tsx` - ESL-specific interaction
- `SplitScreenView.tsx` - Compare mode layout
- `AccessibleWrapper.tsx` - A11y utilities
- `KeyboardNavigationProvider.tsx` - A11y utilities
- `SkipLinks.tsx` - A11y requirement

## Minimal Component Library (12 Components)

### 1. Primitive Components (5)

#### Button
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  children: ReactNode;
  'aria-label'?: string;
  onClick?: () => void;
}

// Usage: Consolidates all button needs across the app
// Replaces: Multiple custom button implementations
```

#### Toggle
```typescript
interface ToggleProps {
  pressed: boolean;
  onToggle: (pressed: boolean) => void;
  label: string;
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  'aria-describedby'?: string;
}

// Usage: ESL mode toggle, auto-advance toggle, settings
// Replaces: Custom toggle implementations in audio players
```

#### Chip
```typescript
interface ChipProps {
  variant: 'level' | 'status' | 'tag';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size: 'sm' | 'md';
  interactive?: boolean;
  selected?: boolean;
  onPress?: () => void;
  children: ReactNode;
}

// Usage: CEFR level indicators (A1, B1, etc.), status indicators
// Replaces: Custom badge/chip implementations
```

#### Slider
```typescript
interface SliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  label: string;
  formatValue?: (value: number) => string;
  onChange: (value: number) => void;
  disabled?: boolean;
}

// Usage: Speed control (0.5x-1.2x), volume, progress seeking
// Replaces: Custom slider implementations in audio players
```

#### ProgressBar
```typescript
interface ProgressBarProps {
  value: number;
  max: number;
  variant: 'linear' | 'circular';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  showValue?: boolean;
  indeterminate?: boolean;
}

// Usage: Reading progress, audio playback, loading states
// Replaces: Multiple progress implementations
```

### 2. Layout Components (2)

#### Sheet
```typescript
interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side: 'top' | 'bottom' | 'left' | 'right';
  title?: string;
  description?: string;
  children: ReactNode;
  trapFocus?: boolean;
  closeOnOutsideClick?: boolean;
}

// Usage: Level selection, voice settings, mobile menus
// Replaces: Custom modal/drawer implementations
```

#### SplitView
```typescript
interface SplitViewProps {
  orientation: 'horizontal' | 'vertical';
  defaultSplit?: number; // 0-100 percentage
  minSize?: number;
  children: [ReactNode, ReactNode];
  onSplitChange?: (split: number) => void;
  resizable?: boolean;
  syncScroll?: boolean;
}

// Usage: Compare mode (Original | Simplified), mobile collapse
// Replaces: SplitScreenView.tsx with enhancements
```

### 3. Reading Components (3)

#### InteractiveText
```typescript
interface InteractiveTextProps {
  text: string;
  highlights?: Array<{
    start: number;
    end: number;
    type: 'current-word' | 'vocabulary' | 'cultural-note';
    data?: any;
  }>;
  onWordClick?: (word: string, position: number) => void;
  onSelectionChange?: (selection: string) => void;
  enableSelection?: boolean;
  fontSize?: number;
  lineHeight?: number;
}

// Usage: All text rendering with highlighting, selection, vocabulary
// Replaces: HighlightableText.tsx, ClickableText.tsx
```

#### AudioControlBar
```typescript
interface AudioControlBarProps {
  // Playback state
  isPlaying: boolean;
  isLoading: boolean;
  progress: number;
  duration: number;
  
  // Controls
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (time: number) => void;
  
  // Settings
  speed: number;
  onSpeedChange: (speed: number) => void;
  autoAdvance: boolean;
  onAutoAdvanceChange: (enabled: boolean) => void;
  
  // Voice settings in overflow menu
  voiceProvider: 'web-speech' | 'openai' | 'elevenlabs';
  onVoiceProviderChange: (provider: string) => void;
  
  // Mobile adaptation
  compact?: boolean;
}

// Usage: Unified audio controls for all TTS functionality
// Replaces: 5 different audio player components
```

#### ESLControlBar
```typescript
interface ESLControlBarProps {
  // Reading modes
  mode: 'original' | 'simplified' | 'compare';
  onModeChange: (mode: string) => void;
  
  // CEFR level
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  onLevelChange: (level: string) => void;
  
  // Simplification status
  simplificationAvailable: boolean;
  isSimplifying: boolean;
  similarityScore?: number;
  
  // Integration with audio
  audioControlBar?: ReactNode;
  
  // Mobile behavior
  collapsible?: boolean;
}

// Usage: ESL-specific controls, CEFR level, mode switching
// Replaces: ESLControls.tsx and ESLProgressWidget.tsx
```

### 4. Content Components (2)

#### BookCard
```typescript
interface BookCardProps {
  book: {
    id: string;
    title: string;
    author: string;
    coverUrl?: string;
    genre?: string;
    publishYear?: number;
    readingTime?: number;
    difficulty?: string;
  };
  variant: 'catalog' | 'recommendation' | 'compact';
  showProgress?: boolean;
  progress?: number;
  onClick?: () => void;
  actions?: Array<{
    label: string;
    icon?: ReactNode;
    onClick: () => void;
  }>;
}

// Usage: Library catalog, recommendations, recently read
// Replaces: CatalogBookCard.tsx and RecommendationCard.tsx
```

#### Pagination
```typescript
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showPageInfo?: boolean;
  variant: 'simple' | 'full';
  disabled?: boolean;
}

// Usage: Book page navigation, catalog pagination
// Replaces: Custom pagination implementations
```

## Design System Integration

### CSS Variables Implementation
```css
:root {
  /* Colors (from ESL_REDESIGN_SYNTHESIS_TEMPLATE.md section 6) */
  --color-bg-surface: #0f172a;
  --color-bg-panel: rgba(26,32,44,0.95);
  --color-brand: #667eea;
  --color-brand-2: #764ba2;
  --color-accent: #10b981;
  --color-text-primary: #e2e8f0;
  --color-text-muted: #a0aec0;
  --color-highlight-bg: #fbbf24;
  --color-highlight-text: #111827;
  
  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  
  /* Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-pill: 999px;
  
  /* Shadows */
  --shadow-1: 0 1px 2px rgba(0,0,0,.2);
  --shadow-2: 0 4px 20px rgba(0,0,0,.3);
  --shadow-ring: 0 0 0 1px rgba(102,126,234,.2);
  
  /* Motion */
  --duration-fast: 120ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  
  /* Touch targets */
  --touch-target: 44px;
}
```

### Tailwind Config Extensions
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Use CSS variables for theming
        'bg-surface': 'var(--color-bg-surface)',
        'bg-panel': 'var(--color-bg-panel)',
        'brand': 'var(--color-brand)',
        'brand-2': 'var(--color-brand-2)',
        'accent': 'var(--color-accent)',
        'text-primary': 'var(--color-text-primary)',
        'text-muted': 'var(--color-text-muted)',
        'highlight-bg': 'var(--color-highlight-bg)',
        'highlight-text': 'var(--color-highlight-text)',
      },
      spacing: {
        '1': 'var(--space-1)', // 4px
        '2': 'var(--space-2)', // 8px
        '3': 'var(--space-3)', // 12px
        '4': 'var(--space-4)', // 16px
        '5': 'var(--space-5)', // 20px
        '6': 'var(--space-6)', // 24px
        '8': 'var(--space-8)', // 32px
        '10': 'var(--space-10)', // 40px
        'touch': 'var(--touch-target)', // 44px
      }
    }
  }
}
```

## Component File Structure

```
/components/
├── primitives/           # 5 primitive components
│   ├── Button.tsx
│   ├── Toggle.tsx  
│   ├── Chip.tsx
│   ├── Slider.tsx
│   └── ProgressBar.tsx
├── layout/              # 2 layout components
│   ├── Sheet.tsx
│   └── SplitView.tsx
├── reading/             # 3 reading-specific components  
│   ├── InteractiveText.tsx
│   ├── AudioControlBar.tsx
│   └── ESLControlBar.tsx
├── content/             # 2 content components
│   ├── BookCard.tsx
│   └── Pagination.tsx
├── global/              # Keep existing global components
│   ├── Navigation.tsx    # Refactor to use primitives
│   ├── Footer.tsx       # Refactor to use primitives
│   └── SubscriptionStatus.tsx
└── accessibility/       # Keep existing a11y components
    ├── AccessibleWrapper.tsx
    ├── KeyboardNavigationProvider.tsx
    └── SkipLinks.tsx
```

## Implementation Priority

### Phase 1: Foundation (Sprint 1)
1. **Primitive Components** - Build all 5 primitives with TypeScript interfaces
2. **Design System** - Implement CSS variables and Tailwind extensions
3. **Layout Components** - Sheet and SplitView for core functionality

### Phase 2: Reading Experience (Sprint 1)
1. **InteractiveText** - Consolidate highlighting and text interaction
2. **AudioControlBar** - Replace all 5 audio player variants
3. **ESLControlBar** - Unified ESL controls

### Phase 3: Content & Polish (Sprint 2)
1. **BookCard** - Unified card component
2. **Pagination** - Reading navigation
3. **Refactor Navigation/Footer** - Use new primitives

## Benefits of This Architecture

### 🎯 Simplicity
- **30+ components → 12 core components** (60% reduction)
- Single source of truth for each UI pattern
- Consistent APIs across all components

### 📱 Mobile-First Responsive  
- Every component designed for mobile first
- Touch targets ≥44px built-in
- Responsive variants in single components

### 🚀 Developer Experience
- TypeScript interfaces prevent prop mistakes
- Consistent naming conventions
- Shared primitives eliminate duplication

### ♿ Accessibility
- ARIA attributes built into component APIs
- Keyboard navigation patterns included
- Screen reader optimizations by default

### 🔧 Maintainability
- Changes to Button affect all button usage
- Design system changes propagate automatically
- Testing surface area reduced significantly

## Migration Strategy

1. **Build primitives first** - Can be used immediately alongside existing components
2. **Replace audio players** - Highest duplication, biggest impact
3. **Consolidate ESL components** - Second highest priority
4. **Update layout components** - Navigation, cards, pagination
5. **Delete deprecated components** - Remove unused files

This architecture enables the clean, professional reading experience outlined in the ESL redesign while dramatically simplifying the codebase maintenance burden.