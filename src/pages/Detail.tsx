import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Cover } from '../components/Cover'
import { TopBar, BackIcon, EditIcon } from '../components/TopBar'
import type { Ingredient } from '../lib/types'
import { errorMessage } from '../lib/supabase'

export default function Detail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { recipes, remove } = useStore()
  const r = recipes.find((x) => x.id === id)
  const [done, setDone] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!r) return <main className="page"><p>找不到这道菜</p></main>

  const toggle = (k: string) =>
    setDone((s) => {
      const n = new Set(s)
      n.has(k) ? n.delete(k) : n.add(k)
      return n
    })

  const Checklist = ({ list, k }: { list: Ingredient[]; k: string }) => (
    <ul className="ingredients">
      {list.map((g, i) => (
        <li key={i} className={done.has(k + i) ? 'checked' : ''} onClick={() => toggle(k + i)}>
          <span className="check" />
          <span className="ing-name">{g.name}</span>
          <span className="ing-amt">{g.amount}{g.unit}</span>
        </li>
      ))}
    </ul>
  )

  const Steps = ({ list, k, tone }: { list: string[]; k: string; tone?: 'herb' }) => (
    <ol className={`steps ${tone ?? ''}`}>
      {list.map((s, i) => (
        <li key={i} className={done.has(k + i) ? 'checked' : ''} onClick={() => toggle(k + i)}>
          <span className="step-no serif">{i + 1}</span>
          <p>{s}</p>
        </li>
      ))}
    </ol>
  )

  // 只显示有内容的段落
  const sections = [
    { id: 'ing', name: '食材', show: r.ingredients.length > 0 },
    { id: 'sea', name: '调料', show: r.seasonings.length > 0 },
    { id: 'sau', name: '酱料', show: r.sauce.length > 0 },
    { id: 'pre', name: '备菜', show: r.prep.length > 0 },
    { id: 'cook', name: '开做', show: r.steps.length > 0 },
  ].filter((s) => s.show)
  const no = (sid: string) => sections.findIndex((s) => s.id === sid) + 1
  const jump = (sid: string) => document.getElementById(sid)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <main className="detail">
      <TopBar
        left={<button className="icon-btn" onClick={() => nav(-1)} aria-label="返回"><BackIcon /></button>}
        right={<Link to={`/r/${r.id}/edit`} className="icon-btn" aria-label="编辑"><EditIcon /></Link>}
      />
      <div className="hero">
        <Cover emoji={r.emoji} palette={r.palette} photo={r.photo} size="hero" />
      </div>

      <section className="sheet">
        {error && <p className="notice" role="alert">{error}</p>}
        <h1 className="serif title">{r.title}</h1>
        <p className="muted">{r.description}</p>
        <div className="meta">
          <span className="pill">⏱ {r.minutes} 分钟</span>
          <span className="pill">🍽 {r.servings} 人份</span>
          <span className="pill">✍️ {r.author}</span>
        </div>
        <div className="tags">{r.tags.map((t) => <span key={t} className="tag">#{t}</span>)}</div>

        <nav className="flow">
          {sections.map((s, i) => (
            <button key={s.id} onClick={() => jump(s.id)}>
              {i > 0 && <span className="flow-arrow">›</span>}
              <span className={`flow-step ${s.id === 'cook' ? 'hot' : ''}`}>{s.name}</span>
            </button>
          ))}
        </nav>

        {r.ingredients.length > 0 && <>
          <h2 id="ing" className="serif section"><span className="sec-no">{no('ing')}</span>食材</h2>
          <Checklist list={r.ingredients} k="i" />
        </>}

        {r.seasonings.length > 0 && <>
          <h2 id="sea" className="serif section"><span className="sec-no">{no('sea')}</span>调料</h2>
          <Checklist list={r.seasonings} k="s" />
        </>}

        {r.sauce.length > 0 && <>
          <h2 id="sau" className="serif section"><span className="sec-no">{no('sau')}</span>酱料<small>提前调好一碗</small></h2>
          <div className="sauce-card">
            <Checklist list={r.sauce} k="a" />
            {r.sauceNote && <p className="sauce-note">🥣 {r.sauceNote}</p>}
          </div>
        </>}

        {r.prep.length > 0 && <>
          <h2 id="pre" className="serif section"><span className="sec-no">{no('pre')}</span>备菜处理</h2>
          <Steps list={r.prep} k="p" tone="herb" />
        </>}

        {r.steps.length > 0 && <>
          <h2 id="cook" className="serif section"><span className="sec-no hot">{no('cook')}</span>正式开做</h2>
          <Steps list={r.steps} k="c" />
        </>}

        <button
          className="link-danger"
          disabled={busy}
          onClick={async () => {
            if (confirm(`删除「${r.title}」？`)) {
              setBusy(true); setError('')
              try { await remove(r.id); nav('/', { replace: true }) }
              catch (cause) { setError(errorMessage(cause)); setBusy(false) }
            }
          }}
        >{busy ? '正在删除…' : '删除这道菜'}</button>
      </section>

      <div className="bottom-bar">
        <Link to={`/r/${r.id}/cook`} className="btn btn-primary btn-block">开始做菜</Link>
      </div>
    </main>
  )
}
