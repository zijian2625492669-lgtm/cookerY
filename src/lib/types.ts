export type Ingredient = { name: string; amount: string; unit: string }

// 一道菜分四段：食材 → 调料 → 酱料（提前调好） → 备菜处理 → 正式开做
export type Recipe = {
  id: string
  title: string
  description: string
  emoji: string
  palette: number
  servings: number
  minutes: number
  tags: string[]
  author: string
  ingredients: Ingredient[] // 主料、配料
  seasonings: Ingredient[]  // 调料：直接下锅的盐、糖、生抽……
  sauce: Ingredient[]       // 酱料：提前混合好的碗汁
  sauceNote: string         // 酱料怎么调
  prep: string[]            // 备菜处理：切、腌、焯水……
  steps: string[]           // 正式开做
  updatedAt: number
}

export const emptyRecipe = (author: string): Recipe => ({
  id: `r${Date.now()}`, title: '', description: '', emoji: '🍳', palette: 0,
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
