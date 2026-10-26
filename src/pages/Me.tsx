import { useStore } from '../lib/store'
import { MEMBERS } from '../lib/mock'

export default function Me() {
  const { user, logout, recipes } = useStore()
  const mine = recipes.filter((r) => r.author === user).length
  return (
    <main className="page has-tabs">
      <header className="home-head">
        <h1 className="serif display">我的</h1>
      </header>
      <section className="profile">
        <div className="avatar serif">{(user ?? '?').slice(0, 1).toUpperCase()}</div>
        <div>
          <p className="serif big">{user}</p>
          <p className="muted tiny">记了 {mine} 道 · 共 {recipes.length} 道</p>
        </div>
      </section>
      <section className="group">
        <p className="label">厨房成员</p>
        {MEMBERS.map((m) => (
          <div className="group-row" key={m}><span>{m}</span><span className="muted tiny">可编辑全部菜谱</span></div>
        ))}
      </section>
      <section className="group">
        <button className="group-row as-btn"><span>修改密码</span><span className="muted">›</span></button>
        <button className="group-row as-btn danger" onClick={logout}><span>退出登录</span></button>
      </section>
      <p className="muted tiny center">cookerY 原型 v0.2 · 数据暂存在本机</p>
    </main>
  )
}
