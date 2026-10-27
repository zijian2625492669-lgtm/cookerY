import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { errorMessage } from '../lib/supabase'

export default function Login() {
  const { login, user } = useStore()
  const [username, setUsername] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (user) return <Navigate to="/" replace />
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError('')
    try { await login(username, pw) }
    catch (cause) { setError(errorMessage(cause)) }
    finally { setBusy(false) }
  }
  return <main className="login">
    <div className="login-mark"><img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" /></div>
    <h1 className="serif login-title">cookerY</h1>
    <p className="muted login-sub">我们俩的厨房手账</p>
    <form onSubmit={submit} className="login-form">
      <label className="field"><span>账号</span><input required autoCapitalize="none" autoComplete="username" placeholder="你的厨房账号" value={username} onChange={(e) => setUsername(e.target.value)} /></label>
      <label className="field"><span>密码</span><input required type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} /></label>
      {error && <p className="notice" role="alert">{error}</p>}
      <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{busy ? '正在进厨房…' : '进厨房'}</button>
      <p className="muted tiny center">只属于我们两个人的厨房</p>
    </form>
  </main>
}
