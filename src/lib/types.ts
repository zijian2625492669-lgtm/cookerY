export type Ingredient = { name: string; amount: string; unit: string }
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
  ingredients: Ingredient[]
  steps: string[]
  updatedAt: number
}
