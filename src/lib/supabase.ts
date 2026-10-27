import { createClient } from '@supabase/supabase-js'

// Browser-safe publishable key. All data access is protected by member RLS.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://jjgrnefvpqhthsobpkml.supabase.co',
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_gvB75uZDSwHb0JRf-BQJbg_s9D5FhyG',
)
export const usernameEmail = (name: string) => {
  const account = name.trim().toLowerCase()
  return account.includes('@') ? account : `${account}@cook.com`
}
export const validUsername = (name: string) => {
  const account = name.trim().toLowerCase()
  return /^[a-z0-9_]{3,24}$/.test(account) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account)
}
export function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String((error as { message?: string })?.message || error)
  if (/Invalid login credentials/i.test(message)) return '账号或密码不对，再试一次'
  if (/fetch|network|offline/i.test(message)) return '暂时连不上厨房，检查网络后再试'
  if (/rate limit|too many/i.test(message)) return '试得有点快，稍等片刻再试'
  return message || '暂时没能完成，请再试一次'
}
