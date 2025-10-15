import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkStorageUsage() {
  console.log('📊 Checking Supabase Storage Usage...\n');

  try {
    // List all files in audio bucket
    const { data: files, error } = await supabase.storage
      .from('audio')
      .list('', {
        limit: 1000,
        offset: 0
      });

    if (error) {
      console.error('❌ Error listing files:', error);
      return;
    }

    console.log(`📁 Total files in audio bucket: ${files.length}`);

    // Calculate total size
    let totalSize = 0;
    let bookBreakdown = {};

    // List files recursively for each book
    for (const item of files) {
      if (item.name && !item.id) { // It's a folder
        const { data: bookFiles, error: bookError } = await supabase.storage
          .from('audio')
          .list(item.name, {
            limit: 1000,
            offset: 0
          });

        if (!bookError && bookFiles) {
          let bookSize = 0;
          for (const file of bookFiles) {
            if (file.metadata && file.metadata.size) {
              bookSize += file.metadata.size;
            }
          }
          bookBreakdown[item.name] = {
            files: bookFiles.length,
            size: bookSize,
            sizeMB: (bookSize / (1024 * 1024)).toFixed(2)
          };
          totalSize += bookSize;
        }
      } else if (item.metadata && item.metadata.size) {
        totalSize += item.metadata.size;
      }
    }

    console.log('\n📋 Storage Breakdown by Book:');
    for (const [bookId, stats] of Object.entries(bookBreakdown)) {
      console.log(`  ${bookId}: ${stats.files} files, ${stats.sizeMB} MB`);
    }

    const totalMB = (totalSize / (1024 * 1024)).toFixed(2);
    const totalGB = (totalSize / (1024 * 1024 * 1024)).toFixed(3);

    console.log(`\n💾 Total Storage Used: ${totalMB} MB (${totalGB} GB)`);

    // Supabase Pro Plan Limits ($25/month)
    console.log('\n📈 Supabase Plan Limits:');
    console.log('  Free Plan: 1 GB storage, 2 GB bandwidth/month');
    console.log('  Pro Plan ($25/month): 8 GB storage, 250 GB bandwidth/month');
    console.log('  Team Plan ($599/month): 100 GB storage, 500 GB bandwidth/month');

    // Calculate usage percentage for different plans
    const freeStorageLimit = 1 * 1024 * 1024 * 1024; // 1 GB
    const proStorageLimit = 8 * 1024 * 1024 * 1024; // 8 GB

    const freeUsagePercent = ((totalSize / freeStorageLimit) * 100).toFixed(1);
    const proUsagePercent = ((totalSize / proStorageLimit) * 100).toFixed(1);

    console.log(`\n🎯 Usage Analysis:`);
    console.log(`  Free Plan: ${freeUsagePercent}% used (${totalGB}/1 GB)`);
    console.log(`  Pro Plan: ${proUsagePercent}% used (${totalGB}/8 GB)`);

    if (totalSize > freeStorageLimit) {
      console.log('  ⚠️  EXCEEDS FREE PLAN STORAGE LIMIT');
    }

    if (totalSize > proStorageLimit * 0.8) {
      console.log('  ⚠️  APPROACHING PRO PLAN STORAGE LIMIT');
    }

    // Estimate Jane Eyre impact
    console.log(`\n🔮 Jane Eyre A1 Impact Estimate:`);
    console.log(`  2,587 bundles × ~108KB each = ~279 MB`);
    console.log(`  After Jane Eyre: ~${(parseFloat(totalMB) + 279).toFixed(2)} MB total`);

    // Check current plan (if we can determine it)
    console.log(`\n💡 Recommendations:`);
    if (totalSize > freeStorageLimit) {
      console.log('  - You likely need Pro Plan ($25/month) minimum');
      console.log('  - Current usage exceeds free tier limits');
    } else {
      console.log('  - Free plan should be sufficient for current usage');
      console.log('  - Monitor usage as you add more books');
    }

  } catch (error) {
    console.error('❌ Error checking storage:', error);
  }
}

checkStorageUsage();