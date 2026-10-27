import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import { uploadCover, removeImages, coverUrl } from '../lib/images'
import { errorMessage } from '../lib/supabase'
import { emptyRecipe, type Ingredient, type Recipe } from '../lib/types'
import { Cover, PALETTE_COUNT } from '../components/Cover'
import { TopBar } from '../components/TopBar'

const EMOJIS = ['🍳', '🍅', '🍗', '🥢', '🥟', '🍜', '🍲', '🥗', '🍰', '🐟', '🥩', '🍄', '🥭']
const blank = (): Ingredient => ({ name: '', amount: '', unit: '' })

function IngEditor({ list, onChange, add, hint }: { list: Ingredient[]; onChange: (l: Ingredient[]) => void; add: string; hint: string }) {
  return (
    <div className="list-edit">
      {list.map((g, i) => (
        <div className="ing-row" key={i}>
          <input className="grow" placeholder={hint} value={g.name} onChange={(e) => onChange(list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
          <input className="amt" placeholder="用量" value={g.amount} onChange={(e) => onChange(list.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
          <input className="unit" placeholder="单位" value={g.unit} onChange={(e) => onChange(list.map((x, j) => (j === i ? { ...x, unit: e.target.value } : x)))} />
          <button className="x" aria-label="删除" onClick={() => onChange(list.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <button className="btn btn-ghost btn-block" onClick={() => onChange([...list, blank()])}>＋ {add}</button>
    </div>
  )
}

function StepEditor({ list, onChange, add, hint, tone }: { list: string[]; onChange: (l: string[]) => void; add: string; hint: string; tone?: string }) {
  return (
    <div className={`list-edit steps ${tone ?? ''}`}>
      {list.map((s, i) => (
        <div className="step-row" key={i}>
          <span className="step-no serif">{i + 1}</span>
          <textarea rows={2} className="grow" placeholder={hint} value={s} onChange={(e) => onChange(list.map((x, j) => (j === i ? e.target.value : x)))} />
          <button className="x" aria-label="删除" onClick={() => onChange(list.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <button className="btn btn-ghost btn-block" onClick={() => onChange([...list, ''])}>＋ {add}</button>
    </div>
  )
}

export default function Edit() {
  const { id } = useParams()
  const nav = useNavigate()
  const { recipes, save, user, tags } = useStore()
  const existing = recipes.find((x) => x.id === id)
  const [r, setR] = useState<Recipe>(existing ?? emptyRecipe(user ?? '我'))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>()
  const [uploaded, setUploaded] = useState<string>()
  const [tagName, setTagName] = useState('')
  useEffect(() => {
    if (!image) { setPreview(undefined); return }
    const url = URL.createObjectURL(image)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [image])
  const set = <K extends keyof Recipe>(k: K, v: Recipe[K]) => setR((cur) => ({ ...cur, [k]: v }))

  const submit = async () => {
    if (busy) return
    if (!r.title.trim()) return alert('先给这道菜起个名字')
    if (!Number.isInteger(r.minutes) || r.minutes < 0 || r.minutes > 10080 || !Number.isInteger(r.servings) || r.servings < 1 || r.servings > 100) return setError('用时填 0–10080 分钟，份量填 1–100 人的整数')
    const clean = (l: Ingredient[]) => l.filter((g) => g.name.trim())
    const cleanS = (l: string[]) => l.filter((s) => s.trim())
    setBusy(true); setError('')
    try {
      const coverPath = image ? uploaded || await uploadCover(image) : r.coverPath
      if (image) setUploaded(coverPath)
      const photo = coverPath ? await coverUrl(coverPath) : r.photo
      const id = await save({
        ...r, coverPath, photo,
        ingredients: clean(r.ingredients), seasonings: clean(r.seasonings), sauce: clean(r.sauce),
        prep: cleanS(r.prep), steps: cleanS(r.steps),
      })
      if (existing?.coverPath && existing.coverPath !== coverPath) {
        // The recipe is saved even if removing the old object temporarily fails.
        await removeImages([existing.coverPath]).catch(() => {})
      }
      nav(`/r/${id}`, { replace: true })
    } catch (cause) { setError(errorMessage(cause)); setBusy(false) }
  }

  if (id && !existing) return <main className="page"><p>找不到这道菜，可能已被删除</p></main>

  return (
    <main className="page edit">
      <TopBar
        solid
        left={<button className="text-btn" disabled={busy} onClick={() => nav(-1)}>取消</button>}
        title={existing ? '编辑菜谱' : '记一道新菜'}
        right={<button className="text-btn strong" disabled={busy} onClick={() => void submit()}>{busy ? '保存中…' : '保存'}</button>}
      />
      {error && <p className="notice" role="alert">{error}</p>}
      <fieldset className="edit-fields" disabled={busy}>

      <button className="cover-pick" onClick={() => set('palette', (r.palette + 1) % PALETTE_COUNT)}>
        <Cover emoji={r.emoji} palette={r.palette} photo={preview || r.photo} size="hero" />
        <span className="cover-hint">点一下换底色</span>
      </button>
      <label className="field"><span>换一张成品图</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { setImage(e.target.files?.[0] ?? null); setUploaded(undefined) }} /></label>
      {(r.photo || image) && <button className="text-btn" onClick={() => { setImage(null); setUploaded(undefined); setR((cur) => ({ ...cur, photo: undefined, coverPath: undefined, localPhoto: undefined })) }}>移除照片</button>}
      <div className="emoji-row">
        {EMOJIS.map((e) => (
          <button key={e} className={`emoji ${r.emoji === e ? 'on' : ''}`} onClick={() => set('emoji', e)}>{e}</button>
        ))}
      </div>

      <label className="field">
        <span>菜名</span>
        <input maxLength={200} value={r.title} placeholder="比如：鱼香肉丝" onChange={(e) => set('title', e.target.value)} />
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
        {[...new Set([...tags, ...r.tags])].map((t) => (
          <button key={t} className={`chip ${r.tags.includes(t) ? 'on' : ''}`}
            onClick={() => set('tags', r.tags.includes(t) ? r.tags.filter((x) => x !== t) : [...r.tags, t])}>{t}</button>
        ))}
      </div>
      <div className="new-tag"><input aria-label="新标签" placeholder="加一个标签" maxLength={30} value={tagName} onChange={(e) => setTagName(e.target.value)} /><button className="btn btn-ghost" onClick={() => { const name = tagName.trim(); if (name) { set('tags', [...new Set([...r.tags, name])]); setTagName('') } }}>添加</button></div>

      <h2 className="serif section"><span className="sec-no">1</span>食材</h2>
      <p className="muted tiny sec-tip">主料和配料：肉、菜、蛋、豆腐……</p>
      <IngEditor list={r.ingredients} onChange={(l) => set('ingredients', l)} add="加一样食材" hint="食材" />

      <h2 className="serif section"><span className="sec-no">2</span>调料</h2>
      <p className="muted tiny sec-tip">炒的时候直接下锅的：油、盐、豆瓣酱、姜蒜……</p>
      <IngEditor list={r.seasonings} onChange={(l) => set('seasonings', l)} add="加一样调料" hint="调料" />

      <h2 className="serif section"><span className="sec-no">3</span>酱料<small>可不填</small></h2>
      <p className="muted tiny sec-tip">需要提前混合好的一碗汁，比如鱼香汁、糖醋汁</p>
      <IngEditor list={r.sauce} onChange={(l) => set('sauce', l)} add="加一样到酱料里" hint="酱料成分" />
      {r.sauce.length > 0 && (
        <textarea rows={2} className="sauce-input" placeholder="怎么调：比如 全部搅匀，糖化开再用" value={r.sauceNote} onChange={(e) => set('sauceNote', e.target.value)} />
      )}

      <h2 className="serif section"><span className="sec-no">4</span>备菜处理</h2>
      <p className="muted tiny sec-tip">开火前做完的：洗、切、腌、泡发、焯水</p>
      <StepEditor list={r.prep} onChange={(l) => set('prep', l)} add="加一步备菜" hint="比如：里脊切丝，加盐和淀粉腌 10 分钟" tone="herb" />

      <h2 className="serif section"><span className="sec-no hot">5</span>正式开做</h2>
      <p className="muted tiny sec-tip">开火之后，一步一步来</p>
      <StepEditor list={r.steps} onChange={(l) => set('steps', l)} add="加一步" hint="这一步做什么、火候、多久" />
      <div style={{ height: 40 }} />
      </fieldset>
    </main>
  )
}
