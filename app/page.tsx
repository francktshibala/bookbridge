import React from 'react';

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto">
      <section aria-labelledby="welcome-heading" className="mb-8">
        <h2 id="welcome-heading" className="text-3xl font-bold mb-4">
          Welcome to BookBridge
        </h2>
        <p className="text-lg text-secondary mb-6">
          Your accessible AI-powered companion for understanding books. Designed with WCAG 2.1 AA compliance 
          for students with disabilities.
        </p>
      </section>

      <section aria-labelledby="features-heading" className="mb-8">
        <h3 id="features-heading" className="text-2xl font-semibold mb-4">
          Key Features
        </h3>
        <ul className="space-y-3">
          <li className="flex items-start">
            <span className="text-accent-primary mr-3" aria-hidden="true">✓</span>
            <span>100% WCAG 2.1 AA compliant interface</span>
          </li>
          <li className="flex items-start">
            <span className="text-accent-primary mr-3" aria-hidden="true">✓</span>
            <span>AI-powered book analysis and Q&A</span>
          </li>
          <li className="flex items-start">
            <span className="text-accent-primary mr-3" aria-hidden="true">✓</span>
            <span>Screen reader optimized</span>
          </li>
          <li className="flex items-start">
            <span className="text-accent-primary mr-3" aria-hidden="true">✓</span>
            <span>Keyboard navigation support</span>
          </li>
          <li className="flex items-start">
            <span className="text-accent-primary mr-3" aria-hidden="true">✓</span>
            <span>Customizable text and contrast settings</span>
          </li>
        </ul>
      </section>

      <section aria-labelledby="cta-heading" className="bg-surface rounded-lg p-6">
        <h3 id="cta-heading" className="text-xl font-semibold mb-4">
          Get Started
        </h3>
        <p className="mb-4">
          Upload a public domain book or select from our library to begin your accessible reading experience.
        </p>
        <div className="flex gap-4">
          <a 
            href="/upload" 
            className="btn-primary"
            aria-label="Upload a public domain book"
          >
            Upload Book
          </a>
          <a 
            href="/library" 
            className="btn-secondary"
            aria-label="Browse our book library"
          >
            Browse Library
          </a>
        </div>
      </section>
    </div>
  );
}