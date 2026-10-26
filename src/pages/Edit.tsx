import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import { ALL_TAGS } from '../lib/mock'
import type { Ingredient, Recipe } from '../lib/types'
import { Cover, PALETTE_COUNT } from '../components/Cover'

const EMOJIS = ['🍳', '🍅', '🍗', '🥟', '🍜', '🍲', '🥗', '🍰', '🐟', '🥩', '🍄', '🥭']

export default function Edit() {
  const { id } = useParams()
  const nav = useNavigate()
  const { recipes, save, user } = useStore()
  const existing = recipes.find((x) => x.id === id)
  const [r, setR] = useState<Recipe>(
    existing ?? {
      id: `r${Date.now()}`, title: '', description: '', emoji: '🍳', palette: 0,
      servings: 2, minutes: 20, tags: [], author: user ?? '我',
      ingredients: [{ name: '', amount: '', unit: '' }], steps: [''], updatedAt: Date.now(),
    },
  )
  const set = <K extends keyof Recipe>(k: K, v: Recipe[K]) => setR({ ...r, [k]: v })
  const setIng = (i: number, patch: Partial<Ingredient>) =>
    set('ingredients', r.ingredients.map((g, j) => (j === i ? { ...g, ...patch } : g)))

  const submit = () => {
    if (!r.title.trim()) return alert('先给这道菜起个名字')
    save({
      ...r,
      ingredients: r.ingredients.filter((g) => g.name.trim()),
      steps: r.steps.filter((s) => s.trim()),
    })
    nav(`/r/${r.id}`, { replace: true })
  }

  return (
    <main className="page edit">
      <header className="edit-head">
        <button className="text-btn" onClick={() => nav(-1)}>取消</button>
        <h1 className="serif">{existing ? '编辑菜谱' : '记一道新菜'}</h1>
        <button className="text-btn strong" onClick={submit}>保存</button>
      </header>

      <button className="cover-pick" onClick={() => set('palette', (r.palette + 1) % PALETTE_COUNT)}>
        <Cover emoji={r.emoji} palette={r.palette} size="hero" />
        <span className="cover-hint">点一下换颜色 · 之后可上传照片</span>
      </button>
      <div className="emoji-row">
        {EMOJIS.map((e) => (
          <button key={e} className={`emoji ${r.emoji === e ? 'on' : ''}`} onClick={() => set('emoji', e)}>{e}</button>
        ))}
      </div>

      <label className="field">
        <span>菜名</span>
        <input value={r.title} placeholder="比如：番茄炒蛋" onChange={(e) => set('title', e.target.value)} />
      </label>
      <label className="field">
        <span>一句话</span>
        <textarea rows={2} value={r.description} placeholder="这道菜的小心得" onChange={(e) => set('description', e.target.value)} />
      </label>
      <div className="row2">
        <label className="field">
          <span>用时（分钟）</span>
          <input type="number" inputMode="numeric" value={r.minutes} onChange={(e) => set('minutes', +e.target.value)} />
        </label>
        <label className="field">
          <span>份量（人）</span>
          <input type="number" inputMode="numeric" value={r.servings} onChange={(e) => set('servings', +e.target.value)} />
        </label>
      </div>

      <p className="label">标签</p>
      <div className="chips wrap">
        {ALL_TAGS.map((t) => (
          <button key={t} className={`chip ${r.tags.includes(t) ? 'on' : ''}`}
            onClick={() => set('tags', r.tags.includes(t) ? r.tags.filter((x) => x !== t) : [...r.tags, t])}>{t}</button>
        ))}
      </div>

      <p className="label">食材</p>
      <div className="list-edit">
        {r.ingredients.map((g, i) => (
          <div className="ing-row" key={i}>
            <input className="grow" placeholder="食材" value={g.name} onChange={(e) => setIng(i, { name: e.target.value })} />
            <input className="amt" placeholder="用量" value={g.amount} onChange={(e) => setIng(i, { amount: e.target.value })} />
            <input className="unit" placeholder="单位" value={g.unit} onChange={(e) => setIng(i, { unit: e.target.value })} />
            <button className="x" aria-label="删除" onClick={() => set('ingredients', r.ingredients.filter((_, j) => j !== i))}>×</button>
          </div>
        ))}
        <button className="btn btn-ghost btn-block" onClick={() => set('ingredients', [...r.ingredients, { name: '', amount: '', unit: '' }])}>＋ 加一样食材</button>
      </div>

      <p className="label">步骤</p>
      <div className="list-edit">
        {r.steps.map((s, i) => (
          <div className="step-row" key={i}>
            <span className="step-no serif">{i + 1}</span>
            <textarea rows={2} className="grow" placeholder="这一步做什么" value={s}
              onChange={(e) => set('steps', r.steps.map((x, j) => (j === i ? e.target.value : x)))} />
            <button className="x" aria-label="删除" onClick={() => set('steps', r.steps.filter((_, j) => j !== i))}>×</button>
          </div>
        ))}
        <button className="btn btn-ghost btn-block" onClick={() => set('steps', [...r.steps, ''])}>＋ 加一步</button>
      </div>
      <div style={{ height: 40 }} />
    </main>
  )
}
