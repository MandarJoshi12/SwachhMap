import { useState } from 'react'
import api from '../api.js'

const TYPE_COLORS = {
  ticket_created: 'bg-blue-100 text-blue-700',
  status_update: 'bg-teal-100 text-teal-700',
  worker_assigned: 'bg-purple-100 text-purple-700',
  resolved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  escalation: 'bg-orange-100 text-orange-700',
}

const TYPE_ICONS = {
  ticket_created: '🎫',
  status_update: '🔄',
  worker_assigned: '👷',
  resolved: '✅',
  rejected: '❌',
  escalation: '⚠️',
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function timeAgo(dt) {
  if (!dt) return ''
  const diff = Date.now() - new Date(dt).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function Notifications() {
  const [inputPhone, setInputPhone] = useState('')
  const [phone, setPhone] = useState('')
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searched, setSearched] = useState(false)
  const [markingRead, setMarkingRead] = useState(new Set())

  async function handleLoad(e) {
    e.preventDefault()
    if (!inputPhone.trim()) return
    setLoading(true)
    setError(null)
    setSearched(false)
    try {
      const { data } = await api.get(`/notifications/${inputPhone.trim()}`)
      // Sort newest first
      const sorted = [...data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setNotifications(sorted)
      setPhone(inputPhone.trim())
      setSearched(true)
    } catch (err) {
      setError('Failed to load notifications. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function markRead(notif) {
    if (markingRead.has(notif.id)) return
    setMarkingRead(prev => new Set(prev).add(notif.id))
    try {
      await api.patch(`/notifications/${notif.id}/read`)
      setNotifications(prev =>
        prev.map(n => n.id === notif.id ? { ...n, read_status: 1 } : n)
      )
    } catch (err) {
      console.error('Failed to mark as read', err)
    } finally {
      setMarkingRead(prev => {
        const next = new Set(prev)
        next.delete(notif.id)
        return next
      })
    }
  }

  const unreadCount = notifications.filter(n => !n.read_status).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-teal-600 text-white px-6 py-4 shadow">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold">🔔 Notifications</h1>
            <p className="text-teal-100 text-sm">Updates on your reported issues</p>
          </div>
          {searched && unreadCount > 0 && (
            <span className="ml-auto bg-white text-teal-700 font-bold text-sm px-3 py-1 rounded-full">
              {unreadCount} unread
            </span>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Phone form */}
        <form onSubmit={handleLoad} className="bg-white rounded-xl shadow p-5 flex gap-3">
          <input
            type="tel"
            value={inputPhone}
            onChange={e => setInputPhone(e.target.value)}
            placeholder="Enter your phone number"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white font-semibold px-5 py-2 rounded-lg text-sm transition"
          >
            {loading ? 'Loading…' : 'Load Notifications'}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

        {/* Results */}
        {searched && (
          <>
            {notifications.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-10 text-center">
                <div className="text-5xl mb-3">🔕</div>
                <div className="text-gray-600 font-medium">No notifications</div>
                <div className="text-gray-400 text-sm mt-1">Nothing found for {phone}</div>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map(n => {
                  const isUnread = !n.read_status
                  return (
                    <div
                      key={n.id}
                      className={`bg-white rounded-xl shadow border-l-4 overflow-hidden transition ${
                        isUnread ? 'border-teal-500' : 'border-gray-200'
                      }`}
                    >
                      <div className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl mt-0.5 flex-shrink-0">
                            {TYPE_ICONS[n.type] || '📬'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap gap-2 items-center mb-1">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[n.type] || 'bg-gray-100 text-gray-600'}`}>
                                {n.type?.replace(/_/g, ' ').toUpperCase() || 'NOTIFICATION'}
                              </span>
                              {isUnread && (
                                <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" title="Unread"></span>
                              )}
                              {n.ticket_id && (
                                <span className="text-xs text-gray-400">Ticket #{n.ticket_id}</span>
                              )}
                            </div>
                            <p className={`text-sm ${isUnread ? 'font-medium text-gray-800' : 'text-gray-500'}`}>
                              {n.message}
                            </p>
                            <div className="mt-1.5 flex items-center justify-between">
                              <div className="text-xs text-gray-400" title={formatDate(n.created_at)}>
                                {timeAgo(n.created_at)} · {formatDate(n.created_at)}
                              </div>
                              {isUnread && (
                                <button
                                  onClick={() => markRead(n)}
                                  disabled={markingRead.has(n.id)}
                                  className="text-xs text-teal-600 hover:text-teal-800 font-medium disabled:opacity-50 transition"
                                >
                                  {markingRead.has(n.id) ? 'Marking…' : '✓ Mark as read'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Bulk mark all read */}
                {unreadCount > 1 && (
                  <button
                    onClick={() => notifications.filter(n => !n.read_status).forEach(markRead)}
                    className="w-full text-center text-sm text-teal-600 hover:text-teal-800 font-medium py-2 transition"
                  >
                    ✓ Mark all {unreadCount} as read
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
