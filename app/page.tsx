'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function HomePage() {
  return (
    <div className="page-container magical-bg min-h-screen" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
      <div className="page-content" style={{ 
        padding: '4rem 2rem', 
        maxWidth: '1200px', 
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem'
      }}>
        {/* Hero Section */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          aria-labelledby="welcome-heading" 
          className="page-header"
          style={{ marginBottom: '0.5rem' }}
        >
          <motion.h1 
            id="welcome-heading"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-gradient hero-title"
          >
            Welcome to BookBridge
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="hero-subtitle"
            style={{ color: '#f7fafc', marginBottom: '0' }}
          >
            Your accessible AI-powered companion for understanding books. Designed with WCAG 2.1 AA compliance 
            for students with disabilities.
          </motion.p>
        </motion.section>

        {/* Features Section */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          aria-labelledby="features-heading" 
          className="w-full"
          style={{ maxWidth: '1000px' }}
        >
          <h2 id="features-heading" className="text-gradient page-title text-center" style={{ marginBottom: '2rem' }}>
            Key Features
          </h2>
          
          <div className="features-grid">
            {[
              "AI-Powered Literary Analysis",
              "100% WCAG 2.1 AA Accessibility", 
              "20M+ Books from Multiple Sources",
              "Premium Voice & TTS Features"
            ].map((feature, index) => {
              const icons = ["🤖", "♿", "📚", "🎙️"];
              const descriptions = [
                "Advanced multi-agent system for deep book understanding and Socratic dialogue",
                "Complete accessibility compliance designed for students with disabilities",
                "Access books from Project Gutenberg, Open Library, Google Books, and more",
                "High-quality text-to-speech with ElevenLabs and OpenAI voice options"
              ];
              
              return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1, duration: 0.5 }}
                className="group feature-card"
                style={{
                  backgroundColor: '#334155',
                  borderColor: '#475569'
                }}
              >
                {/* Top section with icon */}
                <div className="text-center mb-6">
                  <motion.div 
                    whileHover={{ 
                      scale: 1.2, 
                      rotate: 10,
                      transition: { 
                        type: "spring",
                        stiffness: 400,
                        damping: 10
                      }
                    }}
                    className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl transition-all duration-300 mx-auto mb-4"
                    style={{
                      background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)',
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4), 0 8px 24px rgba(102, 126, 234, 0.2)'
                    }}
                    aria-hidden="true"
                  >
                    <span className="text-white">{icons[index]}</span>
                  </motion.div>
                  
                  <h3 className="font-bold leading-tight mb-4 transition-colors duration-300" 
                      style={{ 
                        color: '#ffffff',
                        fontSize: 'var(--text-2xl)'
                      }}>
                    {feature}
                  </h3>
                </div>
                
                {/* Description section */}
                <div className="text-center">
                  <p className="leading-relaxed" style={{ 
                    color: '#e2e8f0',
                    fontSize: 'var(--text-lg)'
                  }}>
                    {descriptions[index]}
                  </p>
                </div>
              </motion.div>
            );
            })}
          </div>
        </motion.section>

        {/* CTA Section - Balanced with features grid */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.6 }}
          aria-labelledby="cta-heading"
          className="p-12 text-center rounded-2xl border mx-auto"
          style={{
            backgroundColor: '#334155',
            borderColor: '#475569',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2), 0 10px 20px rgba(0, 0, 0, 0.3)',
            maxWidth: '1000px',
            width: '100%'
          }}
        >
          <h3 id="cta-heading" className="font-bold mb-6" style={{ 
            color: '#ffffff',
            fontSize: 'var(--text-3xl)'
          }}>
            Get Started
          </h3>
          
          <p className="font-medium max-w-2xl mx-auto mb-12" style={{ 
            color: '#e2e8f0',
            fontSize: 'var(--text-xl)',
            lineHeight: '1.6'
          }}>
            Upload a public domain book or select from our library to begin your accessible reading experience.
          </p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.5 }}
            className="flex gap-8 justify-center flex-wrap"
          >
            <motion.a 
              href="/upload"
              whileHover={{ 
                y: -2,
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: 0.98 }}
              aria-label="Upload a public domain book"
              className="btn btn-secondary inline-flex items-center gap-3 px-10 py-5 font-semibold"
              style={{ fontSize: 'var(--text-lg)', marginBottom: '2rem', textDecoration: 'none' }}
            >
              📚 Upload Book
            </motion.a>
            
            <motion.a 
              href="/library"
              whileHover={{ 
                y: -3,
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: 0.95 }}
              aria-label="Browse our book library"
              className="btn btn-brand inline-flex items-center gap-3 px-10 py-5 font-semibold"
              style={{ fontSize: 'var(--text-lg)', marginBottom: '2rem', textDecoration: 'none' }}
            >
              🔍 Browse Library
            </motion.a>
          </motion.div>
        </motion.section>
      </div>
    </div>
  );
}