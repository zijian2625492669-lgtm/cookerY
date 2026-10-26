import type { ReactNode } from 'react'

// 固定在顶部的按钮栏：返回、编辑等，不随页面滚动
export function TopBar({ left, right, title, solid }: { left?: ReactNode; right?: ReactNode; title?: string; solid?: boolean }) {
  return (
    <header className={`topbar ${solid ? 'solid' : ''}`}>
      <div className="topbar-side">{left}</div>
      {title && <h1 className="serif topbar-title">{title}</h1>}
      <div className="topbar-side right">{right}</div>
    </header>
  )
}

export const BackIcon = () => <svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7" /></svg>
export const EditIcon = () => <svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" /></svg>
export const CloseIcon = () => <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>
