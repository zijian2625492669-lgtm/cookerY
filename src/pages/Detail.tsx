import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Cover } from '../components/Cover'

export default function Detail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { recipes, remove } = useStore()
  const r = recipes.find((x) => x.id === id)
  const [done, setDone] = useState<Set<number>>(new Set())
  if (!r) return <main className="page"><p>找不到这道菜</p></main>

  const toggle = (i: number) =>
    setDone((s) => {
      const n = new Set(s)
      n.has(i) ? n.delete(i) : n.add(i)
      return n
    })

  return (
    <main className="detail">
      <div className="hero">
        <Cover emoji={r.emoji} palette={r.palette} size="hero" />
        <button className="icon-btn hero-back" onClick={() => nav(-1)} aria-label="返回">
          <svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7" /></svg>
        </button>
        <Link to={`/r/${r.id}/edit`} className="icon-btn hero-edit" aria-label="编辑">
          <svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" /></svg>
        </Link>
      </div>

      <section className="sheet">
        <h1 className="serif title">{r.title}</h1>
        <p className="muted">{r.description}</p>
        <div className="meta">
          <span className="pill">⏱ {r.minutes} 分钟</span>
          <span className="pill">🍽 {r.servings} 人份</span>
          <span className="pill">✍️ {r.author}</span>
        </div>
        <div className="tags">{r.tags.map((t) => <span key={t} className="tag">#{t}</span>)}</div>

        <h2 className="serif section">食材</h2>
        <ul className="ingredients">
          {r.ingredients.map((g, i) => (
            <li key={i} className={done.has(i) ? 'checked' : ''} onClick={() => toggle(i)}>
              <span className="check" />
              <span className="ing-name">{g.name}</span>
              <span className="ing-amt">{g.amount}{g.unit}</span>
            </li>
          ))}
        </ul>

        <h2 className="serif section">步骤</h2>
        <ol className="steps">
          {r.steps.map((s, i) => (
            <li key={i}>
              <span className="step-no serif">{i + 1}</span>
              <p>{s}</p>
            </li>
          ))}
        </ol>

        <button
          className="link-danger"
          onClick={() => {
            if (confirm(`删除「${r.title}」？`)) {
              remove(r.id)
              nav('/', { replace: true })
            }
          }}
        >删除这道菜</button>
      </section>

      <div className="bottom-bar">
        <Link to={`/r/${r.id}/cook`} className="btn btn-primary btn-block">开始做菜</Link>
      </div>
    </main>
  )
}
