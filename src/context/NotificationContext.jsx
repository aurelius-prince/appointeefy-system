import { createContext, useContext, useState, useEffect } from 'react'

const NotificationContext = createContext(null)

const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString() }

const INIT_NOTIFICATIONS = [
  { id: 1, type: 'announcement', title: 'System Maintenance', message: 'Scheduled maintenance on Sunday 2am-4am. Expect brief downtime.', to: 'all', toName: 'All Providers', sentAt: daysAgo(2), readBy: [], image: null },
  { id: 2, type: 'message', title: 'Subscription Reminder', message: 'Hi Juan! Your subscription expires soon. Please renew to avoid interruption.', to: 'CAL-00002', toName: 'Juan Dela Cruz', sentAt: daysAgo(1), readBy: [], image: null },
  { id: 3, type: 'announcement', title: 'New Feature: Calendar Sync', message: 'You can now sync your calendar with Google Calendar. Check your settings!', to: 'all', toName: 'All Providers', sentAt: daysAgo(5), readBy: ['CAL-00002'], image: null },
]

const STORAGE_KEY = 'cal_notifications'

const loadNotifs = () => {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v ? JSON.parse(v) : INIT_NOTIFICATIONS
  } catch { return INIT_NOTIFICATIONS }
}

const saveNotifs = (data) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch {}
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(loadNotifs)

  useEffect(() => { saveNotifs(notifications) }, [notifications])

  const sendNotification = ({ type, title, message, to, toName, image }) => {
    const notif = {
      id: Date.now(),
      type,
      title,
      message,
      to,
      toName,
      image: image || null,
      sentAt: new Date().toISOString(),
      readBy: [],
    }
    setNotifications((prev) => [notif, ...prev])
  }

  const deleteNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  // Called by admin when they read a notification
  const markAsRead = (notifId, accountId) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notifId && !n.readBy.includes(accountId)
          ? { ...n, readBy: [...n.readBy, accountId] }
          : n
      )
    )
  }

  // Get notifications for a specific provider account
  const getForAccount = (accountId) =>
    notifications.filter((n) => n.to === 'all' || n.to === accountId)

  const getUnreadCount = (accountId) =>
    getForAccount(accountId).filter((n) => !n.readBy.includes(accountId)).length

  return (
    <NotificationContext.Provider value={{
      notifications,
      sendNotification,
      deleteNotification,
      markAsRead,
      getForAccount,
      getUnreadCount,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
