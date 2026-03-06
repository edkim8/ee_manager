/**
 * EE_manager: Storage Orphan Scanner (Hygiene Tool)
 * 
 * This script identifies files in Supabase Storage that no longer have 
 * corresponding records in the database.
 * 
 * Usage: 
 *   npx tsx scripts/storage_orphan_scanner.ts [--dry-run=false]
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { join } from 'path'

// Load environment variables from .env
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase environment variables (SUPABASE_URL, SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

const BUCKETS = ['images', 'documents']
const DRY_RUN = process.argv.includes('--dry-run=false') ? false : true

async function scanBucket(bucket: string) {
  console.log(`\n🔍 Scanning bucket: [${bucket}] ...`)
  
  // 1. Get all files from storage (recursive list)
  // Note: Supabase list() is not naturally recursive for all files, 
  // we need to handle folder traversal or use a flat path if known.
  // For EE_manager, we usually have /folder/filename.ext
  
  // Step A: Get top-level folders
  const { data: folders, error: folderError } = await supabase.storage.from(bucket).list()
  if (folderError) throw folderError

  const allFiles: { name: string, path: string }[] = []

  for (const item of folders || []) {
    if (item.id === null) { // It's a folder (Supabase returns id: null for prefixes)
      const folderName = item.name
      const { data: files, error: fileError } = await supabase.storage.from(bucket).list(folderName)
      if (fileError) {
        console.warn(`⚠️  Failed to list folder: ${folderName}`)
        continue
      }
      files?.forEach(f => {
        if (f.id === null) {
          // Sub-folder detected — structural violation of the 2-level depth rule.
          // Protocol: max depth is {bucket}/{folder}/{file}. This path is not scanned.
          console.warn(`⚠️  STRUCTURAL VIOLATION: sub-folder [${bucket}]/${folderName}/${f.name}/ exceeds max depth. Flatten this path. Contents not scanned.`)
        } else {
          allFiles.push({ name: f.name, path: `${folderName}/${f.name}` })
        }
      })
    } else {
      // It's a file at the root
      allFiles.push({ name: item.name, path: item.name })
    }
  }

  console.log(`📊 Found ${allFiles.length} files in storage.`)

  // 2. Cross-reference with DB tables
  // We need to check 'file_url' in: 
  // - attachments (record_type = locations, units, etc.)
  // - locations (source_image_url)
  // - profiles (avatar_url) - potential future use
  
  const orphans: string[] = []
  let scannedCount = 0

  for (const file of allFiles) {
    const publicUrl = supabase.storage.from(bucket).getPublicUrl(file.path).data.publicUrl
    
    // Check attachments table
    const { count: attCount } = await supabase
      .from('attachments')
      .select('*', { count: 'exact', head: true })
      .eq('file_url', publicUrl)

    // Check locations table (primary image)
    const { count: locCount } = await supabase
      .from('locations')
      .select('*', { count: 'exact', head: true })
      .eq('source_image_url', publicUrl)

    // Check location_note_attachments table (legacy or specialized)
    const { count: noteAttCount } = await supabase
        .from('location_note_attachments')
        .select('*', { count: 'exact', head: true })
        .eq('file_url', publicUrl)

    const isReferenced = (attCount || 0) > 0 || (locCount || 0) > 0 || (noteAttCount || 0) > 0

    if (!isReferenced) {
      orphans.push(file.path)
    }

    scannedCount++
    if (scannedCount % 50 === 0) process.stdout.write('.')
  }

  console.log(`\n✅ Scan complete.`)

  if (orphans.length === 0) {
    console.log(`✨ Zero orphans found in [${bucket}]. Storage is perfectly clean.`)
    return
  }

  console.log(`🔴 Found ${orphans.length} ORPHANED files in [${bucket}]:`)
  orphans.forEach(p => console.log(`  - ${p}`))

  if (DRY_RUN) {
    console.log(`\n⚠️  DRY RUN: No files were deleted. Run with '--dry-run=false' to purge.`)
  } else {
    console.log(`\n🗑️  PURGING ${orphans.length} orphans...`)
    const { error: deleteError } = await supabase.storage.from(bucket).remove(orphans)
    if (deleteError) {
      console.error(`❌ Failed to purge orphans:`, deleteError)
    } else {
      console.log(`✅ Successfully purged storage.`)
    }
  }
}

async function main() {
  console.log('==============================================')
  console.log('🛡️  EE_MANAGER STORAGE ORPHAN SCANNER')
  console.log('==============================================')
  if (DRY_RUN) console.log('Mode: DRY RUN (Analysis only)')
  else console.log('Mode: PURGE (Destructive cleanup)')

  try {
    for (const bucket of BUCKETS) {
      await scanBucket(bucket)
    }
  } catch (err) {
    console.error('💥 Fatal scanning error:', err)
  }

  console.log('\n🏁 Maintenance complete.')
}

main()
