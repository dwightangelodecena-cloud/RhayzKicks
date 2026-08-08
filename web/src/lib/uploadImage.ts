import { supabase } from '../supabase'

const BUCKET = 'product-images'

const extensionForType: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export async function uploadProductImage(file: Blob | File): Promise<string> {
  const nameHint = 'name' in file ? (file as File).name : ''
  const ext = nameHint.split('.').pop()?.toLowerCase() || extensionForType[file.type] || 'jpg'
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw error
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}
