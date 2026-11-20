import { useState, useEffect } from 'react'
import api from '../api.js'

const CATEGORY_ICONS = {
  garbage_dump: '🗑️',
  overflowing_bin: '🪣',
  blocked_drain: '🚧',
  stagnant_water: '💧',
}

const STATUS_COLORS = {
  open: 'bg-blue-100 text-blue-700',
  assigned: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-orange-100 text-orange-700',
  cleaned: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

const SEVERITY_COLORS = {
  1: 'bg-yellow-100 text-yellow-700',
  2: 'bg-orange-100 text-orange-700',
  3: 'bg-red-100 text-red-700',
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function TicketCard({ ticket, wards }) {
  const [expanded, setExpanded] = useState(false)
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const wardName = wards.find(w => w.id === ticket.ward_id)?.name || `Ward ${ticket.ward_id}`

  async function handleExpand() {
    if (expanded) { setExpanded(false); return }
    setExpanded(true)
    if (detail) return
    setLoadingDetail(true)
    try {
      const { data } = await api.get(`/tickets/${ticket.id}`)
      setDetail(data)
    } catch (e) {
      console.error('Failed to load ticket detail', e)
    } finally {
      setLoadingDetail(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden transition hover:shadow-md">
      <button
        onClick={handleExpand}
        className="w-full text-left px-5 py-4 flex items-start gap-4"
      >
        <span className="text-3xl mt-0.5">{CATEGORY_ICONS[ticket.category] || '📋'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-2 items-center mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[ticket.status] || 'bg-gray-100 text-gray-600'}`}>
              {ticket.status?.replace(/_/g, ' ').toUpperCase()}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SEVERITY_COLORS[ticket.severity] || 'bg-gray-100'}`}>
              {ticket.severity === 1 ? '🟡 Low' : ticket.severity === 2 ? '🟠 Medium' : '🔴 High'}
            </span>
            {ticket.repeat_count > 0 && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
                🔁 {ticket.repeat_count} repeats
              </span>
            )}
          </div>
          <div className="font-medium text-gray-800 capitalize">{ticket.category?.replace(/_/g, ' ')}</div>
          <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-3">
            <span>🏘️ {wardName}</span>
            <span>📅 {formatDate(ticket.created_at)}</span>
            <span>🎫 #{ticket.id}</span>
          </div>
        </div>
        <span className="text-gray-400 text-lg">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-3">
          {loadingDetail ? (
            <div className="text-sm text-gray-500 animate-pulse">Loading details…</div>
          ) : detail ? (
            <>
              {detail.photo_before && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Photo</div>
                  <img
                    src={`/uploads/${detail.photo_before}`}
                    alt="Issue photo"
                    className="max-h-48 rounded-lg border object-cover"
                    onError={e => { e.target.style.display = 'none' }}
                  />
                </div>
              )}

              {detail.sla_deadline && (
                <div className="text-sm">
                  <span className="text-gray-500">SLA Deadline: </span>
                  <span className="font-medium text-gray-700">{formatDate(detail.sla_deadline)}</span>
                </div>
              )}

              {detail.complaints && detail.complaints.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Complaints ({detail.complaints.length})</div>
                  <div className="space-y-2">
                    {detail.complaints.map(c => (
                      <div key={c.id} className="bg-white rounded-lg border px-3 py-2 text-sm">
                        <div className="font-medium text-gray-700">{c.text}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{formatDate(c.created_at)} · {c.type}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-gray-400">Could not load details.</div>
          )}
        </div>
      )}
    </div>
  )
}

export default function MyReports() {
  const [phone, setPhone] = useState('')
  const [inputPhone, setInputPhone] = useState('')
  const [tickets, setTickets] = useState([])
  const [wards, setWards] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    api.get('/wards').then(r => setWards(r.data)).catch(() => {})
  }, [])

  async function handleSearch(e) {
    e.preventDefault()
    if (!inputPhone.trim()) return
    setLoading(true)
    setError(null)
    setSearched(false)
    try {
      const { data } = await api.get('/tickets')
      const filtered = data.filter(t => t.citizen_phone === inputPhone.trim())
      setTickets(filtered)
      setPhone(inputPhone.trim())
      setSearched(true)
    } catch (err) {
      setError('Failed to fetch reports. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-teal-600 text-white px-6 py-4 shadow">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold">📋 My Reports</h1>
          <p className="text-teal-100 text-sm">Track your submitted sanitation issues</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Phone input */}
        <form onSubmit={handleSearch} className="bg-white rounded-xl shadow p-5 flex gap-3">
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
            {loading ? 'Loading…' : 'View My Reports'}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

        {/* Results */}
        {searched && (
          <>
            {tickets.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-10 text-center">
                <div className="text-5xl mb-3">🔍</div>
                <div className="text-gray-600 font-medium">No reports found for this number</div>
                <div className="text-gray-400 text-sm mt-1">{phone}</div>
              </div>
            ) : (
              <>
                <div className="text-sm text-gray-500 font-medium">{tickets.length} report{tickets.length !== 1 ? 's' : ''} found for <span className="text-teal-700 font-semibold">{phone}</span></div>
                <div className="space-y-3">
                  {tickets
                    .slice()
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .map(t => (
                      <TicketCard key={t.id} ticket={t} wards={wards} />
                    ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
