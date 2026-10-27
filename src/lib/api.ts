import type { Recipe, Ingredient } from './types'
import { supabase } from './supabase'
export type Member = { user_id: string; username: string; display_name: string }
type IngredientRow = Ingredient & { kind: string; position: number }
type StepRow = { phase: string; position: number; content: string }
type RecipeRow = {
  id: string; created_by: string; title: string; description: string; emoji: string; palette: number;
  minutes: number; servings: number; sauce_note: string; cover_path: string | null; local_photo: string | null; updated_at: string;
  ingredients: IngredientRow[]; steps: StepRow[]; recipe_tags: { tags: { name: string } }[];
}
export async function loadKitchen() {
  const [memberResult, recipeResult, tagResult] = await Promise.all([
    supabase.from('members').select('user_id,username,display_name'),
    supabase.from('recipes').select('*,ingredients(*),steps(*),recipe_tags(tags(name))').order('updated_at', { ascending: false }),
    supabase.from('tags').select('name').order('name'),
  ])
  for (const result of [memberResult, recipeResult, tagResult]) if (result.error) throw result.error
  const members = memberResult.data as Member[]
  const rows = recipeResult.data as unknown as RecipeRow[]
  const paths = [...new Set(rows.flatMap((r) => r.cover_path ? [r.cover_path] : []))]
  const photos = new Map<string, string>()
  if (paths.length) {
    const { data, error } = await supabase.storage.from('recipe-images').createSignedUrls(paths, 3600)
    if (error) throw error
    for (const item of data) if (item.path && item.signedUrl && !item.error) photos.set(item.path, item.signedUrl)
  }
  const recipes: Recipe[] = rows.map((row) => {
    const ingredients = (kind: string) => row.ingredients.filter((i) => i.kind === kind).sort((a, b) => a.position - b.position).map(({ name, amount, unit }) => ({ name, amount, unit }))
    const steps = (phase: string) => row.steps.filter((s) => s.phase === phase).sort((a, b) => a.position - b.position).map((s) => s.content)
    return {
      id: row.id, version: row.updated_at, authorId: row.created_by, author: members.find((m) => m.user_id === row.created_by)?.display_name ?? '厨房成员',
      title: row.title, description: row.description, emoji: row.emoji, palette: row.palette,
      servings: row.servings, minutes: row.minutes, sauceNote: row.sauce_note,
      coverPath: row.cover_path ?? undefined, localPhoto: row.local_photo ?? undefined,
      photo: row.cover_path ? photos.get(row.cover_path) : row.local_photo ?? undefined,
      ingredients: ingredients('main'), seasonings: ingredients('seasoning'), sauce: ingredients('sauce'),
      prep: steps('prep'), steps: steps('cook'), tags: row.recipe_tags.map((t) => t.tags.name), updatedAt: Date.parse(row.updated_at),
    }
  })
  return { members, recipes, tags: (tagResult.data as { name: string }[]).map((t) => t.name) }
}
export async function saveRecipe(recipe: Recipe, legacyId?: string) {
  const { data, error } = await supabase.rpc('save_recipe', { payload: {
    ...recipe, id: recipe.id || null, legacyId,
    localPhoto: recipe.localPhoto || (recipe.photo === 'recipes/tangcu-paigu.jpg' ? recipe.photo : null),
    photo: undefined, author: undefined, authorId: undefined,
  } })
  if (error) throw error
  return data as string
}
export async function deleteRecipe(id: string) {
  const { data, error } = await supabase.from('recipes').delete().eq('id', id).select('id')
  if (error) throw error
  if (!data.length) throw new Error('这道菜已不在列表里，请刷新后再试')
}
