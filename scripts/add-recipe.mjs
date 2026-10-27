import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { prepareRecipe, addRecipe, findImported } from './lib/recipe-import.mjs'

function options(args) {
  const result = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--help' || arg === '-h') result.help = true
    else if (arg === '--dry-run') result.dryRun = true
    else if (arg === '--cover' && args[i + 1] && !args[i + 1].startsWith('--')) result.cover = args[++i]
    else if (!arg.startsWith('-') && !result.file) result.file = arg
    else throw new Error(`不支持参数 ${arg}`)
  }
  return result
}
async function jpegCover(path) {
  const source = await readFile(path)
  if (source.length > 30 * 1024 * 1024) throw new Error('原图超过 30MB，请换一张较小的成品图')
  const mime = source[0] === 0xff && source[1] === 0xd8 && source[2] === 0xff ? 'image/jpeg'
    : source.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'image/png'
      : source.subarray(0, 4).toString() === 'RIFF' && source.subarray(8, 12).toString() === 'WEBP' ? 'image/webp' : null
  if (!mime) throw new Error('封面只支持 JPG、PNG 或 WebP，请提供原始成品图文件')
  const { chromium } = await import('@playwright/test')
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: ['--no-sandbox'],
  })
  try {
    const page = await browser.newPage()
    // Images are decoded locally. This page has no access to credentials or network.
    await page.route('**/*', (route) => route.abort())
    await page.setContent('<!doctype html><title>Local cover compression</title>')
    await page.addScriptTag({ path: createRequire(import.meta.url).resolve('browser-image-compression') })
    const bytes = await page.evaluate(async ({ source, mime }) => {
      const file = new File([new Uint8Array(source)], 'cover', { type: mime })
      const blob = await window.imageCompression(file, { maxSizeMB: 0.95, maxWidthOrHeight: 1600, useWebWorker: false, fileType: 'image/jpeg' })
      return Array.from(new Uint8Array(await blob.arrayBuffer()))
    }, { source: [...source], mime })
    if (bytes.length > 1048576) throw new Error('压缩后的图片仍超过 1MB')
    return new Uint8Array(bytes)
  } finally { await browser.close() }
}
export async function main(args = process.argv.slice(2)) {
  const opts = options(args)
  if (opts.help || !opts.file) {
    console.log('用法：npm run recipe:add -- recipe.json [--cover cover.jpg] [--dry-run]\n凭据：COOKERY_ACCOUNT + COOKERY_PASSWORD，仅使用普通成员账号。--dry-run 不连接线上。')
    return
  }
  const input = JSON.parse(await readFile(opts.file, 'utf8'))
  const payload = prepareRecipe(input)
  if (!opts.dryRun && input.importKey.startsWith('example-only:')) throw new Error('格式示例只允许 --dry-run；请替换成用户实际提供的菜谱与稳定 importKey')
  // Validate and compress before login, so invalid inputs never upload or create a session.
  const cover = opts.cover ? await jpegCover(opts.cover) : undefined
  if (opts.dryRun) {
    console.log(JSON.stringify({ status: 'validated_only', payload, coverBytes: cover?.length ?? 0 }, null, 2))
    return
  }
  const account = process.env.COOKERY_ACCOUNT?.trim().toLowerCase()
  const password = process.env.COOKERY_PASSWORD
  if (!account || !password) throw new Error('需要普通账号的 COOKERY_ACCOUNT 和 COOKERY_PASSWORD；也可以使用已登录网页添加。不要改用管理员密钥。')
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_gvB75uZDSwHb0JRf-BQJbg_s9D5FhyG'
  if (!key.startsWith('sb_publishable_')) throw new Error('只接受 publishable key，不接受管理员密钥')
  const client = createClient(process.env.VITE_SUPABASE_URL || 'https://jjgrnefvpqhthsobpkml.supabase.co', key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
  const { data, error } = await client.auth.signInWithPassword({ email: account.includes('@') ? account : `${account}@cook.com`, password })
  if (error) throw new Error(`登录失败：${error.message}`)
  try {
    const { data: member, error } = await client.from('members').select('user_id').eq('user_id', data.user.id).maybeSingle()
    if (error) throw error
    if (!member) throw new Error('这个账号不是厨房成员，不能添加菜谱')
    // A duplicate recipe never causes an image upload or content overwrite.
    const existing = await findImported(client, payload.legacyId)
    const result = existing ? { status: 'already_exists', id: existing.id, title: existing.title, url: `https://zijian2625492669-lgtm.github.io/cookerY/#/r/${existing.id}` } : await addRecipe(client, payload, cover)
    console.log(JSON.stringify(result, null, 2))
  } finally { await client.auth.signOut({ scope: 'local' }) }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1 })
}
