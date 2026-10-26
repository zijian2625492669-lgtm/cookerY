import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'

export default function Login() {
  const { login } = useStore()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    login(email || 'zijian@example.com')
    nav('/', { replace: true })
  }
  return (
    <main className="login">
      <div className="login-mark">
        <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
      </div>
      <h1 className="serif login-title">cookerY</h1>
      <p className="muted login-sub">我们俩的厨房手账</p>
      <form onSubmit={submit} className="login-form">
        <label className="field">
          <span>邮箱</span>
          <input type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>密码</span>
          <input type="password" autoComplete="current-password" placeholder="••••••••" value={pw} onChange={(e) => setPw(e.target.value)} />
        </label>
        <button className="btn btn-primary btn-block" type="submit">进厨房</button>
        <p className="muted tiny center">原型阶段，随便填就能进</p>
      </form>
    </main>
  )
}
