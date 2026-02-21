import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY! // service role key for server-side uploads

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn('⚠️  SUPABASE_URL or SUPABASE_SERVICE_KEY not set — image uploads disabled')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const BUCKET = 'clawclick'

/**
 * Upload an image buffer to Supabase Storage.
 * Returns the public URL.
 */
export async function uploadImage(
  tokenAddress: string,
  type: 'logo' | 'banner',
  fileBuffer: Buffer,
  contentType: string
): Promise<string> {
  const ext = contentType.split('/')[1] || 'png'
  const filePath = `${type}/${tokenAddress.toLowerCase()}.${ext}`

  // Upsert — overwrite if already exists
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, fileBuffer, {
      contentType,
      upsert: true,
    })

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`)
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath)
  return data.publicUrl
}
