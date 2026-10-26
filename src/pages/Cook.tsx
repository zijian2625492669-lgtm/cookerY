import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import { TopBar, CloseIcon } from '../components/TopBar'

type Card = { phase: '备菜' | '开做'; no: number; total: number; text: string; extra?: string }

// 做菜模式：先备菜（含调酱料），再正式开做；一屏一步、大字、尽量保持屏幕常亮
export default function Cook() {
  const { id } = useParams()
  const nav = useNavigate()
  const r = useStore().recipes.find((x) => x.id === id)
  const [i, setI] = useState(0)

  useEffect(() => {
    let lock: any
    const n = navigator as any
    n.wakeLock?.request?.('screen').then((l: any) => (lock = l)).catch(() => {})
    return () => lock?.release?.()
  }, [])

  const cards = useMemo<Card[]>(() => {
    if (!r) return []
    const prep = [...r.prep]
    const sauceText = r.sauce.map((g) => `${g.name} ${g.amount}${g.unit}`).join('、')
    // 有酱料但备菜里没写到“调”，就自动补一步
    if (r.sauce.length && !prep.some((p) => p.includes('调'))) prep.push('调酱料' + (r.sauceNote ? `：${r.sauceNote}` : '，混合均匀备用。'))
    const p: Card[] = prep.map((text, j) => ({
      phase: '备菜', no: j + 1, total: prep.length, text,
      extra: r.sauce.length && /酱|汁|调/.test(text) ? sauceText : undefined,
    }))
    const seas = r.seasonings.map((g) => g.name).join(' · ')
    const c: Card[] = r.steps.map((text, j) => ({ phase: '开做', no: j + 1, total: r.steps.length, text, extra: j === 0 && seas ? `调料：${seas}` : undefined }))
    return [...p, ...c]
  }, [r])

  if (!r || cards.length === 0) return null
  const card = cards[i]
  const last = i === cards.length - 1
  return (
    <main className="cook">
      <TopBar
        solid
        left={<button className="icon-btn" onClick={() => nav(-1)} aria-label="退出"><CloseIcon /></button>}
        title={r.title}
        right={<span className="muted tiny">{i + 1}/{cards.length}</span>}
      />
      <div className="progress"><div style={{ width: `${((i + 1) / cards.length) * 100}%` }} /></div>
      <section className="cook-step" key={i}>
        <span className={`phase ${card.phase === '开做' ? 'hot' : ''}`}>{card.phase} {card.no}/{card.total}</span>
        <span className="cook-no serif">{String(card.no).padStart(2, '0')}</span>
        <p className="serif">{card.text}</p>
        {card.extra && <p className="cook-extra">{card.extra}</p>}
      </section>
      <footer className="cook-nav">
        <button className="btn btn-ghost" disabled={i === 0} onClick={() => setI(i - 1)}>上一步</button>
        <button className="btn btn-primary" onClick={() => (last ? nav(-1) : setI(i + 1))}>
          {last ? '完成 🎉' : cards[i + 1].phase !== card.phase ? '备好了，开火 🔥' : '下一步'}
        </button>
      </footer>
    </main>
  )
}
