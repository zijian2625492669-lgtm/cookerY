import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { ALL_TAGS } from '../lib/mock'
import { Cover } from '../components/Cover'

function greet() {
  const h = new Date().getHours()
  if (h < 10) return '早上好'
  if (h < 14) return '中午吃点什么'
  if (h < 18) return '下午好'
  return '今晚做点什么'
}

export default function Home() {
  const { recipes, user } = useStore()
  const [q, setQ] = useState('')
  const [tag, setTag] = useState<string | null>(null)

  const list = useMemo(() => {
    const k = q.trim()
    return recipes.filter(
      (r) =>
        (!tag || r.tags.includes(tag)) &&
        (!k || r.title.includes(k) || r.ingredients.some((i) => i.name.includes(k))),
    )
  }, [recipes, q, tag])

  return (
    <main className="page has-tabs">
      <header className="home-head">
        <p className="muted">{greet()}，{user}</p>
        <h1 className="serif display">我们的菜谱</h1>
      </header>

      <div className="search">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
        <input type="search" placeholder="搜菜名或食材，比如“鸡蛋”" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="chips" role="tablist">
        <button className={`chip ${!tag ? 'on' : ''}`} onClick={() => setTag(null)}>全部</button>
        {ALL_TAGS.map((t) => (
          <button key={t} className={`chip ${tag === t ? 'on' : ''}`} onClick={() => setTag(tag === t ? null : t)}>{t}</button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="empty">
          <p className="serif">还没有这道菜</p>
          <Link to="/new" className="btn btn-ghost">记一道新的</Link>
        </div>
      ) : (
        <div className="grid">
          {list.map((r) => (
            <Link to={`/r/${r.id}`} key={r.id} className="card">
              <Cover emoji={r.emoji} palette={r.palette} />
              <div className="card-body">
                <h3 className="serif">{r.title}</h3>
                <p className="muted tiny">{r.minutes} 分钟 · {r.author}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
