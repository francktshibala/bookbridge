import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  
  try {
    // Read and execute migration 002 (the RLS fix) directly
    const migrationPath = path.join(migrationsDir, '002_fix_rls_policies.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running RLS policy fixes...');
    console.log('SQL to execute:', sql);
    
    // Split SQL by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      
      try {
        const { error } = await supabase.rpc('exec', { sql: statement });
        if (error) {
          console.error('Error:', error);
          // Try alternative approach
          const { error: error2 } = await supabase.from('_migrations').insert({ sql: statement });
          if (error2) {
            console.log('Direct execution failed, this might be expected for some statements');
          }
        } else {
          console.log('✅ Statement executed successfully');
        }
      } catch (err) {
        console.log('Statement execution failed (might be expected):', err);
      }
    }
    
    console.log('Migration attempt completed');
  } catch (error) {
    console.error('Error:', error);
  }
}

runMigrations();