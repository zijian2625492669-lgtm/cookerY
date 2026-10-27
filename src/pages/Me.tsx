import { useState, type FormEvent } from 'react'
import { useStore } from '../lib/store'
import { supabase, errorMessage } from '../lib/supabase'

export default function Me() {
  const { user, userId, logout, recipes, members, importLocal } = useStore()
  const [password, setPassword] = useState('')
  const [current, setCurrent] = useState('')
  const [repeat, setRepeat] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const mine = recipes.filter((r) => r.authorId === userId).length
  const act = async (fn: () => Promise<void>) => {
    setBusy(true); setMessage(''); setError('')
    try { await fn() } catch (cause) { setError(errorMessage(cause)) } finally { setBusy(false) }
  }
  const changePassword = (e: FormEvent) => {
    e.preventDefault()
    if (password !== repeat) return setError('两次新密码没有对上')
    if (new TextEncoder().encode(password).length > 72) return setError('新密码请不超过 72 字节')
    void act(async () => {
      const { data, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!data.user.email) throw new Error('暂时找不到登录账号，请重新登录后再试')
      const { error: authError } = await supabase.auth.signInWithPassword({ email: data.user.email, password: current })
      if (authError) throw authError
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setPassword(''); setCurrent(''); setRepeat(''); setShowPassword(false); setMessage('密码换好了')
    })
  }
  return <main className="page has-tabs">
    <header className="home-head"><h1 className="serif display">我的</h1></header>
    <section className="profile">
      <div className="avatar serif">{(user ?? '?').slice(0, 1).toUpperCase()}</div>
      <div><p className="serif big">{user}</p><p className="muted tiny">记了 {mine} 道 · 共 {recipes.length} 道</p></div>
    </section>
    <section className="group"><p className="label">厨房成员</p>
      {members.map((m) => <div className="group-row" key={m.user_id}><span>{m.display_name}</span><span className="muted tiny">可编辑全部菜谱</span></div>)}
    </section>
    <section className="group">
      <button className="group-row as-btn" disabled={busy} onClick={() => setShowPassword(!showPassword)}><span>修改密码</span><span className="muted">›</span></button>
      <button className="group-row as-btn" disabled={busy} onClick={() => {
        if (confirm('把这个浏览器里的旧菜谱导入共用厨房？原始数据会保留，重复导入不会覆盖云端菜谱，添加人会记为你。')) void act(async () => { const n = await importLocal(); setMessage(`已处理 ${n} 道旧菜谱，已经在共用厨房里的会自动跳过`) })
      }}><span>导入本机旧菜谱</span><span className="muted">›</span></button>
      <button className="group-row as-btn danger" disabled={busy} onClick={() => void act(logout)}><span>退出登录</span></button>
    </section>
    {showPassword && <form onSubmit={changePassword} className="settings-form">
      <label className="field"><span>现在的密码</span><input required type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} /></label>
      <label className="field"><span>新密码</span><input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      <label className="field"><span>再填一次新密码</span><input required type="password" minLength={8} autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} /></label>
      <button className="btn btn-primary" disabled={busy}>{busy ? '正在换密码…' : '换好密码'}</button>
    </form>}
    {error && <p role="alert" className="notice">{error}</p>}
    {message && <p role="status">{message}</p>}
    <p className="muted tiny center">cookerY v0.2 · 我们共用的厨房</p>
  </main>
}
