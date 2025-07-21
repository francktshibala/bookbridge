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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-100/20 via-transparent to-indigo-100/20 pointer-events-none" />
      
      <div className="relative max-w-4xl mx-auto px-6 py-12">
        {/* Back Navigation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <Link 
            href="/library"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Library</span>
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-extrabold text-gray-900 mb-4">
            Upload a Book
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
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
              className={`p-6 rounded-2xl flex items-center gap-3 ${
                uploadResult.success 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {uploadResult.success ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              )}
              <span className="font-medium">{uploadResult.message}</span>
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
          {/* File Upload Section */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-10">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose your file</h2>
                <p className="text-gray-600">Upload a book in TXT, PDF, or HTML format</p>
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
                    borderColor: dragActive ? "#8b5cf6" : "#e5e7eb",
                    backgroundColor: dragActive ? "#faf5ff" : "#fafafa"
                  }}
                  transition={{ duration: 0.2 }}
                  className="border-2 border-dashed rounded-2xl p-12 text-center transition-colors"
                >
                  <div className="flex flex-col items-center gap-4">
                    <motion.div
                      animate={{ scale: dragActive ? 1.1 : 1 }}
                      transition={{ duration: 0.2 }}
                      className="p-4 bg-purple-100 rounded-2xl"
                    >
                      <Upload className="w-8 h-8 text-purple-600" />
                    </motion.div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900">
                        {dragActive ? "Drop your file here" : "Drag and drop your file here"}
                      </p>
                      <p className="text-gray-500 mt-1">or click to browse</p>
                    </div>
                    <p id="file-help" className="text-sm text-gray-500">
                      Supported formats: TXT, PDF, HTML (max 10MB)
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Book Information Section */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-10">
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Book details</h2>
                <p className="text-gray-600">Tell us about the book you're uploading</p>
              </div>

              <div className="grid gap-6">
                {/* Title & Author */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      required
                      disabled={isUploading}
                      className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 transition-all"
                      placeholder="Enter book title"
                    />
                  </div>

                  <div>
                    <label htmlFor="author" className="block text-sm font-semibold text-gray-700 mb-2">
                      Author *
                    </label>
                    <input
                      type="text"
                      id="author"
                      name="author"
                      required
                      disabled={isUploading}
                      className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 transition-all"
                      placeholder="Enter author name"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    disabled={isUploading}
                    className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 transition-all resize-none"
                    placeholder="Brief description of the book (optional)"
                  />
                </div>

                {/* Genre & Year */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="genre" className="block text-sm font-semibold text-gray-700 mb-2">
                      Genre
                    </label>
                    <input
                      type="text"
                      id="genre"
                      name="genre"
                      disabled={isUploading}
                      className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 transition-all"
                      placeholder="e.g., Fiction, History, Philosophy"
                    />
                  </div>

                  <div>
                    <label htmlFor="publishYear" className="block text-sm font-semibold text-gray-700 mb-2">
                      Publication Year
                    </label>
                    <input
                      type="number"
                      id="publishYear"
                      name="publishYear"
                      min="1000"
                      max="2024"
                      disabled={isUploading}
                      className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 transition-all"
                      placeholder="e.g., 1925"
                    />
                  </div>
                </div>

                {/* ISBN */}
                <div>
                  <label htmlFor="isbn" className="block text-sm font-semibold text-gray-700 mb-2">
                    ISBN <span className="text-gray-500 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    id="isbn"
                    name="isbn"
                    disabled={isUploading}
                    className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 transition-all"
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
            className="bg-amber-50 border border-amber-200 rounded-2xl p-6"
          >
            <div className="flex gap-3">
              <BookOpen className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-900 mb-1">Public Domain Only</h3>
                <p className="text-amber-700 text-sm leading-relaxed">
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
              whileHover={{ scale: isUploading ? 1 : 1.02 }}
              whileTap={{ scale: isUploading ? 1 : 0.98 }}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
            >
              {isUploading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload Book
                </>
              )}
            </motion.button>
          </motion.div>
        </motion.form>
      </div>
    </div>
  );
}