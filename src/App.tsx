import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './lib/store'
import { TabBar } from './components/TabBar'
import Home from './pages/Home'
import Detail from './pages/Detail'
import Edit from './pages/Edit'
import Login from './pages/Login'
import Me from './pages/Me'
import Cook from './pages/Cook'

export default function App() {
  const { user, loading, error, refresh, logout } = useStore()
  const loc = useLocation()
  if (loading) return <main className="page"><p role="status">正在翻开菜谱本…</p></main>
  if (!user && error) return <main className="page">
    <p className="notice" role="alert">{error}</p>
    <button className="btn btn-ghost" onClick={() => void refresh().catch(() => {})}>再试一次</button>
    <button className="text-btn" onClick={() => void logout().catch(() => {})}>回到登录</button>
  </main>
  if (!user && loc.pathname !== '/login') return <Navigate to="/login" replace />
  const showTabs = ['/', '/me'].includes(loc.pathname)
  return (
    <div className="app">
      {error && <div className="notice sync-notice" role="alert">{error}<button onClick={() => void refresh().catch(() => {})}>再试一次</button></div>}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Home />} />
        <Route path="/r/:id" element={<Detail />} />
        <Route path="/r/:id/cook" element={<Cook />} />
        <Route path="/r/:id/edit" element={<Edit />} />
        <Route path="/new" element={<Edit />} />
        <Route path="/me" element={<Me />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showTabs && user && <TabBar />}
    </div>
  )
}
