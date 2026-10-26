import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../lib/store'

// 做菜模式：一屏一步、大字、尽量保持屏幕常亮
export default function Cook() {
  const { id } = useParams()
  const nav = useNavigate()
  const r = useStore().recipes.find((x) => x.id === id)
  const [i, setI] = useState(0)

  useEffect(() => {
    let lock: any
    const nav2 = navigator as any
    nav2.wakeLock?.request?.('screen').then((l: any) => (lock = l)).catch(() => {})
    return () => lock?.release?.()
  }, [])

  if (!r) return null
  const last = i === r.steps.length - 1
  return (
    <main className="cook">
      <header className="cook-head">
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="退出">
          <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
        <span className="muted">{r.title}</span>
        <span className="muted">{i + 1}/{r.steps.length}</span>
      </header>
      <div className="progress"><div style={{ width: `${((i + 1) / r.steps.length) * 100}%` }} /></div>
      <section className="cook-step">
        <span className="cook-no serif">{String(i + 1).padStart(2, '0')}</span>
        <p className="serif">{r.steps[i]}</p>
      </section>
      <footer className="cook-nav">
        <button className="btn btn-ghost" disabled={i === 0} onClick={() => setI(i - 1)}>上一步</button>
        <button className="btn btn-primary" onClick={() => (last ? nav(-1) : setI(i + 1))}>{last ? '完成 🎉' : '下一步'}</button>
      </footer>
    </main>
  )
}
