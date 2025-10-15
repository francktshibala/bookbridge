/**
 * Supabase Upload Client with Exponential Backoff and Rate Limiting
 * Based on 3-agent research findings for handling Supabase storage rate limits
 *
 * Key Features:
 * - Exponential backoff with jitter for retries
 * - Rate limiting with 250-500ms delays between uploads
 * - HTML error page detection (<!DOCTYPE responses)
 * - Automatic upsert for idempotency
 * - Detailed error logging for debugging
 */

export class SupabaseUploadClient {
  constructor(supabase, options = {}) {
    this.supabase = supabase;
    this.maxRetries = options.maxRetries || 5;
    this.baseDelay = options.baseDelay || 250; // 250ms base delay
    this.maxDelay = options.maxDelay || 15000; // 15 second max delay
    this.rateLimitDelay = options.rateLimitDelay || 250; // Base delay between uploads
    this.jitterRange = options.jitterRange || 250; // ±250ms jitter
  }

  /**
   * Upload a file with retry logic and rate limiting
   * @param {string} path - Storage path (e.g., 'jane-eyre-scale-test-001/A1/bundle_0.mp3')
   * @param {Buffer} buffer - File buffer
   * @param {Object} options - Upload options
   * @returns {Promise} Upload result
   */
  async uploadWithRetry(path, buffer, options = {}) {
    // Add rate limiting delay before upload attempt
    await this.sleep(this.rateLimitDelay + Math.random() * this.jitterRange);

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`📤 Upload attempt ${attempt + 1}/${this.maxRetries + 1}: ${path}`);

        const result = await this.supabase.storage
          .from('audio-files')
          .upload(path, buffer, {
            upsert: true, // Allow overwrites for idempotency
            ...options
          });

        if (result.error) {
          throw new Error(`Upload failed: ${result.error.message}`);
        }

        console.log(`✅ Upload successful: ${path}`);
        return result;

      } catch (error) {
        const isLastAttempt = attempt === this.maxRetries;
        const isRetryableError = this.isRetryableError(error);

        // Log detailed error information
        this.logError(error, attempt + 1, path);

        if (!isRetryableError || isLastAttempt) {
          console.error(`❌ Upload failed permanently: ${path}`);
          throw error;
        }

        // Calculate delay with exponential backoff + jitter
        const delay = Math.min(
          this.baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
          this.maxDelay
        );

        console.log(`⏳ Retrying in ${delay.toFixed(0)}ms... (attempt ${attempt + 1}/${this.maxRetries + 1})`);
        await this.sleep(delay);
      }
    }
  }

  /**
   * Determine if an error is retryable based on research findings
   * @param {Error} error - The error to check
   * @returns {boolean} Whether the error should be retried
   */
  isRetryableError(error) {
    const message = error.message.toLowerCase();

    // HTML responses indicate API gateway/rate limiting issues (retryable)
    if (message.includes('<!doctype') || message.includes('<html')) {
      return true;
    }

    // Explicit rate limiting messages
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return true;
    }

    // Storage-specific errors that are often temporary
    if (message.includes('storageunknownerror')) {
      return true;
    }

    // Network-related errors
    if (message.includes('network') ||
        message.includes('timeout') ||
        message.includes('econnreset') ||
        message.includes('etimedout')) {
      return true;
    }

    // Server errors (5xx)
    if (message.includes('internal server error') ||
        message.includes('service unavailable') ||
        message.includes('bad gateway')) {
      return true;
    }

    // Non-retryable errors (authentication, authorization, etc.)
    return false;
  }

  /**
   * Log detailed error information for debugging
   * @param {Error} error - The error to log
   * @param {number} attempt - Current attempt number
   * @param {string} path - File path being uploaded
   */
  logError(error, attempt, path) {
    console.error(`🚫 Upload error (attempt ${attempt}): ${path}`);
    console.error(`   Error: ${error.message}`);

    if (error.message.includes('<!doctype') || error.message.includes('<html')) {
      console.error(`   🔍 HTML response detected - likely API gateway rate limiting`);
    }

    // Log first part of error message if it's very long
    if (error.message.length > 200) {
      console.error(`   📝 Error preview: ${error.message.substring(0, 200)}...`);
    }
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test upload functionality with a small file
   * @returns {Promise} Test result
   */
  async testUpload() {
    const testPath = 'test/upload-test.txt';
    const testBuffer = Buffer.from('Test upload from SupabaseUploadClient');

    try {
      console.log('🧪 Testing upload functionality...');
      const result = await this.uploadWithRetry(testPath, testBuffer);
      console.log('✅ Upload test successful');
      return result;
    } catch (error) {
      console.error('❌ Upload test failed:', error.message);
      throw error;
    }
  }
}

export default SupabaseUploadClient;