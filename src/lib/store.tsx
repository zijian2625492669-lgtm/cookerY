import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { normalize, type Recipe } from './types'
import { loadKitchen, saveRecipe, deleteRecipe, type Member } from './api'
import { supabase, usernameEmail, validUsername, errorMessage } from './supabase'
import { removeImages } from './images'

type Store = {
  user: string | null; userId: string | null; loading: boolean; error: string; members: Member[]; tags: string[]
  login: (username: string, password: string) => Promise<void>; logout: () => Promise<void>
  recipes: Recipe[]; save: (r: Recipe) => Promise<string>; remove: (id: string) => Promise<void>
  refresh: () => Promise<void>; importLocal: () => Promise<number>
}
const Ctx = createContext<Store>(null as unknown as Store)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [error, setError] = useState('')
  const epoch = useRef(0)
  const sessionId = session?.user.id ?? null
  const currentId = useRef(sessionId)
  currentId.current = sessionId

  useEffect(() => {
    let active = true
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) { setSession(next); setAuthReady(true) }
    })
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setError(errorMessage(error))
      setSession(data.session); setAuthReady(true)
    })
    return () => { active = false; data.subscription.unsubscribe() }
  }, [])

  const refresh = useCallback(async () => {
    if (!sessionId) return
    const version = ++epoch.current
    try {
      const data = await loadKitchen()
      if (currentId.current !== sessionId || version !== epoch.current) return
      if (!data.members.some((m) => m.user_id === sessionId)) {
        setRecipes([]); setMembers([]); setTags([])
        throw new Error('这个账号还不是厨房成员')
      }
      setRecipes(data.recipes); setMembers(data.members); setTags(data.tags); setError('')
    } catch (cause) {
      if (currentId.current === sessionId && version === epoch.current) setError(errorMessage(cause))
      throw cause
    } finally {
      if (currentId.current === sessionId && version === epoch.current) setLoadedFor(sessionId)
    }
  }, [sessionId])

  useEffect(() => {
    ++epoch.current
    setRecipes([]); setMembers([]); setTags([]); setLoadedFor(null)
    if (sessionId) void refresh().catch(() => {})
  }, [sessionId, refresh])

  useEffect(() => {
    if (!sessionId) return
    const reload = () => { if (document.visibilityState === 'visible') void refresh().catch(() => {}) }
    const timer = window.setInterval(reload, 30000)
    window.addEventListener('focus', reload)
    window.addEventListener('online', reload)
    return () => { clearInterval(timer); window.removeEventListener('focus', reload); window.removeEventListener('online', reload) }
  }, [sessionId, refresh])

  const member = members.find((m) => m.user_id === sessionId)
  const value: Store = {
    user: member?.display_name ?? null, userId: member?.user_id ?? null,
    loading: !authReady || (!!sessionId && loadedFor !== sessionId), error, members, tags, recipes, refresh,
    login: async (username, password) => {
      if (!validUsername(username)) throw new Error('填一下邮箱，或 3–24 位字母、数字和下划线组成的账号')
      setError('')
      const { error } = await supabase.auth.signInWithPassword({ email: usernameEmail(username), password })
      if (error) throw error
    },
    logout: async () => {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) throw error
      ++epoch.current; setRecipes([]); setMembers([]); setTags([]); setError('')
    },
    save: async (recipe) => {
      const id = await saveRecipe(recipe)
      const saved = { ...recipe, id, authorId: recipe.authorId || sessionId || undefined, updatedAt: Date.now() }
      setRecipes((list) => [saved, ...list.filter((r) => r.id !== id)])
      // The write succeeded; a refresh failure must not invite a duplicate save.
      void refresh().catch(() => {})
      return id
    },
    remove: async (id) => {
      const recipe = recipes.find((r) => r.id === id)
      await deleteRecipe(id)
      setRecipes((list) => list.filter((r) => r.id !== id))
      if (recipe?.coverPath) {
        try { await removeImages([recipe.coverPath]) }
        catch { setError('菜谱已删除，但旧照片暂时没清理掉') }
      }
    },
    importLocal: async () => {
      const raw = localStorage.getItem('cookery.recipes.v2')
      if (!raw) throw new Error('这个浏览器里没有旧菜谱，可以直接记一道新的')
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) throw new Error('旧菜谱格式不完整，原始数据仍保留在本机')
      let count = 0
      try {
        for (const source of parsed) {
          if (!source || typeof source !== 'object' || typeof source.id !== 'string' || typeof source.title !== 'string') throw new Error('旧菜谱格式不完整，原始数据仍保留在本机')
          const recipe = normalize(source)
          await saveRecipe({ ...recipe, id: '', author: member?.display_name ?? '', authorId: sessionId ?? undefined }, source.id)
          count++
        }
      } catch (cause) {
        throw new Error(`已处理 ${count} 道，剩余的下次可继续：${errorMessage(cause)}`)
      } finally { await refresh().catch(() => {}) }
      return count
    },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useStore = () => useContext(Ctx)
