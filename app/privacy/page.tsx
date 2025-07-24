'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold mb-8 text-center">Privacy Policy</h1>
        
        <div className="prose prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. Information We Collect</h2>
            <p className="mb-4">
              BookBridge collects minimal information necessary to provide our educational AI service:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Account information (email, name) for authentication</li>
              <li>Reading preferences and accessibility settings</li>
              <li>Chat history for personalized learning experiences</li>
              <li>Usage analytics to improve our service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. How We Use Your Information</h2>
            <p className="mb-4">Your information is used solely to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Provide personalized AI literary analysis</li>
              <li>Maintain your reading history and preferences</li>
              <li>Improve accessibility features</li>
              <li>Send service updates and educational content (opt-in only)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. AI Processing</h2>
            <p className="mb-4">
              <strong>Important:</strong> Your conversations with our AI are processed to provide personalized responses. 
              However, we do not store or share personal conversations with third parties.
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>AI responses are generated using your conversation context</li>
              <li>Personal data is never shared with AI training datasets</li>
              <li>Conversations may be anonymized for service improvements</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. Data Storage and Security</h2>
            <p className="mb-4">
              We use industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Encrypted data transmission (HTTPS)</li>
              <li>Secure database storage with access controls</li>
              <li>Regular security audits and updates</li>
              <li>Limited employee access on a need-to-know basis</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Third-Party Services</h2>
            <p className="mb-4">BookBridge integrates with external services for book content:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Project Gutenberg (public domain books)</li>
              <li>Internet Archive/Open Library (public domain books)</li>
              <li>Google Books API (metadata only)</li>
              <li>OpenAI/Anthropic (AI processing)</li>
            </ul>
            <p className="mb-4">
              These services have their own privacy policies. We recommend reviewing them.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Your Rights</h2>
            <p className="mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Access your personal data</li>
              <li>Request data corrections or deletion</li>
              <li>Export your data</li>
              <li>Opt-out of analytics</li>
              <li>Delete your account at any time</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. Accessibility Commitment</h2>
            <p className="mb-4">
              Privacy controls are designed with accessibility in mind, following WCAG 2.1 AA guidelines. 
              All privacy settings are available through screen readers and keyboard navigation.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">8. Contact Us</h2>
            <p className="mb-4">
              For privacy questions or data requests:
              <br />
              <strong>Email:</strong> privacy@bookbridge.ai
              <br />
              <strong>Response Time:</strong> Within 48 hours
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