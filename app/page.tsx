'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{
      backgroundColor: '#fafafa',
      backgroundImage: `
        radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 80% 80%, rgba(255, 119, 198, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 40% 20%, rgba(255, 219, 112, 0.1) 0%, transparent 50%)
      `
    }}>
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          aria-labelledby="welcome-heading" 
          style={{ marginBottom: '64px', textAlign: 'center' }}
        >
          <motion.h1 
            id="welcome-heading"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontSize: '56px',
              fontWeight: '800',
              marginBottom: '24px',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              letterSpacing: '-1px',
              lineHeight: '1.1'
            }}
          >
            Welcome to BookBridge
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            style={{
              fontSize: '22px',
              color: '#4a5568',
              fontWeight: '500',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              maxWidth: '700px',
              margin: '0 auto',
              lineHeight: '1.6'
            }}
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
          style={{ marginBottom: '64px' }}
        >
          <h2 id="features-heading" style={{
            fontSize: '36px',
            fontWeight: '700',
            marginBottom: '32px',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
          }}>
            Key Features
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px'
          }}>
            {[
              "100% WCAG 2.1 AA compliant interface",
              "AI-powered book analysis and Q&A", 
              "Screen reader optimized",
              "Keyboard navigation support",
              "Customizable text and contrast settings"
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1, duration: 0.5 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 20px rgba(0, 0, 0, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}
              >
                <motion.span 
                  whileHover={{ scale: 1.2 }}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}
                  aria-hidden="true"
                >
                  ✓
                </motion.span>
                <span style={{
                  fontSize: '16px',
                  fontWeight: '500',
                  color: '#2d3748',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  lineHeight: '1.5'
                }}>
                  {feature}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* CTA Section */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.6 }}
          aria-labelledby="cta-heading"
          style={{
            background: 'white',
            borderRadius: '24px',
            padding: '48px',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          <h3 id="cta-heading" style={{
            fontSize: '28px',
            fontWeight: '700',
            marginBottom: '16px',
            color: '#1a202c',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
          }}>
            Get Started
          </h3>
          
          <p style={{
            fontSize: '18px',
            color: '#4a5568',
            marginBottom: '32px',
            fontWeight: '500',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            maxWidth: '500px',
            margin: '0 auto 32px auto',
            lineHeight: '1.6'
          }}>
            Upload a public domain book or select from our library to begin your accessible reading experience.
          </p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.5 }}
            style={{ 
              display: 'flex', 
              gap: '20px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}
          >
            <motion.a 
              href="/upload"
              whileHover={{ 
                y: -3,
                boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)',
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: 0.95 }}
              aria-label="Upload a public domain book"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                textDecoration: 'none',
                padding: '16px 32px',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                transition: 'all 0.2s ease'
              }}
            >
              📚 Upload Book
            </motion.a>
            
            <motion.a 
              href="/library"
              whileHover={{ 
                y: -3,
                borderColor: '#667eea',
                backgroundColor: '#f8faff',
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: 0.95 }}
              aria-label="Browse our book library"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'white',
                color: '#4a5568',
                textDecoration: 'none',
                padding: '16px 32px',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                border: '2px solid #e2e8f0',
                transition: 'all 0.2s ease'
              }}
            >
              🔍 Browse Library
            </motion.a>
          </motion.div>
        </motion.section>
      </div>
    </div>
  );
}