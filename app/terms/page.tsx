'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold mb-8 text-center">Terms of Service</h1>
        
        <div className="prose prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. Service Description</h2>
            <p className="mb-4">
              BookBridge is an AI-powered educational platform that provides literary analysis and discussion 
              of books from public domain collections and official APIs. Our service is designed primarily 
              for educational purposes and accessibility support.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. AI Analysis Disclaimer</h2>
            <p className="mb-4">
              <strong>Important:</strong> All AI-generated content represents educational commentary and analysis 
              based on training knowledge, not reproduction of copyrighted text. BookBridge does not store, 
              cache, or reproduce full copyrighted content.
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>AI responses are based on training data and publicly available information</li>
              <li>Analyses constitute fair use educational commentary</li>
              <li>We do not reproduce or store copyrighted book content</li>
              <li>Book sources include public domain collections (Project Gutenberg, Internet Archive) and official APIs</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. Content Sources</h2>
            <p className="mb-4">BookBridge integrates with the following content sources:</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Project Gutenberg:</strong> Public domain books (70,000+ titles)</li>
              <li><strong>Open Library:</strong> Public domain books via Internet Archive</li>
              <li><strong>Standard Ebooks:</strong> Public domain books with modern formatting</li>
              <li><strong>Google Books API:</strong> Metadata and descriptions only (no full text reproduction)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. Copyright Compliance</h2>
            <p className="mb-4">
              BookBridge respects intellectual property rights. If you believe any content infringes 
              your copyright, please contact us immediately. We will respond promptly to valid takedown requests.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Educational Use</h2>
            <p className="mb-4">
              This service is designed for educational and accessibility purposes. Users agree to use 
              BookBridge responsibly and in accordance with fair use principles for educational commentary 
              and analysis.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Limitation of Liability</h2>
            <p className="mb-4">
              BookBridge provides AI-generated content "as is" for educational purposes. Users should 
              verify information independently for academic or professional use.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. Contact Information</h2>
            <p className="mb-4">
              For questions about these terms, copyright concerns, or takedown requests, please contact us at:
              <br />
              <strong>Email:</strong> legal@bookbridge.ai
              <br />
              <strong>Response Time:</strong> We aim to respond within 24 hours
            </p>
          </section>

          <section className="mb-8">
            <p className="text-sm text-gray-600">
              <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
            </p>
          </section>
        </div>
      </motion.div>
    </div>
  );
}