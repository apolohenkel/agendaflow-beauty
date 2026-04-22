'use client'

import { createContext, useCallback, useContext, useState } from 'react'

const ToastCtx = createContext({ toast: () => {} })

const STYLES = {
  success: 'bg-[#0A1A10] border-[#3DBA6E]/30 text-[#3DBA6E]',
  error:   'bg-[#1A0A0A] border-red-500/30    text-red-400',
  info:    'bg-[#1A1408] border-[#C8A96E]/30  text-[#C8A96E]',
}

const ICONS = {
  success: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  info: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
}

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])

  const toast = useCallback((message, variant = 'success') => {
    const id = Date.now() + Math.random()
    setItems((xs) => [...xs, { id, message, variant }])
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3200)
  }, [])

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[300] flex flex-col gap-2 pointer-events-none">
        {items.map((item) => (
          <div
            key={item.id}
            className={`
              flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-xl border
              text-sm font-medium shadow-xl shadow-black/50
              ${STYLES[item.variant] ?? STYLES.info}
            `}
          >
            <span className="shrink-0">{ICONS[item.variant]}</span>
            {item.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  return useContext(ToastCtx)
}
