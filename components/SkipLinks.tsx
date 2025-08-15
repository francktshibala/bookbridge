import React from 'react';

export const SkipLinks: React.FC = () => {
  return (
    <div className="skip-links">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <a href="#ai-query" className="skip-link">
        Skip to AI question input
      </a>
      <a href="#book-content" className="skip-link">
        Skip to book content
      </a>
      <a href="#navigation" className="skip-link">
        Skip to navigation
      </a>
    </div>
  );
};