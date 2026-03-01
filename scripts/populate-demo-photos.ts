import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const targetUnits = [
  { property_code: 'SB', unit_name: '1142', layout: '1x1' },
  { property_code: 'SB', unit_name: '1160', layout: '2x2' },
  { property_code: 'RS', unit_name: '1004', layout: '1x1' },
  { property_code: 'RS', unit_name: '1011', layout: '2x2' },
];

async function main() {
  for (const target of targetUnits) {
    console.log(`Processing ${target.property_code} - ${target.unit_name} (${target.layout})`);

    // 1. Resolve unit_id
    const { data: unitData, error: unitError } = await supabase
      .from('units')
      .select('id')
      .eq('property_code', target.property_code)
      .eq('unit_name', target.unit_name)
      .single();

    if (unitError || !unitData) {
      console.error(`Failed to find unit ${target.property_code} ${target.unit_name}:`, unitError.message);
      continue;
    }

    const unitId = unitData.id;
    console.log(`Found unit_id: ${unitId}`);

    // 2. Upload photos
    const photoDir1x1 = path.join(process.cwd(), 'demo-photos', '1x1');
    const photoDir2x2 = path.join(process.cwd(), 'demo-photos', '2x2');
    
    const photos1x1 = fs.existsSync(photoDir1x1) ? fs.readdirSync(photoDir1x1).filter(f => f.endsWith('.png') || f.endsWith('.jpg')) : [];
    const photos2x2 = fs.existsSync(photoDir2x2) ? fs.readdirSync(photoDir2x2).filter(f => f.endsWith('.png') || f.endsWith('.jpg')) : [];
    
    // We will use all 17 available photos for all 4 units
    const allPhotos = [
      ...photos1x1.map(p => ({ file: p, dir: photoDir1x1 })),
      ...photos2x2.map(p => ({ file: p, dir: photoDir2x2 }))
    ];

    for (const photo of allPhotos) {
      const filePath = path.join(photo.dir, photo.file);
      const fileBuffer = fs.readFileSync(filePath);
      const stats = fs.statSync(filePath);
      
      const ext = path.extname(photo.file);
      const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
      const filename = `${Math.random().toString(36).substring(2)}-${Date.now()}${ext}`;
      const storagePath = `unit/${filename}`;

      console.log(`Uploading ${photo.file} as ${storagePath}`);
      
      const { data: storageData, error: storageError } = await supabase.storage
        .from('images')
        .upload(storagePath, fileBuffer, {
          contentType: mimeType,
          upsert: true
        });
        
      if (storageError) {
        console.error(`Failed to upload ${photo.file}:`, storageError.message);
        continue;
      }

      const { data: publicUrlData } = supabase.storage
        .from('images')
        .getPublicUrl(storagePath);
        
      const publicUrl = publicUrlData.publicUrl;

      // 3. Insert into attachments
      const { error: dbError } = await supabase
        .from('attachments')
        .insert({
          record_id: unitId,
          record_type: 'unit',
          file_url: publicUrl,
          file_type: 'image',
          file_name: photo.file,
          file_size: stats.size,
          mime_type: mimeType
        });
        
      if (dbError) {
        console.error(`Failed to insert attachment record for ${photo.file}:`, dbError.message);
      } else {
        console.log(`Successfully attached ${photo.file} to ${target.property_code} ${target.unit_name}`);
      }
    }
  }
  
  console.log("Finished uploading all photos.");
}

main().catch(console.error);
