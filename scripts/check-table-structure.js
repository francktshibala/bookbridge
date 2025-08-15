const { createClient } = require('@supabase/supabase-js');

async function checkTableStructure() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Check table structure
    const { data: columns, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'books' AND table_schema = 'public'
        ORDER BY ordinal_position;
      `
    });

    if (error) {
      console.error('Error checking table structure:', error);
      return;
    }

    console.log('Books table structure:');
    console.table(columns);

    // Check if CUID extension is available
    const { data: extensions, error: extError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT extname FROM pg_extension WHERE extname LIKE '%cuid%';
      `
    });

    if (extError) {
      console.error('Error checking extensions:', extError);
    } else {
      console.log('CUID extensions:', extensions);
    }

    // Check available functions for ID generation
    const { data: functions, error: funcError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT proname FROM pg_proc WHERE proname LIKE '%cuid%' OR proname LIKE '%uuid%' OR proname LIKE '%id%';
      `
    });

    if (funcError) {
      console.error('Error checking functions:', funcError);
    } else {
      console.log('Available ID generation functions:', functions);
    }

  } catch (error) {
    console.error('Script error:', error);
  }
}

checkTableStructure();