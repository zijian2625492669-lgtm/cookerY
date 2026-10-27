import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { prepareRecipe, addRecipe } from '../scripts/lib/recipe-import.mjs'
const sample = JSON.parse(await readFile(new URL('../examples/recipe.json', import.meta.url), 'utf8'))

function fakeKitchen({ existing = false, saveError = false, readError = false, mismatch = false } = {}) {
  const calls = { uploads: 0, saves: 0 }
  let saved
  return {
    calls,
    from: () => ({ select: () => ({ eq: () => ({
      maybeSingle: async () => ({ data: existing ? { id: '11111111-1111-4111-a111-111111111111', title: '已有菜谱' } : null }),
      single: async () => {
        if (readError) return { error: { message: 'network' } }
        const row = {
          ...saved, title: mismatch ? '另一份内容' : saved.title, sauce_note: saved.sauceNote, cover_path: saved.coverPath,
          ingredients: ['ingredients','seasonings','sauce'].flatMap((field, i) => saved[field].map((g, position) => ({ ...g, position, kind: ['main','seasoning','sauce'][i] }))),
          steps: ['prep','steps'].flatMap((field, i) => saved[field].map((content, position) => ({ content, position, phase: ['prep','cook'][i] }))),
          recipe_tags: [...saved.tags].reverse().map((name) => ({ tags: { name } })),
        }
        return { data: row }
      },
    }) }) }),
    storage: { from: () => ({ upload: async () => { calls.uploads++; return {} } }) },
    rpc: async (_name, { payload }) => {
      calls.saves++; saved = payload
      return saveError ? { error: { message: 'network interrupted' } } : { data: payload.draftId }
    },
  }
}

test('stable import key keeps the same ID across retries and ignores formatting changes', () => {
  const a = prepareRecipe(sample)
  const b = prepareRecipe({ ...sample, title: '修改标题', tags: ['家常','家常'] })
  assert.equal(a.draftId, b.draftId)
  assert.equal(a.legacyId, b.legacyId)
  assert.deepEqual(b.tags, ['家常'])
  assert.match(a.description, /来源：示例作者 https:\/\/example.com\/recipe-post/)
})
test('input cannot edit an existing recipe or smuggle privilege fields', () => {
  assert.throws(() => prepareRecipe({ ...sample, id: 'existing' }), /只新增/)
  assert.throws(() => prepareRecipe({ ...sample, created_by: 'someone' }), /不支持字段/)
  assert.throws(() => prepareRecipe({ ...sample, minutes: undefined }), /不要静默编造/)
  assert.throws(() => prepareRecipe({ ...sample, sourceUrl: 'javascript:alert(1)' }), /HTTP/)
})
test('existing import returns its live link without uploading or writing', async () => {
  const client = fakeKitchen({ existing: true })
  const result = await addRecipe(client, prepareRecipe(sample), new Uint8Array([1,2]))
  assert.equal(result.status, 'already_exists')
  assert.deepEqual(client.calls, { uploads: 0, saves: 0 })
  assert.match(result.url, /#\/r\//)
})
test('new recipe uses private storage and the same transaction RPC, then verifies all five sections', async () => {
  const client = fakeKitchen()
  const result = await addRecipe(client, prepareRecipe(sample), new Uint8Array([0xff,0xd8,0xff]))
  assert.equal(result.status, 'created')
  assert.deepEqual(client.calls, { uploads: 1, saves: 1 })
})
test('uncertain save instructs retry with the original key', async () => {
  const client = fakeKitchen({ saveError: true })
  await assert.rejects(addRecipe(client, prepareRecipe(sample)), /保持同一个 importKey 重试/)
  assert.equal(client.calls.saves, 1)
})
test('failed or mismatched read-back never reports success', async () => {
  await assert.rejects(addRecipe(fakeKitchen({ readError: true }), prepareRecipe(sample)), /回读验证失败/)
  await assert.rejects(addRecipe(fakeKitchen({ mismatch: true }), prepareRecipe(sample)), /不自动覆盖/)
})
