'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AccessibleWrapper } from '@/components/AccessibleWrapper';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { Upload, BookOpen, CheckCircle, XCircle, FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function UploadPage() {
  const { announceToScreenReader } = useAccessibility();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const fileInput = document.getElementById('file') as HTMLInputElement;
      if (fileInput) {
        fileInput.files = e.dataTransfer.files;
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const file = formData.get('file') as File;
    
    if (!file || !file.size) {
      announceToScreenReader('Please select a file to upload', 'assertive');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);
    announceToScreenReader('Uploading book, please wait...');

    try {
      const response = await fetch('/api/books/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setUploadResult({ success: true, message: 'Book uploaded successfully!' });
        announceToScreenReader('Book uploaded successfully!');
        
        // Reset form
        e.currentTarget.reset();
      } else {
        setUploadResult({ success: false, message: data.error || 'Upload failed' });
        announceToScreenReader(`Upload failed: ${data.error}`, 'assertive');
      }
    } catch (error) {
      setUploadResult({ success: false, message: 'Network error occurred' });
      announceToScreenReader('Network error occurred', 'assertive');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="page-container magical-bg min-h-screen" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
      {/* Magical Portfolio Background */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(circle at 20% 50%, rgba(102, 126, 234, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(118, 75, 162, 0.12) 0%, transparent 50%),
          radial-gradient(circle at 40% 20%, rgba(240, 147, 251, 0.08) 0%, transparent 50%)
        `
      }} />
      
      <div className="relative max-w-2xl mx-auto px-12 py-12">
        {/* Back Navigation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <Link 
            href="/library"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors font-medium"
            style={{
              textDecoration: 'none',
              fontSize: '16px',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
            }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Library</span>
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-gradient hero-title" style={{
            fontSize: 'var(--text-5xl)',
            fontWeight: '800',
            marginBottom: '2rem',
            lineHeight: '1.2',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Upload a Book
          </h1>
          <p className="hero-subtitle" style={{
            fontSize: 'var(--text-xl)',
            color: 'var(--text-secondary)',
            lineHeight: '1.6',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            Share public domain books with the community and enhance them with AI-powered features
          </p>
        </motion.div>

        {/* Upload Result */}
        {uploadResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            <AccessibleWrapper
              as="div"
              role="alert"
              aria-live="polite"
              style={{
                padding: '24px',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: uploadResult.success 
                  ? 'rgba(34, 197, 94, 0.1)' 
                  : 'rgba(239, 68, 68, 0.1)',
                border: uploadResult.success
                  ? '1px solid rgba(34, 197, 94, 0.3)'
                  : '1px solid rgba(239, 68, 68, 0.3)',
                color: uploadResult.success ? '#22c55e' : '#ef4444',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.15), 0 10px 25px rgba(0, 0, 0, 0.25)'
              }}
            >
              {uploadResult.success ? (
                <CheckCircle className="w-6 h-6 flex-shrink-0" style={{ color: '#22c55e' }} />
              ) : (
                <XCircle className="w-6 h-6 flex-shrink-0" style={{ color: '#ef4444' }} />
              )}
              <span style={{
                fontWeight: '600',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
              }}>{uploadResult.message}</span>
            </AccessibleWrapper>
          </motion.div>
        )}

        {/* Main Upload Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          onSubmit={handleSubmit}
          className="space-y-8"
        >
          {/* Premium File Upload Section */}
          <div style={{
            background: 'var(--surface-elevated)',
            borderRadius: '24px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.15), 0 10px 25px rgba(0, 0, 0, 0.25), 0 2px 4px rgba(0, 0, 0, 0.1)',
            border: '1px solid var(--border-light)',
            padding: '40px',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ marginBottom: '32px' }}>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{
                  fontSize: '2rem',
                  fontWeight: '800',
                  color: 'var(--text-primary)',
                  marginBottom: '8px',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                }}>Choose your file</h2>
                <p style={{
                  fontSize: '1.1rem',
                  color: 'var(--text-secondary)',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                }}>Upload a book in TXT, PDF, or HTML format</p>
              </div>

              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className="relative"
              >
                <input
                  type="file"
                  id="file"
                  name="file"
                  accept=".txt,.pdf,.html"
                  required
                  disabled={isUploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                  aria-describedby="file-help"
                />
                <motion.div
                  animate={{
                    borderColor: dragActive ? "var(--brand-primary)" : "var(--border-light)",
                    backgroundColor: dragActive ? "rgba(102, 126, 234, 0.1)" : "rgba(255,255,255,0.02)"
                  }}
                  transition={{ duration: 0.3 }}
                  style={{
                    border: '2px dashed',
                    borderRadius: '20px',
                    padding: '48px',
                    textAlign: 'center',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
                  }}
                >
                  <div className="flex flex-col items-center gap-4">
                    <motion.div
                      animate={{ scale: dragActive ? 1.2 : 1 }}
                      transition={{ 
                        duration: 0.3,
                        type: "spring",
                        stiffness: 400,
                        damping: 10
                      }}
                      style={{
                        padding: '20px',
                        background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)',
                        borderRadius: '20px',
                        marginBottom: '24px',
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4), 0 8px 24px rgba(102, 126, 234, 0.2)',
                        display: 'inline-block'
                      }}
                    >
                      <Upload className="w-10 h-10" style={{ color: '#ffffff' }} />
                    </motion.div>
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{
                        fontSize: '1.25rem',
                        fontWeight: '700',
                        color: 'var(--text-primary)',
                        marginBottom: '8px',
                        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                      }}>
                        {dragActive ? "Drop your file here" : "Drag and drop your file here"}
                      </p>
                      <p style={{
                        color: 'var(--text-secondary)',
                        fontSize: '16px',
                        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                      }}>or click to browse</p>
                    </div>
                    <p id="file-help" style={{
                      fontSize: '14px',
                      color: 'var(--text-secondary)',
                      opacity: 0.8,
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                    }}>
                      Supported formats: TXT, PDF, HTML (max 10MB)
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Premium Book Information Section */}
          <div style={{
            background: 'var(--surface-elevated)',
            borderRadius: '24px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.15), 0 10px 25px rgba(0, 0, 0, 0.25), 0 2px 4px rgba(0, 0, 0, 0.1)',
            border: '1px solid var(--border-light)',
            padding: '40px',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ marginBottom: '32px' }}>
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{
                  fontSize: '2rem',
                  fontWeight: '800',
                  color: 'var(--text-primary)',
                  marginBottom: '8px',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                }}>Book details</h2>
                <p style={{
                  fontSize: '1.1rem',
                  color: 'var(--text-secondary)',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                }}>Tell us about the book you're uploading</p>
              </div>

              <div style={{ display: 'grid', gap: '24px' }}>
                {/* Title & Author */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                  <div>
                    <label htmlFor="title" style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: 'var(--text-primary)',
                      marginBottom: '8px',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                    }}>
                      Title *
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      required
                      disabled={isUploading}
                      className="input-styled"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        color: 'var(--text-primary)',
                        background: 'var(--surface-elevated)',
                        border: '2px solid var(--border-light)',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                        outline: 'none',
                        transition: 'all 0.3s ease',
                        opacity: isUploading ? 0.5 : 1
                      }}
                      placeholder="Enter book title"
                    />
                  </div>

                  <div>
                    <label htmlFor="author" style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: 'var(--text-primary)',
                      marginBottom: '8px',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                    }}>
                      Author *
                    </label>
                    <input
                      type="text"
                      id="author"
                      name="author"
                      required
                      disabled={isUploading}
                      className="input-styled"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        color: 'var(--text-primary)',
                        background: 'var(--surface-elevated)',
                        border: '2px solid var(--border-light)',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                        outline: 'none',
                        transition: 'all 0.3s ease',
                        opacity: isUploading ? 0.5 : 1
                      }}
                      placeholder="Enter author name"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    marginBottom: '8px',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                  }}>
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    disabled={isUploading}
                    className="input-styled"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      color: 'var(--text-primary)',
                      background: 'var(--surface-elevated)',
                      border: '2px solid var(--border-light)',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      resize: 'none',
                      opacity: isUploading ? 0.5 : 1
                    }}
                    placeholder="Brief description of the book (optional)"
                  />
                </div>

                {/* Genre & Year */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                  <div>
                    <label htmlFor="genre" style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: 'var(--text-primary)',
                      marginBottom: '8px',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                    }}>
                      Genre
                    </label>
                    <input
                      type="text"
                      id="genre"
                      name="genre"
                      disabled={isUploading}
                      className="input-styled"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        color: 'var(--text-primary)',
                        background: 'var(--surface-elevated)',
                        border: '2px solid var(--border-light)',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                        outline: 'none',
                        transition: 'all 0.3s ease',
                        opacity: isUploading ? 0.5 : 1
                      }}
                      placeholder="e.g., Fiction, History, Philosophy"
                    />
                  </div>

                  <div>
                    <label htmlFor="publishYear" style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: 'var(--text-primary)',
                      marginBottom: '8px',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                    }}>
                      Publication Year
                    </label>
                    <input
                      type="number"
                      id="publishYear"
                      name="publishYear"
                      min="1000"
                      max="2024"
                      disabled={isUploading}
                      className="input-styled"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        color: 'var(--text-primary)',
                        background: 'var(--surface-elevated)',
                        border: '2px solid var(--border-light)',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                        outline: 'none',
                        transition: 'all 0.3s ease',
                        opacity: isUploading ? 0.5 : 1
                      }}
                      placeholder="e.g., 1925"
                    />
                  </div>
                </div>

                {/* ISBN */}
                <div>
                  <label htmlFor="isbn" style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    marginBottom: '8px',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                  }}>
                    ISBN <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>(optional)</span>
                  </label>
                  <input
                    type="text"
                    id="isbn"
                    name="isbn"
                    disabled={isUploading}
                    className="input-styled"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      color: 'var(--text-primary)',
                      background: 'var(--surface-elevated)',
                      border: '2px solid var(--border-light)',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      opacity: isUploading ? 0.5 : 1
                    }}
                    placeholder="978-0-123456-78-9"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Public Domain Notice */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '20px',
              padding: '24px',
              backdropFilter: 'blur(10px)'
            }}
          >
            <div style={{ display: 'flex', gap: '12px' }}>
              <BookOpen className="w-5 h-5 mt-1 flex-shrink-0" style={{ color: '#f59e0b' }} />
              <div>
                <h3 style={{
                  fontWeight: '700',
                  color: '#f59e0b',
                  marginBottom: '8px',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  fontSize: '16px'
                }}>Public Domain Only</h3>
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                }}>
                  Please ensure your book is in the public domain before uploading. 
                  This typically includes works published before 1928 or those explicitly released to the public domain.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Submit Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex justify-center pt-4"
          >
            <motion.button
              type="submit"
              disabled={isUploading}
              whileHover={{ 
                scale: isUploading ? 1 : 1.02,
                boxShadow: isUploading ? undefined : '0 12px 40px rgba(102, 126, 234, 0.6), 0 0 0 1px rgba(255,255,255,0.1)',
                y: isUploading ? 0 : -3
              }}
              whileTap={{ scale: isUploading ? 1 : 0.98 }}
              style={{
                padding: '16px 32px',
                background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 50%, #8b5cf6 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '20px',
                fontSize: '1.1rem',
                fontWeight: '800',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                letterSpacing: '0.02em',
                textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                opacity: isUploading ? 0.7 : 1
              }}
            >
              {/* Enhanced Shimmer Effect */}
              {!isUploading && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: '-100%',
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                  animation: 'shimmer 3s infinite',
                  zIndex: 1
                }} />
              )}
              
              {isUploading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    style={{
                      width: '20px',
                      height: '20px',
                      border: '2px solid #ffffff',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%'
                    }}
                  />
                  <span style={{ zIndex: 2 }}>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" style={{ zIndex: 2 }} />
                  <span style={{ 
                    zIndex: 2,
                    background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>Upload Book</span>
                </>
              )}
            </motion.button>
          </motion.div>
        </motion.form>
      </div>
    </div>
  );
}