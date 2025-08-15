# Public Domain Book Sources for BookBridge

## Overview
This document outlines verified public domain book sources that BookBridge can legally use without copyright concerns. All sources listed have been vetted for legal compliance and educational use.

## Primary Sources

### 1. Project Gutenberg
- **URL**: https://www.gutenberg.org
- **Books Available**: 70,000+ free eBooks
- **Coverage**: Books published before 1928 (US public domain)
- **Formats**: Plain text, EPUB, Kindle, HTML
- **API**: Available via Gutendex (https://gutendex.com)
- **Legal Status**: Verified public domain, no copyright restrictions
- **Best For**: Classic literature, historical texts, educational materials

### 2. Internet Archive
- **URL**: https://archive.org/details/texts
- **Books Available**: 28+ million texts
- **Coverage**: Public domain books, government documents, academic papers
- **Formats**: PDF, EPUB, DAISY, TXT
- **API**: Open Library API available
- **Legal Status**: Mix of public domain and controlled digital lending
- **Best For**: Academic texts, historical documents, rare books
- **Note**: Only use items marked as "Public Domain" or "No known copyright"

### 3. HathiTrust Digital Library
- **URL**: https://www.hathitrust.org
- **Books Available**: 17+ million volumes
- **Coverage**: Academic and research materials
- **Access**: Full view for public domain works
- **API**: Available for bulk access
- **Legal Status**: Clear public domain designation
- **Best For**: Academic research, scholarly texts

### 4. Google Books (Public Domain Only)
- **URL**: https://books.google.com
- **Filter**: "Full view only" + "Free Google eBooks"
- **Coverage**: Pre-1928 publications
- **API**: Google Books API (requires API key)
- **Legal Status**: Only items marked "Public Domain"
- **Best For**: Wide variety of historical texts

### 5. Wikisource
- **URL**: https://en.wikisource.org
- **Books Available**: Thousands of verified texts
- **Coverage**: Historical documents, classic literature
- **Format**: Wiki markup, easily parseable
- **API**: MediaWiki API
- **Legal Status**: All content is public domain or CC-licensed
- **Best For**: Well-formatted, community-verified texts

## Secondary Sources

### 6. Standard Ebooks
- **URL**: https://standardebooks.org
- **Books Available**: 700+ carefully formatted classics
- **Coverage**: Public domain literature
- **Quality**: Professional formatting and proofreading
- **Legal Status**: Public domain with CC0 dedication
- **Best For**: High-quality editions of classics

### 7. LibriVox (Audiobooks)
- **URL**: https://librivox.org
- **Format**: Audio recordings of public domain books
- **Legal Status**: All recordings are public domain
- **Best For**: Accessibility features, audio content

### 8. Digital Public Library of America
- **URL**: https://dp.la
- **Coverage**: American cultural heritage materials
- **API**: Available for developers
- **Legal Status**: Varies, check individual items
- **Best For**: American history and culture

## Government Sources

### 9. U.S. Government Publishing Office
- **URL**: https://www.govinfo.gov
- **Coverage**: Federal government publications
- **Legal Status**: Not copyrighted (government works)
- **Best For**: Government reports, legal documents

### 10. National Archives
- **URL**: https://www.archives.gov/research
- **Coverage**: Historical government documents
- **Legal Status**: Public domain
- **Best For**: Primary historical sources

## Educational Specific Sources

### 11. OpenStax
- **URL**: https://openstax.org
- **Coverage**: Peer-reviewed textbooks
- **License**: Creative Commons Attribution
- **Best For**: Modern educational textbooks
- **Note**: Requires attribution

### 12. MIT OpenCourseWare
- **URL**: https://ocw.mit.edu
- **Coverage**: Course materials and textbooks
- **License**: Creative Commons
- **Best For**: Technical and scientific texts

## Content Filtering Guidelines

### Inclusion Criteria
1. Published before 1928 (automatic US public domain)
2. US Government publications
3. Works with expired copyright
4. Works explicitly dedicated to public domain
5. Creative Commons CC0 works

### Exclusion Criteria
1. Any work published after 1927 without explicit public domain status
2. Works under "controlled digital lending"
3. Orphan works (unknown copyright status)
4. Works requiring attribution (for MVP phase)
5. International works without clear US copyright status

## API Integration Priority

### Phase 1 (MVP)
1. Project Gutenberg via Gutendex API
2. Wikisource via MediaWiki API
3. Standard Ebooks catalog

### Phase 2 (Post-Launch)
1. Internet Archive Open Library API
2. HathiTrust Data API
3. Google Books API (public domain filter)

## Legal Compliance Checklist

For each source integrated:
- [ ] Verify public domain status
- [ ] Document copyright verification process
- [ ] Implement source attribution
- [ ] Create removal workflow for disputed content
- [ ] Set up monitoring for copyright claims
- [ ] Establish relationship with source maintainers

## Metadata Storage Strategy

For copyright compliance, BookBridge will store:
- Book title and author
- Publication year
- Source URL
- Public domain verification date
- Brief description (user-generated)
- NOT storing: Full text content

## Implementation Notes

1. **Start Small**: Begin with Project Gutenberg's most popular 100 books
2. **Quality Over Quantity**: Focus on well-formatted, verified texts
3. **Educational Focus**: Prioritize books commonly used in education
4. **Accessibility**: Ensure all sources support text extraction for screen readers
5. **Caching**: Cache only AI responses, not book content

## Risk Mitigation

1. **Legal Review**: Have lawyer verify each source before integration
2. **Clear Labeling**: Always display "Public Domain" status to users
3. **Quick Removal**: Implement one-click removal for any disputed content
4. **Audit Trail**: Log all content additions with verification details
5. **Regular Reviews**: Monthly audit of all book sources

## Next Steps

1. Contact Project Gutenberg for potential partnership
2. Set up API access for Gutendex
3. Create automated public domain verification system
4. Build source attribution system
5. Implement content removal workflow

---

*Last Updated: 2025-07-17*
*Status: Ready for legal review*