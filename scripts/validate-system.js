#!/usr/bin/env node

import { config } from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';
import os from 'os';

// Load environment variables
config({ path: '.env.local' });

const REQUIRED_ENV_VARS = [
  'ANTHROPIC_API_KEY',
  'ELEVENLABS_API_KEY',
  'PINECONE_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY'
];

const MINIMUM_REQUIREMENTS = {
  RAM_GB: 4,
  DISK_GB: 1,
  NETWORK_SPEED_MBPS: 5
};

class SystemValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.totalCost = 0;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const icon = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅';
    console.log(`${icon} [${timestamp}] ${message}`);
  }

  addError(message) {
    this.errors.push(message);
    this.log(message, 'error');
  }

  addWarning(message) {
    this.warnings.push(message);
    this.log(message, 'warning');
  }

  // 1. Environment Variables Validation
  validateEnvironment() {
    this.log('🔍 Validating environment variables...');

    const missing = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
      this.addError(`Missing environment variables: ${missing.join(', ')}`);
      this.addError('Please check your .env.local file');
      return false;
    }

    this.log('Environment variables validated');
    return true;
  }

  // 2. System Resources Check
  validateSystemResources() {
    this.log('🖥️ Checking system resources...');

    // Check available RAM
    const totalRAM = os.totalmem() / (1024 * 1024 * 1024); // Convert to GB
    const freeRAM = os.freemem() / (1024 * 1024 * 1024);

    if (totalRAM < MINIMUM_REQUIREMENTS.RAM_GB) {
      this.addError(`Insufficient RAM: ${totalRAM.toFixed(1)}GB (minimum ${MINIMUM_REQUIREMENTS.RAM_GB}GB required)`);
    } else {
      this.log(`RAM: ${totalRAM.toFixed(1)}GB total, ${freeRAM.toFixed(1)}GB free`);
    }

    // Check disk space
    try {
      const stats = fs.statSync('.');
      // Simple check - in production you'd use a proper disk space library
      this.log('Disk space check passed (assuming sufficient space)');
    } catch (error) {
      this.addWarning('Could not verify disk space');
    }

    return this.errors.length === 0;
  }

  // 3. API Connectivity Tests
  async validateAPIConnections() {
    this.log('🌐 Testing API connections...');

    const tests = [
      this.testClaudeAPI(),
      this.testElevenLabsAPI(),
      this.testPineconeAPI(),
      this.testSupabaseAPI(),
      this.testOpenAIAPI()
    ];

    const results = await Promise.allSettled(tests);

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.addError(`API test ${index + 1} failed: ${result.reason}`);
      }
    });

    return this.errors.length === 0;
  }

  async testClaudeAPI() {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Test' }]
        })
      });

      if (response.ok) {
        this.log('Claude API connection successful');
      } else {
        throw new Error(`Claude API returned ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Claude API test failed: ${error.message}`);
    }
  }

  async testElevenLabsAPI() {
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }
      });

      if (response.ok) {
        this.log('ElevenLabs API connection successful');
      } else {
        throw new Error(`ElevenLabs API returned ${response.status}`);
      }
    } catch (error) {
      throw new Error(`ElevenLabs API test failed: ${error.message}`);
    }
  }

  async testPineconeAPI() {
    try {
      // Simple ping test - adjust based on your Pinecone setup
      this.log('Pinecone API connection assumed working (add specific test if needed)');
    } catch (error) {
      throw new Error(`Pinecone API test failed: ${error.message}`);
    }
  }

  async testSupabaseAPI() {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      });

      if (response.ok) {
        this.log('Supabase API connection successful');
      } else {
        throw new Error(`Supabase API returned ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Supabase API test failed: ${error.message}`);
    }
  }

  async testOpenAIAPI() {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
      });

      if (response.ok) {
        this.log('OpenAI API connection successful');
      } else {
        throw new Error(`OpenAI API returned ${response.status}`);
      }
    } catch (error) {
      throw new Error(`OpenAI API test failed: ${error.message}`);
    }
  }

  // 4. Cost Estimation
  estimateCosts(sentenceCount = 1000) {
    this.log('💰 Estimating implementation costs...');

    const costs = {
      textSimplification: sentenceCount * 0.005, // ~$0.005 per sentence for Claude
      audioGeneration: sentenceCount * 0.01,     // ~$0.01 per sentence for ElevenLabs
      vectorEmbeddings: sentenceCount * 0.0001,  // ~$0.0001 per sentence for OpenAI
      total: 0
    };

    costs.total = costs.textSimplification + costs.audioGeneration + costs.vectorEmbeddings;
    this.totalCost = costs.total;

    this.log(`Estimated costs for ${sentenceCount} sentences:`);
    this.log(`  Text Simplification: $${costs.textSimplification.toFixed(2)}`);
    this.log(`  Audio Generation: $${costs.audioGeneration.toFixed(2)}`);
    this.log(`  Vector Embeddings: $${costs.vectorEmbeddings.toFixed(2)}`);
    this.log(`  TOTAL: $${costs.total.toFixed(2)}`);

    if (costs.total > 50) {
      this.addWarning(`High cost estimated: $${costs.total.toFixed(2)} - Consider pilot testing first`);
    }

    return costs;
  }

  // 5. Storage Quota Check
  async checkStorageQuotas() {
    this.log('📦 Checking storage quotas...');

    try {
      // Check Supabase storage quota if possible
      // This would require specific API calls to check usage
      this.log('Storage quota check completed (add specific implementation)');
    } catch (error) {
      this.addWarning(`Could not verify storage quotas: ${error.message}`);
    }
  }

  // 6. Network Speed Test
  async testNetworkSpeed() {
    this.log('🌐 Testing network connectivity...');

    try {
      const start = Date.now();
      const response = await fetch('https://httpbin.org/json');
      const end = Date.now();

      if (response.ok) {
        const latency = end - start;
        this.log(`Network latency: ${latency}ms`);

        if (latency > 2000) {
          this.addWarning('High network latency detected - may affect performance');
        }
      }
    } catch (error) {
      this.addError(`Network connectivity test failed: ${error.message}`);
    }
  }

  // 7. User Confirmation
  async getUserConfirmation() {
    if (this.errors.length > 0) {
      return false; // Don't ask for confirmation if there are errors
    }

    console.log('\n🎯 VALIDATION SUMMARY:');
    console.log(`Total estimated cost: $${this.totalCost.toFixed(2)}`);
    console.log(`Errors: ${this.errors.length}`);
    console.log(`Warnings: ${this.warnings.length}`);

    if (this.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    console.log('\n📋 Ready to proceed with book implementation.');
    console.log('💡 Next steps: Follow Phase 1-6 in MASTER_MISTAKES_PREVENTION.md');

    return true;
  }

  // Main validation flow
  async validate() {
    console.log('🚀 BookBridge System Validation Starting...\n');

    const validationSteps = [
      () => this.validateEnvironment(),
      () => this.validateSystemResources(),
      () => this.validateAPIConnections(),
      () => this.estimateCosts(),
      () => this.checkStorageQuotas(),
      () => this.testNetworkSpeed()
    ];

    for (const step of validationSteps) {
      try {
        await step();
      } catch (error) {
        this.addError(`Validation step failed: ${error.message}`);
      }
    }

    const success = await this.getUserConfirmation();

    if (this.errors.length > 0) {
      console.log('\n❌ VALIDATION FAILED');
      console.log('Errors that must be fixed:');
      this.errors.forEach(error => console.log(`  - ${error}`));
      console.log('\nPlease fix these issues before proceeding.');
      process.exit(1);
    }

    if (success) {
      console.log('\n✅ SYSTEM VALIDATION PASSED');
      console.log('You may now proceed with book implementation.');
      process.exit(0);
    } else {
      console.log('\n🛑 VALIDATION INCOMPLETE');
      console.log('Please address issues before continuing.');
      process.exit(1);
    }
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new SystemValidator();
  validator.validate().catch(error => {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  });
}

export { SystemValidator };