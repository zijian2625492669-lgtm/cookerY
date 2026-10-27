import { test, expect, type Page } from '@playwright/test'

const uid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const rid = '11111111-1111-4111-8111-111111111111'
const user = { id: uid, aud: 'authenticated', role: 'authenticated', email: 'shared_cook@cook.com', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: new Date().toISOString() }
const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: uid, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`
const session = { access_token: token, refresh_token: 'test-refresh', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user }
const recipe = () => ({ id: rid, created_by: uid, title: '番茄炒蛋', description: '简单好吃', emoji: '🍳', palette: 0, minutes: 15, servings: 2, sauce_note: '', cover_path: null, local_photo: null, updated_at: new Date().toISOString(), ingredients: [{ name: '鸡蛋', amount: '2', unit: '个', kind: 'main', position: 0 }], steps: [{ phase: 'cook', position: 0, content: '炒熟' }], recipe_tags: [{ tags: { name: '家常' } }] })

async function kitchen(page: Page, loggedIn = true) {
  let rows = [recipe()]
  let failSave = false
  let failDelete = false
  let saved: Record<string, unknown> | null = null
  let uploads = 0
  let login: Record<string, unknown> | null = null
  let logoutScope: string | null = null
  await page.addInitScript(({ session, loggedIn }) => {
    localStorage.setItem('cookery.user', '旧原型用户')
    if (loggedIn) localStorage.setItem('sb-jjgrnefvpqhthsobpkml-auth-token', JSON.stringify(session))
  }, { session, loggedIn })
  await page.route('https://jjgrnefvpqhthsobpkml.supabase.co/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const body = request.headers()['content-type']?.includes('application/json') ? request.postDataJSON() : null
    const send = (data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(data) })
    if (request.method() === 'OPTIONS') return send({})
    if (path === '/auth/v1/token') {
      login = body
      return body.password === 'wrong' ? send({ message: 'Invalid login credentials', error_code: 'invalid_credentials' }, 400) : send(session)
    }
    if (path === '/auth/v1/user') return send(user)
    if (path === '/auth/v1/logout') { logoutScope = new URL(request.url()).searchParams.get('scope'); return send({}) }
    if (path === '/rest/v1/members') return send([{ user_id: uid, username: 'shared_cook', display_name: '甲' }, { user_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', username: 'cook_two', display_name: '乙' }])
    if (path === '/rest/v1/tags') return send([{ name: '家常' }, { name: '快手' }])
    if (path === '/rest/v1/recipes' && request.method() === 'DELETE') {
      if (failDelete) return send({ message: '暂时无法删除' }, 500)
      rows = []; return send([{ id: rid }])
    }
    if (path === '/rest/v1/recipes') return send(rows)
    if (path === '/rest/v1/rpc/save_recipe') {
      saved = body.payload
      if (failSave) return send({ message: '保存暂时失败' }, 500)
      const p = body.payload
      rows = [{ ...recipe(), title: p.title, cover_path: p.coverPath, ingredients: p.ingredients.map((i: object, position: number) => ({ ...i, kind: 'main', position })), steps: p.steps.map((content: string, position: number) => ({ content, phase: 'cook', position })) }]
      return send(rid)
    }
    if (path.startsWith('/storage/v1/object/recipe-images/')) { uploads++; return send({ Key: 'recipe-images/test.jpg' }) }
    if (path === '/storage/v1/object/sign/recipe-images') return send(body.paths.map((path: string) => ({ path, signedURL: `/object/sign/recipe-images/${path}?token=test`, error: null })))
    if (path.startsWith('/storage/v1/object/sign/recipe-images/')) return send({ signedURL: `${path}?token=test` })
    return send({})
  })
  return { failSave: (value: boolean) => { failSave = value }, failDelete: (value: boolean) => { failDelete = value }, saved: () => saved, uploads: () => uploads, login: () => login, logoutScope: () => logoutScope }
}

test('old prototype user cannot bypass login; custom account maps internally and reports wrong password', async ({ page }) => {
  const mock = await kitchen(page, false)
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'cookerY' })).toBeVisible()
  await page.getByLabel('账号', { exact: true }).fill('shared_cook')
  await page.getByLabel('密码', { exact: true }).fill('wrong')
  await page.getByRole('button', { name: '进厨房', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('账号或密码不对')
  expect(mock.login()?.email).toBe('shared_cook@cook.com')
  await page.getByLabel('账号', { exact: true }).fill('SHARED_COOK@COOK.COM')
  await page.getByLabel('密码', { exact: true }).fill('valid-password')
  await page.getByRole('button', { name: '进厨房', exact: true }).click()
  await expect(page.getByRole('heading', { name: '我们的菜谱' })).toBeVisible()
  if (process.env.COOKERY_SCREENSHOT) await page.screenshot({ path: process.env.COOKERY_SCREENSHOT, fullPage: true })
})

test('failed save keeps the draft, retry persists all five sections and a new tag', async ({ page }) => {
  const mock = await kitchen(page)
  mock.failSave(true)
  await page.goto('./#/new')
  await page.getByPlaceholder('比如：鱼香肉丝').fill('测试酱汁菜')
  await page.getByPlaceholder('食材', { exact: true }).fill('豆腐')
  await page.getByPlaceholder('调料', { exact: true }).fill('盐')
  await page.getByRole('button', { name: '加一样到酱料里' }).click()
  await page.getByPlaceholder('酱料成分').fill('醋')
  await page.getByPlaceholder('比如：里脊切丝，加盐和淀粉腌 10 分钟').fill('切好豆腐')
  await page.getByPlaceholder('这一步做什么、火候、多久').fill('炒熟')
  await page.getByLabel('新标签').fill('拿手菜')
  await page.getByRole('button', { name: '添加', exact: true }).click()
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('保存暂时失败')
  await expect(page.getByPlaceholder('比如：鱼香肉丝')).toHaveValue('测试酱汁菜')
  const firstDraft = mock.saved()?.draftId
  mock.failSave(false)
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByRole('heading', { name: '测试酱汁菜' })).toBeVisible()
  expect(mock.saved()).toMatchObject({ ingredients: [{ name: '豆腐', amount: '', unit: '' }], seasonings: [{ name: '盐', amount: '', unit: '' }], sauce: [{ name: '醋', amount: '', unit: '' }], prep: ['切好豆腐'], steps: ['炒熟'], tags: ['拿手菜'], draftId: firstDraft })
})

test('cover is uploaded to private storage before recipe save', async ({ page }) => {
  const mock = await kitchen(page)
  await page.goto(`./#/r/${rid}/edit`)
  await page.getByLabel('换一张成品图').setInputFiles('public/recipes/tangcu-paigu.jpg')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByRole('heading', { name: '番茄炒蛋' })).toBeVisible()
  expect(mock.uploads()).toBe(1)
  expect(mock.saved()?.coverPath).toMatch(/^covers\/[\w-]+\.jpg$/)
})

test('failed deletion keeps the detail visible and can be retried', async ({ page }) => {
  const mock = await kitchen(page)
  mock.failDelete(true)
  await page.goto(`./#/r/${rid}`)
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '删除这道菜' }).click()
  await expect(page.getByRole('alert')).toContainText('暂时无法删除')
  await expect(page.getByRole('heading', { name: '番茄炒蛋' })).toBeVisible()
  mock.failDelete(false)
  await page.getByRole('button', { name: '删除这道菜' }).click()
  await expect(page.getByRole('heading', { name: '我们的菜谱' })).toBeVisible()
  await expect(page.getByText('还没有这道菜')).toBeVisible()
})


test('shared account logout only ends this device session', async ({ page }) => {
  const mock = await kitchen(page)
  await page.goto('./#/me')
  await page.getByRole('button', { name: '退出登录' }).click()
  await expect(page.getByRole('heading', { name: 'cookerY', exact: true })).toBeVisible()
  expect(mock.logoutScope()).toBe('local')
})
