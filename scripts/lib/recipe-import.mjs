import { createHash } from 'node:crypto'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const text = (value, label, max = 10000) => {
  if (typeof value !== 'string' || value.length > max) throw new Error(`${label} 必须是文本，且不超过 ${max} 字`)
  return value.trim()
}
const list = (value, label) => {
  if (!Array.isArray(value) || value.length > 200) throw new Error(`${label} 必须是数组，最多 200 项`)
  return value
}
export const digest = (value) => createHash('sha256').update(value).digest('hex')

export function prepareRecipe(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('菜谱必须是 JSON 对象')
  const allowed = new Set(['importKey', 'title', 'description', 'emoji', 'palette', 'minutes', 'servings', 'tags', 'ingredients', 'seasonings', 'sauce', 'sauceNote', 'prep', 'steps', 'sourceUrl', 'sourceAuthor'])
  for (const key of Object.keys(input)) if (!allowed.has(key)) throw new Error(`不支持字段 ${key}；这个工具只新增菜谱，不修改已有菜谱`)
  const key = text(input.importKey, 'importKey', 500)
  if (!key) throw new Error('importKey 不能为空；重试时必须保持相同')
  const hash = digest(key)
  const draftId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`
  const title = text(input.title, '菜名', 200)
  if (!title) throw new Error('菜名不能为空')
  for (const [field, min, max] of [['minutes', 0, 10080], ['servings', 1, 100]]) {
    if (!Number.isInteger(input[field]) || input[field] < min || input[field] > max) throw new Error(`${field} 必须是 ${min}–${max} 的整数，不要静默编造时长和份量`)
  }
  const ingredients = (items, label) => list(items ?? [], label).map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`${label} 的每项必须包含 name、amount、unit`)
    const name = text(item.name, `${label}名称`, 200)
    if (!name) throw new Error(`${label}名称不能为空`)
    return { name, amount: text(item.amount ?? '', '用量', 100), unit: text(item.unit ?? '', '单位', 100) }
  })
  const strings = (items, label) => list(items ?? [], label).map((item) => {
    const value = text(item, label)
    if (!value) throw new Error(`${label}不能包含空项`)
    return value
  })
  const tags = [...new Set(strings(input.tags, '标签'))]
  if (tags.some((tag) => tag.length > 30)) throw new Error('每个标签最多 30 字')
  let description = text(input.description ?? '', '简介', 5000)
  if (input.sourceUrl) {
    const source = new URL(text(input.sourceUrl, '来源链接', 2000))
    if (!['https:', 'http:'].includes(source.protocol) || source.username || source.password) throw new Error('来源链接必须是不含账号密码的 HTTP(S) 地址')
    const author = text(input.sourceAuthor ?? '', '来源作者', 100)
    description += `${description ? '\n\n' : ''}来源：${author ? author + ' ' : ''}${source.href}`
  } else if (input.sourceAuthor) {
    description += `${description ? '\n\n' : ''}来源作者：${text(input.sourceAuthor, '来源作者', 100)}`
  }
  const palette = input.palette ?? 0
  if (!Number.isInteger(palette) || palette < 0 || palette > 5) throw new Error('palette 必须是 0–5 的整数')
  const steps = strings(input.steps, '正式开做')
  if (!steps.length) throw new Error('至少提供一步正式开做')
  return {
    id: null, draftId, legacyId: `agent:${hash}`, title, description,
    emoji: text(input.emoji ?? '🍳', 'emoji', 32), palette, minutes: input.minutes, servings: input.servings,
    ingredients: ingredients(input.ingredients, '食材'), seasonings: ingredients(input.seasonings, '调料'),
    sauce: ingredients(input.sauce, '酱料'), sauceNote: text(input.sauceNote ?? '', '酱料说明'),
    prep: strings(input.prep, '备菜'), steps, tags,
  }
}

const recipeUrl = (id) => `https://zijian2625492669-lgtm.github.io/cookerY/#/r/${id}`
export async function findImported(client, legacyId) {
  const { data, error } = await client.from('recipes').select('id,title').eq('legacy_id', legacyId).maybeSingle()
  if (error) throw error
  return data
}
export async function addRecipe(client, payload, cover) {
  const existing = await findImported(client, payload.legacyId)
  if (existing) return { status: 'already_exists', id: existing.id, title: existing.title, url: recipeUrl(existing.id) }
  let coverPath
  if (cover) {
    if (!(cover instanceof Uint8Array) || cover.length > 1048576 || !cover.length) throw new Error('封面必须是 1MB 内的 JPEG 字节')
    coverPath = `covers/${payload.draftId}/${digest(cover)}.jpg`
    const { error } = await client.storage.from('recipe-images').upload(coverPath, cover, { contentType: 'image/jpeg', upsert: false })
    if (error && String(error.statusCode) !== '409' && !/already exists/i.test(error.message)) throw error
  }
  const { data: id, error } = await client.rpc('save_recipe', { payload: { ...payload, coverPath: coverPath ?? null } })
  if (error) throw new Error(`保存暂未确认：${error.message}。请保持同一个 importKey 重试；不要换标识反复新增。`)
  if (typeof id !== 'string' || !uuid.test(id)) throw new Error('保存没有返回有效菜谱 ID，请用同一个 importKey 重试')
  const { data: row, error: readError } = await client.from('recipes').select('*,ingredients(*),steps(*),recipe_tags(tags(name))').eq('id', id).single()
  if (readError || !row) throw new Error(`菜谱已返回 ID ${id}，但回读验证失败。可打开 ${recipeUrl(id)} 检查；再次运行相同 importKey 不会重复新增。`)
  const sort = (items) => [...items].sort((a, b) => a.position - b.position)
  const group = (kind) => sort(row.ingredients.filter((i) => i.kind === kind)).map(({ name, amount, unit }) => ({ name, amount, unit }))
  const phase = (name) => sort(row.steps.filter((s) => s.phase === name)).map((s) => s.content)
  const actual = { title: row.title, description: row.description, emoji: row.emoji, palette: row.palette, minutes: row.minutes, servings: row.servings, sauceNote: row.sauce_note, ingredients: group('main'), seasonings: group('seasoning'), sauce: group('sauce'), prep: phase('prep'), steps: phase('cook'), tags: row.recipe_tags.map((t) => t.tags.name).sort(), coverPath: row.cover_path }
  const expected = Object.fromEntries(Object.keys(actual).map((key) => [key, key === 'tags' ? [...payload.tags].sort() : key === 'coverPath' ? coverPath ?? null : payload[key]]))
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`菜谱 ${id} 已存在，但回读内容和本次输入不一致。保留云端原内容，不自动覆盖：${recipeUrl(id)}`)
  return { status: 'created', id, title: row.title, url: recipeUrl(id) }
}
