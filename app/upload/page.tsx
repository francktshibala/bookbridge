'use client';

import React, { useState } from 'react';
import { AccessibleWrapper } from '@/components/AccessibleWrapper';
import { useAccessibility } from '@/contexts/AccessibilityContext';

export default function UploadPage() {
  const { announceToScreenReader } = useAccessibility();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const file = formData.get('file') as File;
    
    if (!file) {
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
    <div className="max-w-2xl mx-auto">
      <AccessibleWrapper as="header" className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Upload a Book</h1>
        <p className="text-lg text-secondary">
          Upload a public domain book to add it to the BookBridge library. 
          Currently supported formats: text files (.txt), PDF files (.pdf), and HTML files (.html).
        </p>
      </AccessibleWrapper>

      <AccessibleWrapper as="section" ariaLabelledBy="upload-form-heading">
        <h2 id="upload-form-heading" className="text-xl font-semibold mb-6">
          Book Information
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="file" className="block text-sm font-medium mb-2">
              Book File *
            </label>
            <input
              type="file"
              id="file"
              name="file"
              accept=".txt,.pdf,.html"
              required
              disabled={isUploading}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent disabled:opacity-50"
              aria-describedby="file-help"
            />
            <div id="file-help" className="text-sm text-secondary mt-1">
              Accepted formats: .txt, .pdf, .html (max 10MB)
            </div>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2">
              Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              disabled={isUploading}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent disabled:opacity-50"
              placeholder="Enter the book title"
            />
          </div>

          <div>
            <label htmlFor="author" className="block text-sm font-medium mb-2">
              Author *
            </label>
            <input
              type="text"
              id="author"
              name="author"
              required
              disabled={isUploading}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent disabled:opacity-50"
              placeholder="Enter the author name"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              disabled={isUploading}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent disabled:opacity-50"
              placeholder="Brief description of the book"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="genre" className="block text-sm font-medium mb-2">
                Genre
              </label>
              <input
                type="text"
                id="genre"
                name="genre"
                disabled={isUploading}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent disabled:opacity-50"
                placeholder="e.g., Fiction, Non-fiction, Poetry"
              />
            </div>

            <div>
              <label htmlFor="publishYear" className="block text-sm font-medium mb-2">
                Publication Year
              </label>
              <input
                type="number"
                id="publishYear"
                name="publishYear"
                min="1000"
                max="2024"
                disabled={isUploading}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent disabled:opacity-50"
                placeholder="1925"
              />
            </div>
          </div>

          <div>
            <label htmlFor="isbn" className="block text-sm font-medium mb-2">
              ISBN (optional)
            </label>
            <input
              type="text"
              id="isbn"
              name="isbn"
              disabled={isUploading}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent disabled:opacity-50"
              placeholder="978-0-123456-78-9"
            />
          </div>

          <AccessibleWrapper as="section" className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <h3 className="font-medium text-yellow-800 mb-2">
              Public Domain Only
            </h3>
            <p className="text-sm text-yellow-700">
              During our beta phase, we only accept public domain books to ensure copyright compliance. 
              Please verify that your book is in the public domain before uploading.
            </p>
          </AccessibleWrapper>

          {uploadResult && (
            <AccessibleWrapper
              as="div"
              role="alert"
              ariaLive="polite"
              className={`p-4 rounded-md ${
                uploadResult.success 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {uploadResult.message}
            </AccessibleWrapper>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isUploading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              aria-describedby="upload-status"
            >
              {isUploading ? 'Uploading...' : 'Upload Book'}
            </button>

            <a
              href="/library"
              className="btn-secondary"
              aria-label="Browse existing books in the library"
            >
              Browse Library
            </a>
          </div>

          <div id="upload-status" className="sr-only" aria-live="polite">
            {isUploading ? 'Upload in progress' : 'Upload form ready'}
          </div>
        </form>
      </AccessibleWrapper>
    </div>
  );
}