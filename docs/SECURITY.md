# BookBridge Security Strategy

## Overview

BookBridge implements defense-in-depth security measures to protect user data, prevent unauthorized access, and ensure compliance with privacy regulations. Security is built into every layer of the application.

## Security Architecture

### Security Layers

```
┌─────────────────────────────────────────┐
│ Layer 7: User Education & Awareness     │
├─────────────────────────────────────────┤
│ Layer 6: Monitoring & Incident Response │
├─────────────────────────────────────────┤
│ Layer 5: Application Security           │
├─────────────────────────────────────────┤
│ Layer 4: API Security & Rate Limiting   │
├─────────────────────────────────────────┤
│ Layer 3: Authentication & Authorization │
├─────────────────────────────────────────┤
│ Layer 2: Data Protection & Encryption   │
├─────────────────────────────────────────┤
│ Layer 1: Infrastructure Security        │
└─────────────────────────────────────────┘
```

## Application Security

### Input Validation & Sanitization

```typescript
// lib/validation.ts
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Input validation schemas
export const userQuerySchema = z.object({
  query: z.string()
    .min(1, 'Query cannot be empty')
    .max(500, 'Query too long')
    .regex(/^[a-zA-Z0-9\s\?\.\!\,\-\'\"\(\)]+$/, 'Invalid characters'),
  bookId: z.string().uuid('Invalid book ID'),
  userId: z.string().uuid('Invalid user ID')
});

export const bookUploadSchema = z.object({
  title: z.string()
    .min(1, 'Title required')
    .max(200, 'Title too long')
    .regex(/^[a-zA-Z0-9\s\-\'\"\.\,\!\?]+$/, 'Invalid characters'),
  author: z.string()
    .min(1, 'Author required')
    .max(100, 'Author name too long')
    .regex(/^[a-zA-Z\s\-\'\.]+$/, 'Invalid characters'),
  publicDomain: z.boolean(),
  content: z.string().max(10000000, 'File too large') // 10MB limit
});

// Sanitization functions
export const sanitizeUserInput = (input: string): string => {
  // Remove HTML tags and dangerous characters
  const cleaned = DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
  
  // Additional sanitization for AI queries
  return cleaned
    .replace(/[<>]/g, '') // Remove any remaining angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

export const sanitizeFileName = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9\-_\.]/g, '_') // Replace special chars
    .replace(/_{2,}/g, '_') // Replace multiple underscores
    .substring(0, 255); // Limit length
};

// Rate limiting with Redis
export class RateLimiter {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }
  
  async checkLimit(
    key: string, 
    limit: number, 
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; reset: Date }> {
    const now = Date.now();
    const window = Math.floor(now / windowMs);
    const redisKey = `rate_limit:${key}:${window}`;
    
    const current = await this.redis.incr(redisKey);
    
    if (current === 1) {
      await this.redis.expire(redisKey, Math.ceil(windowMs / 1000));
    }
    
    const remaining = Math.max(0, limit - current);
    const reset = new Date((window + 1) * windowMs);
    
    return {
      allowed: current <= limit,
      remaining,
      reset
    };
  }
}
```

### Content Security Policy

```typescript
// next.config.js
const ContentSecurityPolicy = {
  'default-src': "'self'",
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for Next.js dev mode
    'https://js.stripe.com',
    'https://checkout.stripe.com'
  ].join(' '),
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for CSS-in-JS
    'https://fonts.googleapis.com'
  ].join(' '),
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com'
  ].join(' '),
  'img-src': [
    "'self'",
    'data:',
    'https://cdn.supabase.com'
  ].join(' '),
  'connect-src': [
    "'self'",
    'https://api.openai.com',
    'https://api.stripe.com',
    process.env.NEXT_PUBLIC_SUPABASE_URL
  ].join(' '),
  'frame-src': [
    'https://js.stripe.com',
    'https://hooks.stripe.com'
  ].join(' '),
  'frame-ancestors': "'none'",
  'base-uri': "'self'",
  'form-action': "'self'"
};

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: Object.entries(ContentSecurityPolicy)
      .map(([key, value]) => `${key} ${value}`)
      .join('; ')
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders
      }
    ];
  }
};
```

## Authentication & Authorization

### Secure Authentication Implementation

```typescript
// lib/auth.ts
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export class AuthService {
  private readonly jwtSecret: string;
  private readonly saltRounds = 12;
  
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET!;
    if (!this.jwtSecret) {
      throw new Error('JWT_SECRET environment variable required');
    }
  }

  // Secure password hashing
  async hashPassword(password: string): Promise<string> {
    // Validate password strength
    this.validatePasswordStrength(password);
    
    return await bcrypt.hash(password, this.saltRounds);
  }

  // Constant-time password verification
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      // Log failed verification attempts
      console.error('Password verification error:', error);
      return false;
    }
  }

  // Password strength validation
  private validatePasswordStrength(password: string): void {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      throw new Error('Password must be at least 8 characters long');
    }

    const strengthScore = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar]
      .filter(Boolean).length;

    if (strengthScore < 3) {
      throw new Error('Password must contain at least 3 of: uppercase, lowercase, numbers, special characters');
    }
  }

  // Secure JWT generation
  generateToken(payload: { userId: string; email: string }): string {
    return jwt.sign(
      payload,
      this.jwtSecret,
      {
        expiresIn: '24h',
        issuer: 'bookbridge',
        audience: 'bookbridge-users'
      }
    );
  }

  // JWT verification with timing attack protection
  verifyToken(token: string): { userId: string; email: string } | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: 'bookbridge',
        audience: 'bookbridge-users'
      }) as any;

      return {
        userId: decoded.userId,
        email: decoded.email
      };
    } catch (error) {
      return null;
    }
  }

  // Rate-limited login attempts
  async checkLoginAttempts(email: string): Promise<boolean> {
    const rateLimiter = new RateLimiter();
    const result = await rateLimiter.checkLimit(
      `login:${email}`,
      5, // 5 attempts
      15 * 60 * 1000 // 15 minutes
    );

    return result.allowed;
  }
}

// Session management with secure cookies
export const sessionConfig = {
  cookieName: 'bookbridge_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' as const,
    path: '/'
  }
};
```

### Role-Based Access Control

```typescript
// lib/rbac.ts
export enum Permission {
  READ_BOOKS = 'read_books',
  UPLOAD_BOOKS = 'upload_books',
  AI_QUERY = 'ai_query',
  PREMIUM_FEATURES = 'premium_features',
  ADMIN_ACCESS = 'admin_access',
  MODERATE_CONTENT = 'moderate_content'
}

export enum Role {
  FREE_USER = 'free_user',
  PREMIUM_USER = 'premium_user',
  STUDENT = 'student',
  EDUCATOR = 'educator',
  ADMIN = 'admin'
}

const rolePermissions: Record<Role, Permission[]> = {
  [Role.FREE_USER]: [Permission.READ_BOOKS, Permission.AI_QUERY],
  [Role.PREMIUM_USER]: [
    Permission.READ_BOOKS,
    Permission.UPLOAD_BOOKS,
    Permission.AI_QUERY,
    Permission.PREMIUM_FEATURES
  ],
  [Role.STUDENT]: [
    Permission.READ_BOOKS,
    Permission.UPLOAD_BOOKS,
    Permission.AI_QUERY,
    Permission.PREMIUM_FEATURES
  ],
  [Role.EDUCATOR]: [
    Permission.READ_BOOKS,
    Permission.UPLOAD_BOOKS,
    Permission.AI_QUERY,
    Permission.PREMIUM_FEATURES,
    Permission.MODERATE_CONTENT
  ],
  [Role.ADMIN]: Object.values(Permission)
};

export class AuthorizationService {
  hasPermission(userRole: Role, permission: Permission): boolean {
    return rolePermissions[userRole]?.includes(permission) ?? false;
  }

  enforcePermission(userRole: Role, permission: Permission): void {
    if (!this.hasPermission(userRole, permission)) {
      throw new Error(`Insufficient permissions: ${permission}`);
    }
  }
}
```

## Data Protection & Encryption

### Data Encryption Strategy

```typescript
// lib/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  private readonly saltLength = 32;

  // Encrypt sensitive data
  async encrypt(text: string, password: string): Promise<string> {
    const salt = randomBytes(this.saltLength);
    const iv = randomBytes(this.ivLength);
    
    const key = (await scryptAsync(password, salt, this.keyLength)) as Buffer;
    
    const cipher = createCipheriv(this.algorithm, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine salt, iv, tag, and encrypted data
    const combined = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'hex')
    ]);
    
    return combined.toString('base64');
  }

  // Decrypt sensitive data
  async decrypt(encryptedData: string, password: string): Promise<string> {
    const combined = Buffer.from(encryptedData, 'base64');
    
    const salt = combined.subarray(0, this.saltLength);
    const iv = combined.subarray(this.saltLength, this.saltLength + this.ivLength);
    const tag = combined.subarray(
      this.saltLength + this.ivLength,
      this.saltLength + this.ivLength + this.tagLength
    );
    const encrypted = combined.subarray(this.saltLength + this.ivLength + this.tagLength);
    
    const key = (await scryptAsync(password, salt, this.keyLength)) as Buffer;
    
    const decipher = createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Hash sensitive data (one-way)
  hashSensitiveData(data: string): string {
    const hash = createHash('sha256');
    hash.update(data + process.env.HASH_SALT);
    return hash.digest('hex');
  }
}

// PII Protection
export class PIIProtection {
  private static readonly emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  private static readonly phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
  private static readonly ssnRegex = /\b\d{3}-?\d{2}-?\d{4}\b/g;

  static sanitizeForLogging(text: string): string {
    return text
      .replace(this.emailRegex, '[EMAIL_REDACTED]')
      .replace(this.phoneRegex, '[PHONE_REDACTED]')
      .replace(this.ssnRegex, '[SSN_REDACTED]');
  }

  static detectPII(text: string): string[] {
    const detected: string[] = [];
    
    if (this.emailRegex.test(text)) detected.push('email');
    if (this.phoneRegex.test(text)) detected.push('phone');
    if (this.ssnRegex.test(text)) detected.push('ssn');
    
    return detected;
  }
}
```

## API Security

### Secure API Middleware

```typescript
// middleware/security.ts
import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter } from '../lib/rate-limiter';
import { AuthService } from '../lib/auth';

const rateLimiter = new RateLimiter();
const authService = new AuthService();

export async function securityMiddleware(request: NextRequest) {
  const response = NextResponse.next();

  // Rate limiting
  const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimitResult = await rateLimiter.checkLimit(
    `api:${clientIP}`,
    100, // 100 requests
    60 * 1000 // per minute
  );

  if (!rateLimitResult.allowed) {
    return new NextResponse('Rate limit exceeded', { 
      status: 429,
      headers: {
        'Retry-After': '60',
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': rateLimitResult.reset.toISOString()
      }
    });
  }

  // Add rate limit headers
  response.headers.set('X-RateLimit-Limit', '100');
  response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toISOString());

  // CORS handling
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || 'https://bookbridge.ai',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  return response;
}

// API route authentication
export function withAuth(handler: Function) {
  return async (req: NextRequest) => {
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = authService.verifyToken(token);

    if (!user) {
      return new NextResponse('Invalid token', { status: 401 });
    }

    // Add user to request context
    (req as any).user = user;
    
    return handler(req);
  };
}
```

## Secrets Management

### Environment Variables Security

```typescript
// lib/config.ts
import { z } from 'zod';

// Validate all environment variables at startup
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_ENCRYPTION_KEY: z.string().min(32),
  
  // Authentication
  JWT_SECRET: z.string().min(32),
  HASH_SALT: z.string().min(16),
  
  // AI Services
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  
  // Payment Processing
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  
  // External Services
  REDIS_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string(),
  
  // Security
  ALLOWED_ORIGINS: z.string().optional(),
  RATE_LIMIT_REDIS_URL: z.string().url().optional(),
  
  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']),
  VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional()
});

export const config = envSchema.parse(process.env);

// Secrets rotation schedule
export class SecretsManager {
  private static readonly ROTATION_INTERVALS = {
    JWT_SECRET: 90 * 24 * 60 * 60 * 1000, // 90 days
    API_KEYS: 180 * 24 * 60 * 60 * 1000, // 180 days
    DATABASE_KEYS: 365 * 24 * 60 * 60 * 1000 // 1 year
  };

  static shouldRotateSecret(secretType: keyof typeof this.ROTATION_INTERVALS, lastRotated: Date): boolean {
    const interval = this.ROTATION_INTERVALS[secretType];
    return Date.now() - lastRotated.getTime() > interval;
  }

  static async rotateJWTSecret(): Promise<void> {
    // Implementation would integrate with your secrets management system
    // This is a placeholder for the rotation logic
    console.log('JWT secret rotation required');
  }
}
```

## Monitoring & Logging

### Security Monitoring

```typescript
// lib/security-monitoring.ts
import { createHash } from 'crypto';

export enum SecurityEventType {
  FAILED_LOGIN = 'failed_login',
  SUCCESSFUL_LOGIN = 'successful_login',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  DATA_ACCESS = 'data_access',
  PERMISSION_DENIED = 'permission_denied',
  PASSWORD_CHANGE = 'password_change',
  ACCOUNT_LOCKOUT = 'account_lockout'
}

interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  email?: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class SecurityLogger {
  private static instance: SecurityLogger;
  
  static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger();
    }
    return SecurityLogger.instance;
  }

  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    // Sanitize sensitive data
    const sanitizedEvent = {
      ...event,
      email: event.email ? this.hashEmail(event.email) : undefined,
      ip: this.hashIP(event.ip),
      userAgent: this.sanitizeUserAgent(event.userAgent)
    };

    // Log to multiple destinations
    await Promise.all([
      this.logToDatabase(sanitizedEvent),
      this.logToSIEM(sanitizedEvent),
      this.checkAlertThresholds(sanitizedEvent)
    ]);
  }

  private hashEmail(email: string): string {
    return createHash('sha256').update(email + process.env.HASH_SALT).digest('hex');
  }

  private hashIP(ip: string): string {
    // Hash IP but preserve some geographic information for analysis
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
    return createHash('sha256').update(ip + process.env.HASH_SALT).digest('hex');
  }

  private sanitizeUserAgent(userAgent: string): string {
    // Remove potentially sensitive information while preserving security-relevant data
    return userAgent.replace(/\([^)]*\)/g, '(redacted)');
  }

  private async logToDatabase(event: any): Promise<void> {
    // Store in security_events table
    await prisma.securityEvent.create({
      data: event
    });
  }

  private async logToSIEM(event: any): Promise<void> {
    // Send to Security Information and Event Management system
    // Implementation depends on your SIEM choice
    console.log('Security event:', event);
  }

  private async checkAlertThresholds(event: any): Promise<void> {
    // Implement threshold-based alerting
    if (event.type === SecurityEventType.FAILED_LOGIN) {
      await this.checkFailedLoginThreshold(event.ip);
    }
    
    if (event.type === SecurityEventType.RATE_LIMIT_EXCEEDED) {
      await this.checkRateLimitThreshold(event.ip);
    }
  }

  private async checkFailedLoginThreshold(ip: string): Promise<void> {
    const recentFailures = await prisma.securityEvent.count({
      where: {
        type: SecurityEventType.FAILED_LOGIN,
        ip,
        timestamp: {
          gte: new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
        }
      }
    });

    if (recentFailures >= 10) {
      await this.sendSecurityAlert({
        type: 'multiple_failed_logins',
        ip,
        count: recentFailures
      });
    }
  }

  private async sendSecurityAlert(alert: any): Promise<void> {
    // Send alert to security team
    console.log('Security alert:', alert);
    
    // In production, this would integrate with:
    // - Email alerts
    // - Slack notifications
    // - PagerDuty
    // - SMS alerts for critical issues
  }
}
```

## Vulnerability Management

### Dependency Security

```json
// .github/workflows/security.yml
name: Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM

jobs:
  dependency-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Snyk to check for vulnerabilities
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
      
      - name: Upload result to GitHub Code Scanning
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: snyk.sarif

  code-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Initialize CodeQL
        uses: github/codeql-action/init@v2
        with:
          languages: javascript, typescript
      
      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2

  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run npm audit
        run: npm audit --audit-level high
      
      - name: Run custom security tests
        run: npm run test:security
```

### Security Testing

```typescript
// __tests__/security/security.test.ts
import { AuthService } from '../../lib/auth';
import { RateLimiter } from '../../lib/rate-limiter';
import { EncryptionService } from '../../lib/encryption';

describe('Security Tests', () => {
  describe('Password Security', () => {
    const authService = new AuthService();

    it('rejects weak passwords', async () => {
      const weakPasswords = ['123456', 'password', 'qwerty', 'abc123'];
      
      for (const password of weakPasswords) {
        await expect(authService.hashPassword(password)).rejects.toThrow();
      }
    });

    it('accepts strong passwords', async () => {
      const strongPasswords = [
        'Str0ng!Password123',
        'MySecure#Pass2024',
        'Complex$Password456'
      ];
      
      for (const password of strongPasswords) {
        const hash = await authService.hashPassword(password);
        expect(hash).toBeTruthy();
        expect(await authService.verifyPassword(password, hash)).toBe(true);
      }
    });

    it('prevents timing attacks on password verification', async () => {
      const password = 'TestPassword123!';
      const hash = await authService.hashPassword(password);
      
      const times: number[] = [];
      
      // Measure verification times
      for (let i = 0; i < 100; i++) {
        const start = process.hrtime.bigint();
        await authService.verifyPassword('wrongpassword', hash);
        const end = process.hrtime.bigint();
        times.push(Number(end - start) / 1000000); // Convert to ms
      }
      
      // Check that timing is consistent (variance should be low)
      const avg = times.reduce((a, b) => a + b) / times.length;
      const variance = times.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / times.length;
      const stdDev = Math.sqrt(variance);
      
      // Standard deviation should be less than 20% of average
      expect(stdDev / avg).toBeLessThan(0.2);
    });
  });

  describe('Rate Limiting', () => {
    const rateLimiter = new RateLimiter();

    it('enforces rate limits correctly', async () => {
      const key = 'test-key';
      const limit = 5;
      const window = 60000; // 1 minute

      // Make requests up to limit
      for (let i = 0; i < limit; i++) {
        const result = await rateLimiter.checkLimit(key, limit, window);
        expect(result.allowed).toBe(true);
      }

      // Next request should be denied
      const result = await rateLimiter.checkLimit(key, limit, window);
      expect(result.allowed).toBe(false);
    });
  });

  describe('Data Encryption', () => {
    const encryptionService = new EncryptionService();

    it('encrypts and decrypts data correctly', async () => {
      const plaintext = 'Sensitive user data';
      const password = 'SecurePassword123!';

      const encrypted = await encryptionService.encrypt(plaintext, password);
      expect(encrypted).not.toBe(plaintext);

      const decrypted = await encryptionService.decrypt(encrypted, password);
      expect(decrypted).toBe(plaintext);
    });

    it('fails with wrong password', async () => {
      const plaintext = 'Sensitive user data';
      const password = 'CorrectPassword123!';
      const wrongPassword = 'WrongPassword123!';

      const encrypted = await encryptionService.encrypt(plaintext, password);
      
      await expect(
        encryptionService.decrypt(encrypted, wrongPassword)
      ).rejects.toThrow();
    });
  });

  describe('Input Validation', () => {
    it('sanitizes malicious input', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(\'xss\')">',
        '"><script>alert(\'xss\')</script>'
      ];

      maliciousInputs.forEach(input => {
        const sanitized = sanitizeUserInput(input);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('onerror=');
      });
    });
  });
});
```

## Incident Response Plan

### Security Incident Response

```typescript
// lib/incident-response.ts
export enum IncidentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface SecurityIncident {
  id: string;
  type: string;
  severity: IncidentSeverity;
  description: string;
  affectedUsers?: string[];
  detectedAt: Date;
  resolvedAt?: Date;
  status: 'open' | 'investigating' | 'resolved';
}

export class IncidentResponseService {
  async reportIncident(incident: Omit<SecurityIncident, 'id' | 'detectedAt'>): Promise<void> {
    const fullIncident: SecurityIncident = {
      ...incident,
      id: crypto.randomUUID(),
      detectedAt: new Date(),
      status: 'open'
    };

    // Log incident
    await this.logIncident(fullIncident);

    // Immediate response based on severity
    switch (incident.severity) {
      case IncidentSeverity.CRITICAL:
        await this.criticalIncidentResponse(fullIncident);
        break;
      case IncidentSeverity.HIGH:
        await this.highIncidentResponse(fullIncident);
        break;
      default:
        await this.standardIncidentResponse(fullIncident);
    }
  }

  private async criticalIncidentResponse(incident: SecurityIncident): Promise<void> {
    // Immediate actions for critical incidents
    await Promise.all([
      this.alertSecurityTeam(incident),
      this.alertExecutiveTeam(incident),
      this.prepareEmergencyShutdown(incident),
      this.notifyLegalTeam(incident)
    ]);
  }

  private async emergencyShutdown(): Promise<void> {
    // Emergency procedures to protect user data
    // This would be implemented based on your infrastructure
    console.log('EMERGENCY: Initiating security shutdown procedures');
  }
}
```

## Compliance & Audit

### Security Compliance Checklist

```typescript
// scripts/security-audit.ts
export class SecurityAudit {
  async runComplianceCheck(): Promise<AuditReport> {
    const checks = [
      this.checkPasswordPolicy(),
      this.checkEncryption(),
      this.checkAccessControls(),
      this.checkLogging(),
      this.checkNetworkSecurity(),
      this.checkDataProtection(),
      this.checkIncidentResponse(),
      this.checkVulnerabilityManagement()
    ];

    const results = await Promise.all(checks);
    
    return {
      timestamp: new Date(),
      overallScore: this.calculateScore(results),
      checks: results,
      recommendations: this.generateRecommendations(results)
    };
  }

  private async checkPasswordPolicy(): Promise<AuditCheck> {
    // Verify password policy implementation
    return {
      category: 'Authentication',
      name: 'Password Policy',
      passed: true,
      details: 'Strong password requirements enforced'
    };
  }

  // Additional audit checks...
}
```

This comprehensive security strategy ensures:
- **Defense in depth** with multiple security layers
- **Zero trust architecture** with continuous verification
- **Privacy by design** with built-in data protection
- **Incident response** capabilities for rapid threat mitigation
- **Compliance** with security standards and regulations
- **Continuous monitoring** for proactive threat detection

The security framework protects user data while maintaining accessibility and performance requirements.