import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const { userName, rating, content } = body;
    
    if (!userName || !rating || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: userName, rating, content' },
        { status: 400 }
      );
    }

    // Validate rating is between 1-5
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    const testimonial = await prisma.appTestimonial.create({
      data: {
        userName,
        userTitle: body.userTitle || null,
        userRole: body.userRole || null,
        rating: parseInt(rating),
        content,
        featured: body.featured || false,
        verified: body.verified || false,
        avatarColor: body.avatarColor || '#667eea'
      }
    });

    return NextResponse.json(testimonial, { status: 201 });
  } catch (error) {
    console.error('Error creating testimonial:', error);
    return NextResponse.json(
      { error: 'Failed to create testimonial' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const testimonials = await prisma.appTestimonial.findMany({
      orderBy: [
        { featured: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json(testimonials);
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    return NextResponse.json(
      { error: 'Failed to fetch testimonials' },
      { status: 500 }
    );
  }
}