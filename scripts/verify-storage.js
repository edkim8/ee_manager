#!/usr/bin/env node

/**
 * Verify Supabase Storage Bucket Setup
 * Run: node scripts/verify-storage.js
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file')
  console.error('Need: SUPABASE_URL and SUPABASE_KEY (or SUPABASE_ANON_KEY)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 Verifying Supabase Storage Setup...\n')
console.log('Supabase URL:', supabaseUrl)
console.log('')

async function verifyStorage() {
  try {
    // 1. List all buckets
    console.log('📦 Checking storage buckets...')
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError.message)
      return false
    }

    console.log(`Found ${buckets.length} bucket(s):`)
    buckets.forEach(bucket => {
      console.log(`  - ${bucket.name} (${bucket.public ? 'public' : 'private'})`)
    })
    console.log('')

    // 2. Check if 'images' bucket exists
    const imagesBucket = buckets.find(b => b.name === 'images')
    if (!imagesBucket) {
      console.error('❌ "images" bucket NOT FOUND!')
      console.log('\n📝 To create the bucket, run:')
      console.log('   npm run supabase:migrate')
      console.log('   or')
      console.log('   supabase db push\n')
      return false
    }

    console.log('✅ "images" bucket exists')
    console.log(`   Public: ${imagesBucket.public}`)
    console.log(`   File size limit: ${imagesBucket.file_size_limit ? (imagesBucket.file_size_limit / 1024 / 1024).toFixed(1) + 'MB' : 'Not set'}`)
    console.log('')

    // 3. Try to list files in 'images' bucket
    console.log('📁 Checking "images" bucket access...')
    const { data: files, error: filesError } = await supabase.storage
      .from('images')
      .list('locations', { limit: 1 })

    if (filesError) {
      console.error('❌ Error accessing bucket:', filesError.message)
      console.log('\n💡 This might be a permissions issue.')
      console.log('   Check RLS policies on storage.objects table\n')
      return false
    }

    console.log('✅ Can access "images" bucket')
    console.log(`   Files in locations/: ${files.length}`)
    console.log('')

    // 4. Test upload (requires authentication)
    console.log('🔐 Testing authentication...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log('⚠️  Not authenticated (this is normal for script)')
      console.log('   Storage upload requires authenticated user')
      console.log('   Test upload from the app UI instead\n')
    } else {
      console.log('✅ Authenticated as:', user.email)
      console.log('')
    }

    console.log('─────────────────────────────────')
    console.log('✅ Storage setup verification complete!')
    console.log('─────────────────────────────────\n')

    return true

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return false
  }
}

verifyStorage().then(success => {
  process.exit(success ? 0 : 1)
})
