export type Ingredient = { name: string; amount: string; unit: string }

// 一道菜分五段：食材 → 调料 → 酱料（提前调好） → 备菜处理 → 正式开做
export type Recipe = {
  id: string
  draftId?: string
  version?: string
  title: string
  description: string
  emoji: string
  palette: number
  photo?: string            // 成品图：public/ 下的相对路径，或以后的 Supabase Storage 地址
  servings: number
  minutes: number
  tags: string[]
  author: string
  authorId?: string
  coverPath?: string
  localPhoto?: string
  ingredients: Ingredient[] // 主料、配料
  seasonings: Ingredient[]  // 调料：直接下锅的盐、糖、生抽……
  sauce: Ingredient[]       // 酱料：提前混合好的碗汁
  sauceNote: string         // 酱料怎么调
  prep: string[]            // 备菜处理：切、腌、焯水……
  steps: string[]           // 正式开做
  updatedAt: number
}

export const emptyRecipe = (author: string): Recipe => ({
  id: '', draftId: crypto.randomUUID(), title: '', description: '', emoji: '🍳', palette: 0,
  servings: 2, minutes: 20, tags: [], author,
  ingredients: [{ name: '', amount: '', unit: '' }],
  seasonings: [{ name: '', amount: '', unit: '' }],
  sauce: [], sauceNote: '', prep: [''], steps: [''], updatedAt: Date.now(),
})

// 兼容旧数据：缺的字段补空
export const normalize = (r: Partial<Recipe>): Recipe => ({
  ...emptyRecipe(r.author ?? '我'),
  ingredients: [], seasonings: [], prep: [], steps: [],
  ...r,
} as Recipe)
