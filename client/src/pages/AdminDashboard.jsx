import { useState, useEffect } from 'react';
import api from '../api.js';

const STATUSES = ['open', 'assigned', 'in_progress', 'cleaned', 'closed'];

function SeverityBadge({ level }) {
  const map = {
    3: 'bg-red-100 text-red-800',
    2: 'bg-yellow-100 text-yellow-800',
    1: 'bg-green-100 text-green-800',
  };
  const labels = { 3: 'High', 2: 'Medium', 1: 'Low' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[level] || 'bg-gray-100 text-gray-700'}`}>
      {labels[level] || level}
    </span>
  );
}

function HealthAlertsBanner({ alerts, onDismiss }) {
  if (!alerts.length) return null;
  return (
    <div className="space-y-2 mb-4">
      {alerts.map((a) => (
        <div
          key={a.id}
          className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium shadow-sm ${
            a.risk_level === 'high' ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-orange-100 text-orange-800 border border-orange-300'
          }`}
        >
          <span>
            ⚠️ <strong>{a.alert_type}</strong> — Risk: <strong>{a.risk_level}</strong> — Ward: {a.ward_name || a.ward_id}
          </span>
          <button
            onClick={() => onDismiss(a.id)}
            className="ml-4 text-xs underline opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}

function SummaryCards({ tickets, fines }) {
  const total = tickets.length;
  const active = tickets.filter((t) => ['open', 'assigned', 'in_progress'].includes(t.status)).length;
  const resolved = tickets.filter((t) => ['cleaned', 'closed'].includes(t.status)).length;
  const pendingFines = fines.filter((f) => f.status === 'pending').length;

  const cards = [
    { label: 'Total Tickets', value: total, color: 'text-teal-700', bg: 'bg-teal-50' },
    { label: 'Active', value: active, color: 'text-orange-700', bg: 'bg-orange-50' },
    { label: 'Resolved', value: resolved, color: 'text-green-700', bg: 'bg-green-50' },
    { label: 'Pending Fines', value: pendingFines, color: 'text-red-700', bg: 'bg-red-50' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {cards.map((c) => (
        <div key={c.label} className={`${c.bg} rounded-xl p-4 shadow-sm`}>
          <p className="text-xs text-gray-500 uppercase tracking-wide">{c.label}</p>
          <p className={`text-3xl font-bold mt-1 ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

function FinesTable({ fines, onUpdate }) {
  const [loading, setLoading] = useState({});

  const handleAction = async (id, status) => {
    setLoading((p) => ({ ...p, [id]: true }));
    try {
      await api.patch(`/fines/${id}`, { status });
      onUpdate();
    } catch (e) {
      alert('Failed to update fine');
    } finally {
      setLoading((p) => ({ ...p, [id]: false }));
    }
  };

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-gray-700 mb-3">Fines</h2>
      <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              {['Worker', 'Amount (₹)', 'Reason', 'Status', 'Created', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {fines.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No fines found.</td></tr>
            )}
            {fines.map((f) => (
              <tr key={f.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{f.worker_name || f.worker_id}</td>
                <td className="px-4 py-3 font-medium">₹{f.amount}</td>
                <td className="px-4 py-3 max-w-xs truncate">{f.reason}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    f.status === 'paid' ? 'bg-green-100 text-green-800'
                    : f.status === 'waived' ? 'bg-gray-100 text-gray-600'
                    : 'bg-red-100 text-red-700'
                  }`}>
                    {f.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{f.created_at ? new Date(f.created_at).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3 space-x-2">
                  {f.status === 'pending' && (
                    <>
                      <button
                        disabled={loading[f.id]}
                        onClick={() => handleAction(f.id, 'paid')}
                        className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                      >
                        Mark Paid
                      </button>
                      <button
                        disabled={loading[f.id]}
                        onClick={() => handleAction(f.id, 'waived')}
                        className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 disabled:opacity-50"
                      >
                        Waive
                      </button>
                    </>
                  )}
                  {f.status !== 'pending' && <span className="text-gray-400 text-xs italic">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TicketsTable({ tickets, workers, onTicketUpdated }) {
  const [updating, setUpdating] = useState({});

  const rowBg = (severity) => {
    if (severity === 3) return 'bg-red-50';
    if (severity === 2) return 'bg-yellow-50';
    return 'bg-white';
  };

  const patchTicket = async (id, payload) => {
    setUpdating((p) => ({ ...p, [id]: true }));
    try {
      await api.patch(`/tickets/${id}`, payload);
      onTicketUpdated();
    } catch (e) {
      alert('Failed to update ticket');
    } finally {
      setUpdating((p) => ({ ...p, [id]: false }));
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
          <tr>
            {['ID', 'Category', 'Severity', 'Status', 'Location', 'Created', 'Assigned Worker', 'Actions'].map((h) => (
              <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {tickets.length === 0 && (
            <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No tickets for this ward.</td></tr>
          )}
          {tickets.map((t) => (
            <tr key={t.id} className={`${rowBg(t.severity)} hover:brightness-95 transition`}>
              <td className="px-4 py-3 font-mono text-xs text-gray-500">{String(t.id).slice(0, 8)}</td>
              <td className="px-4 py-3 capitalize">{t.category?.replace(/_/g, ' ')}</td>
              <td className="px-4 py-3"><SeverityBadge level={t.severity} /></td>
              <td className="px-4 py-3">
                <select
                  disabled={updating[t.id]}
                  value={t.status}
                  onChange={(e) => patchTicket(t.id, { status: e.target.value })}
                  className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">{t.lat?.toFixed(4)}, {t.lng?.toFixed(4)}</td>
              <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
              </td>
              <td className="px-4 py-3">
                <select
                  disabled={updating[t.id]}
                  value={t.assigned_worker_id || ''}
                  onChange={(e) => patchTicket(t.id, { assigned_worker_id: e.target.value || null })}
                  className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 max-w-[140px]"
                >
                  <option value="">— Unassigned —</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3">
                {updating[t.id] && <span className="text-xs text-teal-600 italic">Saving…</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/admin/login', { email, password });
      onLogin(res.data.user || res.data);
    } catch {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-teal-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mb-3">🗺</div>
          <h1 className="text-2xl font-bold text-gray-800">NMC Admin</h1>
          <p className="text-sm text-gray-500 mt-1">SwachhMap — Nagpur Municipal Corporation</p>
        </div>
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@nmc.gov.in"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg py-2.5 text-sm transition disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p className="text-xs text-gray-400 text-center mt-4">admin@nmc.gov.in / admin123</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [user, setUser] = useState(null);

  // Data state
  const [wards, setWards] = useState([]);
  const [selectedWardId, setSelectedWardId] = useState('all');
  const [tickets, setTickets] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [fines, setFines] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());

  // Loading states
  const [loadingWards, setLoadingWards] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [loadingFines, setLoadingFines] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  // Fetch wards once logged in
  useEffect(() => {
    if (!user) return;
    setLoadingWards(true);
    api.get('/wards')
      .then((r) => setWards(r.data))
      .catch(() => {})
      .finally(() => setLoadingWards(false));
  }, [user]);

  // Fetch tickets when ward changes
  useEffect(() => {
    if (!user) return;
    fetchTickets();
  }, [user, selectedWardId]);

  // Fetch workers when ward changes
  useEffect(() => {
    if (!user) return;
    fetchWorkers();
  }, [user, selectedWardId]);

  // Fetch fines & alerts once
  useEffect(() => {
    if (!user) return;
    fetchFines();
    fetchAlerts();
  }, [user]);

  const fetchTickets = () => {
    setLoadingTickets(true);
    const params = selectedWardId !== 'all' ? { ward_id: selectedWardId } : {};
    api.get('/tickets', { params })
      .then((r) => setTickets(r.data))
      .catch(() => setTickets([]))
      .finally(() => setLoadingTickets(false));
  };

  const fetchWorkers = () => {
    setLoadingWorkers(true);
    const params = selectedWardId !== 'all' ? { ward_id: selectedWardId } : {};
    api.get('/workers', { params })
      .then((r) => setWorkers(r.data))
      .catch(() => setWorkers([]))
      .finally(() => setLoadingWorkers(false));
  };

  const fetchFines = () => {
    setLoadingFines(true);
    api.get('/fines')
      .then((r) => setFines(r.data))
      .catch(() => setFines([]))
      .finally(() => setLoadingFines(false));
  };

  const fetchAlerts = () => {
    setLoadingAlerts(true);
    api.get('/health-alerts')
      .then((r) => setAlerts(r.data))
      .catch(() => setAlerts([]))
      .finally(() => setLoadingAlerts(false));
  };

  const handleLogout = async () => {
    try { await api.post('/admin/logout'); } catch {}
    setUser(null);
  };

  const visibleAlerts = alerts.filter(
    (a) => a.is_active && !dismissedAlerts.has(a.id)
  );

  if (!user) {
    return <LoginForm onLogin={setUser} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-teal-700 text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🗺</span>
          <div>
            <h1 className="text-xl font-bold leading-tight">NMC Admin – SwachhMap</h1>
            <p className="text-teal-200 text-xs">Nagpur Municipal Corporation</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-teal-100">👤 {user.name || user.email}</span>
          <button
            onClick={handleLogout}
            className="bg-teal-800 hover:bg-teal-900 text-white text-sm px-3 py-1.5 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Health Alerts */}
        {loadingAlerts ? (
          <p className="text-sm text-gray-400 mb-4">Loading alerts…</p>
        ) : (
          <HealthAlertsBanner
            alerts={visibleAlerts}
            onDismiss={(id) => setDismissedAlerts((prev) => new Set([...prev, id]))}
          />
        )}

        {/* Ward Tabs */}
        <div className="mb-6">
          {loadingWards ? (
            <p className="text-sm text-gray-400">Loading wards…</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedWardId('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  selectedWardId === 'all'
                    ? 'bg-teal-600 text-white shadow'
                    : 'bg-white border border-gray-300 text-gray-600 hover:bg-teal-50'
                }`}
              >
                All Wards
              </button>
              {wards.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setSelectedWardId(w.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                    selectedWardId === w.id
                      ? 'bg-teal-600 text-white shadow'
                      : 'bg-white border border-gray-300 text-gray-600 hover:bg-teal-50'
                  }`}
                >
                  {w.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Summary Cards */}
        {loadingFines ? (
          <div className="text-sm text-gray-400 mb-6">Loading summary…</div>
        ) : (
          <SummaryCards tickets={tickets} fines={fines} />
        )}

        {/* Tickets Table */}
        <div className="mb-2">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">
            Tickets
            {selectedWardId !== 'all' && wards.find((w) => w.id === selectedWardId)
              ? ` — ${wards.find((w) => w.id === selectedWardId).name}`
              : ''}
          </h2>
          {loadingTickets || loadingWorkers ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <svg className="animate-spin h-6 w-6 mr-2 text-teal-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Loading tickets…
            </div>
          ) : (
            <TicketsTable
              tickets={tickets}
              workers={workers}
              onTicketUpdated={fetchTickets}
            />
          )}
        </div>

        {/* Fines Section */}
        {loadingFines ? (
          <p className="text-sm text-gray-400 mt-8">Loading fines…</p>
        ) : (
          <FinesTable fines={fines} onUpdate={fetchFines} />
        )}
      </main>
    </div>
  );
}
