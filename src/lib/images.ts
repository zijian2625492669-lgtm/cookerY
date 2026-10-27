import imageCompression from 'browser-image-compression'
import { supabase } from './supabase'
export async function uploadCover(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('请选择 JPG、PNG 或 WebP 图片')
  const compressed = await imageCompression(file, { maxSizeMB: 0.95, maxWidthOrHeight: 1600, useWebWorker: false, fileType: 'image/jpeg' })
  if (compressed.size > 1048576) throw new Error('图片压缩后仍超过 1MB，换一张试试')
  const path = `covers/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from('recipe-images').upload(path, compressed, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  return path
}
export async function removeImages(paths: string[]) {
  if (!paths.length) return
  const { error } = await supabase.storage.from('recipe-images').remove(paths)
  if (error) throw error
}
export async function coverUrl(path: string) {
  const { data, error } = await supabase.storage.from('recipe-images').createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
}
