import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'

const NotificationContext = createContext(null)
const readKey = accountId => `appointeefy-notification-reads-${accountId}`
const loadReadIds = accountId => {
  try { return JSON.parse(localStorage.getItem(readKey(accountId)) || '[]') }
  catch { return [] }
}

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const accountId = user?.role === 'admin' ? user.account_id : null
  const [notifications, setNotifications] = useState([])
  const [readIds, setReadIds] = useState([])
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!accountId) { setNotifications([]); return }
    const { data, error: fetchError } = await supabase.from('notifications')
      .select('id, type, title, message, to_account_id, image_url, sent_at')
      .or(`to_account_id.is.null,to_account_id.eq.${accountId}`)
      .order('sent_at', { ascending: false })
    if (fetchError) { setError('Notifications could not be loaded.'); return }
    setError('')
    setNotifications((data || []).map(row => ({
      id: row.id, type: row.type, title: row.title, message: row.message,
      to: row.to_account_id || 'all', sentAt: row.sent_at, image: row.image_url,
    })))
  }, [accountId])

  useEffect(() => {
    if (!accountId) return undefined
    setReadIds(loadReadIds(accountId))
    refresh()
    const channel = supabase.channel(`provider-notifications-${accountId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, refresh)
      .subscribe()
    const timer = setInterval(refresh, 30000)
    return () => { clearInterval(timer); supabase.removeChannel(channel) }
  }, [accountId, refresh])

  const markAsRead = (id, targetAccountId) => {
    if (!accountId || accountId !== targetAccountId) return
    setReadIds(previous => {
      if (previous.includes(id)) return previous
      const next = [...previous, id]
      localStorage.setItem(readKey(accountId), JSON.stringify(next))
      return next
    })
  }
  const getForAccount = targetAccountId => targetAccountId === accountId
    ? notifications.map(item => ({ ...item, readBy: readIds.includes(item.id) ? [accountId] : [] }))
    : []
  const getUnreadCount = targetAccountId => getForAccount(targetAccountId).filter(item => item.readBy.length === 0).length

  return <NotificationContext.Provider value={{ notifications, error, refresh, markAsRead, getForAccount, getUnreadCount }}>
    {children}
  </NotificationContext.Provider>
}

export const useNotifications = () => useContext(NotificationContext)
