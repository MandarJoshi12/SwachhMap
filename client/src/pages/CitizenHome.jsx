import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../api.js'

// Fix leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function severityIcon(severity) {
  const color = severity === 1 ? '#facc15' : severity === 2 ? '#f97316' : '#ef4444'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
    <path fill="${color}" stroke="#333" stroke-width="1.5" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z"/>
    <circle fill="white" cx="12.5" cy="12.5" r="5"/>
  </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  })
}

function LocationPicker({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng)
    },
  })
  return null
}

const NAGPUR = [21.1458, 79.0882]

const CATEGORIES = [
  { value: 'garbage_dump', label: '🗑️ Garbage Dump' },
  { value: 'overflowing_bin', label: '🪣 Overflowing Bin' },
  { value: 'blocked_drain', label: '🚧 Blocked Drain' },
  { value: 'stagnant_water', label: '💧 Stagnant Water' },
]

const DURATIONS = [
  { value: '1-3 days', label: '1-3 days' },
  { value: 'about a week', label: 'About a week' },
  { value: '2+ weeks', label: '2+ weeks' },
]

export default function CitizenHome() {
  const [tickets, setTickets] = useState([])
  const [wards, setWards] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [toast, setToast] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [phone, setPhone] = useState('')
  const [category, setCategory] = useState('garbage_dump')
  const [duration, setDuration] = useState('1-3 days')
  const [severity, setSeverity] = useState(2)
  const [wardId, setWardId] = useState('')
  const [photo, setPhoto] = useState(null)

  useEffect(() => {
    fetchTickets()
    fetchWards()
  }, [])

  async function fetchTickets() {
    try {
      const statuses = ['open', 'assigned', 'in_progress']
      const results = await Promise.all(
        statuses.map(s => api.get(`/tickets?status=${s}`))
      )
      setTickets(results.flatMap(r => r.data))
    } catch (e) {
      console.error('Failed to load tickets', e)
    }
  }

  async function fetchWards() {
    try {
      const { data } = await api.get('/wards')
      setWards(data)
      if (data.length > 0) setWardId(data[0].id)
    } catch (e) {
      console.error('Failed to load wards', e)
    }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!phone.trim()) return
    setSubmitting(true)
    try {
      const lat = selectedLocation ? selectedLocation.lat : NAGPUR[0]
      const lng = selectedLocation ? selectedLocation.lng : NAGPUR[1]
      const fd = new FormData()
      fd.append('citizen_phone', phone)
      fd.append('category', category)
      fd.append('duration_bucket', duration)
      fd.append('severity', severity)
      fd.append('ward_id', wardId)
      fd.append('lat', lat)
      fd.append('lng', lng)
      if (photo) fd.append('photo_before', photo)

      const { data } = await api.post('/tickets', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      showToast(`Ticket #${data.id} reported! 🎉`)
      setModalOpen(false)
      resetForm()
      fetchTickets()
    } catch (err) {
      showToast('Failed to submit. Please try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setPhone('')
    setCategory('garbage_dump')
    setDuration('1-3 days')
    setSeverity(2)
    setPhoto(null)
    setSelectedLocation(null)
    if (wards.length > 0) setWardId(wards[0].id)
  }

  function formatDate(dt) {
    if (!dt) return ''
    return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-teal-600 text-white px-6 py-4 shadow">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <span className="text-3xl">🗺️</span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">SwachhMap</h1>
            <p className="text-teal-100 text-sm">Nagpur Municipal Corporation · Citizen Sanitation Tracker</p>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="relative">
        <MapContainer
          center={NAGPUR}
          zoom={13}
          style={{ height: '50vh', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {modalOpen && (
            <LocationPicker onLocationSelect={setSelectedLocation} />
          )}
          {tickets.map(t => (
            <Marker
              key={t.id}
              position={[t.lat, t.lng]}
              icon={severityIcon(t.severity)}
            >
              <Popup>
                <div className="text-sm space-y-1">
                  <div className="font-semibold capitalize">{t.category?.replace(/_/g, ' ')}</div>
                  <div>Status: <span className="font-medium capitalize">{t.status}</span></div>
                  <div>Severity: {t.severity}</div>
                  <div>Reported: {formatDate(t.created_at)}</div>
                  {t.repeat_count > 0 && (
                    <div className="text-orange-600 font-medium">🔁 {t.repeat_count} repeat complaints</div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow px-3 py-2 text-xs space-y-1">
          <div className="font-semibold text-gray-700 mb-1">Severity</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span> Low</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-400 inline-block"></span> Medium</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> High</div>
        </div>

        {/* Report button */}
        <button
          onClick={() => setModalOpen(true)}
          className="absolute bottom-4 right-4 z-[1000] bg-teal-600 hover:bg-teal-700 text-white font-semibold px-5 py-3 rounded-full shadow-lg flex items-center gap-2 transition"
        >
          <span className="text-lg">📍</span> Report Issue
        </button>
      </div>

      {/* Stats bar */}
      <div className="max-w-5xl mx-auto px-6 py-4">
        <div className="flex gap-4 flex-wrap">
          <div className="bg-white rounded-lg shadow px-4 py-2 text-center">
            <div className="text-2xl font-bold text-teal-700">{tickets.length}</div>
            <div className="text-xs text-gray-500">Active Issues</div>
          </div>
          <div className="bg-white rounded-lg shadow px-4 py-2 text-center">
            <div className="text-2xl font-bold text-red-500">{tickets.filter(t => t.severity === 3).length}</div>
            <div className="text-xs text-gray-500">High Severity</div>
          </div>
          <div className="bg-white rounded-lg shadow px-4 py-2 text-center">
            <div className="text-2xl font-bold text-orange-500">{tickets.filter(t => t.status === 'in_progress').length}</div>
            <div className="text-xs text-gray-500">In Progress</div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-lg shadow-lg text-white font-medium transition-all ${toast.type === 'error' ? 'bg-red-500' : 'bg-teal-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-black/50">
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-teal-600 text-white px-6 py-4 rounded-t-2xl sm:rounded-t-2xl flex justify-between items-center">
              <h2 className="text-lg font-bold">📍 Report a Sanitation Issue</h2>
              <button onClick={() => { setModalOpen(false); resetForm() }} className="text-teal-100 hover:text-white text-2xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Location hint */}
              <div className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 text-sm text-teal-800 flex items-center gap-2">
                <span>🖱️</span>
                <span>
                  {selectedLocation
                    ? `📌 Location set: ${selectedLocation.lat.toFixed(5)}, ${selectedLocation.lng.toFixed(5)}`
                    : 'Click on the map behind this dialog to set issue location'}
                </span>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">How long has this been here?</label>
                <select
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {DURATIONS.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              {/* Severity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
                <div className="flex gap-3">
                  {[1, 2, 3].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSeverity(s)}
                      className={`flex-1 py-2 rounded-lg border-2 font-medium text-sm transition ${
                        severity === s
                          ? s === 1 ? 'border-yellow-400 bg-yellow-50 text-yellow-700'
                            : s === 2 ? 'border-orange-400 bg-orange-50 text-orange-700'
                            : 'border-red-400 bg-red-50 text-red-700'
                          : 'border-gray-200 bg-gray-50 text-gray-500'
                      }`}
                    >
                      {s === 1 ? '🟡 Low' : s === 2 ? '🟠 Medium' : '🔴 High'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ward */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ward</label>
                <select
                  value={wardId}
                  onChange={e => setWardId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {wards.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              {/* Photo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Photo (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setPhoto(e.target.files[0] || null)}
                  className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white font-semibold py-3 rounded-lg transition"
              >
                {submitting ? 'Submitting…' : '📤 Submit Report'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
