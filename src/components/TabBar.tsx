import { NavLink, useNavigate } from 'react-router-dom'

export function TabBar() {
  const nav = useNavigate()
  return (
    <nav className="tabbar">
      <NavLink to="/" end className="tab">
        <svg viewBox="0 0 24 24"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM13 4h5.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H13z" /></svg>
        <span>菜谱</span>
      </NavLink>
      <button className="fab" onClick={() => nav('/new')} aria-label="新建菜谱">
        <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
      </button>
      <NavLink to="/me" className="tab">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5" /></svg>
        <span>我的</span>
      </NavLink>
    </nav>
  )
}
