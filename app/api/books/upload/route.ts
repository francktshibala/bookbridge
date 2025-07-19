import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Get user from Supabase auth
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const author = formData.get('author') as string;
    const description = formData.get('description') as string;
    const genre = formData.get('genre') as string;
    const publishYear = formData.get('publishYear') as string;
    const isbn = formData.get('isbn') as string;

    // Validate required fields
    if (!file || !title || !author) {
      return NextResponse.json(
        { error: 'File, title, and author are required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['text/plain', 'application/pdf', 'text/html'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only text, PDF, and HTML files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // For MVP, only allow public domain books
    const publicDomain = true;

    // Check if book already exists
    const existingBook = await prisma.book.findFirst({
      where: {
        title: { equals: title, mode: 'insensitive' },
        author: { equals: author, mode: 'insensitive' }
      }
    });

    if (existingBook) {
      return NextResponse.json(
        { error: 'Book already exists in the database' },
        { status: 409 }
      );
    }

    // Extract basic metadata from file
    const fileBuffer = await file.arrayBuffer();
    const fileContent = new TextDecoder().decode(fileBuffer);
    
    // Basic content extraction for different file types
    let extractedContent = '';
    let detectedLanguage = 'en';
    
    if (file.type === 'text/plain') {
      extractedContent = fileContent;
    } else if (file.type === 'text/html') {
      // Simple HTML content extraction (remove tags)
      extractedContent = fileContent.replace(/<[^>]*>/g, '');
    } else if (file.type === 'application/pdf') {
      // For PDF, we would need a PDF parser library
      // For now, just indicate it's a PDF
      extractedContent = 'PDF content - processing not implemented yet';
    }

    // Simple language detection (basic heuristic)
    if (extractedContent.length > 100) {
      const commonEnglishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
      const words = extractedContent.toLowerCase().split(/\s+/).slice(0, 100);
      const englishWordCount = words.filter(word => commonEnglishWords.includes(word)).length;
      
      if (englishWordCount / words.length < 0.1) {
        detectedLanguage = 'unknown';
      }
    }

    // Create service role client for storage upload to bypass RLS
    const storageSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Upload file to Supabase Storage
    const fileName = `${Date.now()}-${file.name}`;
    console.log('Attempting file upload to storage with service role...');
    const { data: uploadData, error: uploadError } = await storageSupabase.storage
      .from('book-files')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('File upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }
    console.log('File uploaded successfully to storage');

    // Create service role client to bypass RLS
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Generate a unique ID manually since CUID might not be working
    const crypto = require('crypto');
    const bookId = crypto.randomUUID();

    // Debug logging
    console.log('Using service role key:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...');
    console.log('User ID:', user.id);
    console.log('Book ID:', bookId);

    const insertData = {
      id: bookId,
      title,
      author,
      description,
      genre,
      publishYear: publishYear ? parseInt(publishYear) : null,
      isbn,
      language: detectedLanguage,
      publicDomain,
      filename: fileName,
      fileSize: file.size,
      uploadedBy: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('Insert data:', JSON.stringify(insertData, null, 2));

    // Create book record in database using service role to bypass RLS
    const { data: bookData, error: bookError } = await serviceSupabase
      .from('books')
      .insert(insertData)
      .select()
      .single();

    if (bookError) {
      console.error('Database insert error:', bookError);
      return NextResponse.json(
        { error: 'Failed to create book record' },
        { status: 500 }
      );
    }

    const book = bookData;

    return NextResponse.json({ 
      book,
      message: 'Book uploaded successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}