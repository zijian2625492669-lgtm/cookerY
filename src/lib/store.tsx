import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { normalize, type Recipe } from './types'
import { MOCK } from './mock'

// 原型阶段：数据存在 localStorage。接 Supabase 时只需替换这里的读写。
type Store = {
  user: string | null
  login: (email: string) => void
  logout: () => void
  recipes: Recipe[]
  save: (r: Recipe) => void
  remove: (id: string) => void
}

const Ctx = createContext<Store>(null as unknown as Store)
const KEY = 'cookery.recipes.v2'
const UKEY = 'cookery.user'

export function StoreProvider({ children }: { children: ReactNode }) {
  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Recipe[]).map(normalize) : MOCK
  })
  const [user, setUser] = useState<string | null>(() => localStorage.getItem(UKEY))

  useEffect(() => localStorage.setItem(KEY, JSON.stringify(recipes)), [recipes])

  const value: Store = {
    user,
    login: (email) => {
      const name = email.split('@')[0] || 'Zijian'
      localStorage.setItem(UKEY, name)
      setUser(name)
    },
    logout: () => {
      localStorage.removeItem(UKEY)
      setUser(null)
    },
    recipes,
    save: (r) =>
      setRecipes((list) => {
        const rest = list.filter((x) => x.id !== r.id)
        return [{ ...r, updatedAt: Date.now() }, ...rest]
      }),
    remove: (id) => setRecipes((list) => list.filter((x) => x.id !== id)),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useStore = () => useContext(Ctx)
