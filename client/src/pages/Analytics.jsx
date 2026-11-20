import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer,
} from 'recharts';
import api from '../api.js';

const CATEGORY_COLORS = {
  garbage_dump: '#ef4444',
  overflowing_bin: '#f97316',
  blocked_drain: '#3b82f6',
  stagnant_water: '#8b5cf6',
};

const CATEGORIES = Object.keys(CATEGORY_COLORS);

function ScoreBar({ score }) {
  const color =
    score > 75 ? 'bg-green-500' : score > 50 ? 'bg-yellow-400' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold w-8 text-right">{score}</span>
    </div>
  );
}

function SectionCard({ title, children, loading, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 ${className}`}>
      <h2 className="text-base font-semibold text-gray-700 mb-4">{title}</h2>
      {loading ? (
        <div className="flex items-center justify-center py-10 text-gray-400">
          <svg className="animate-spin h-5 w-5 mr-2 text-teal-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          Loading…
        </div>
      ) : children}
    </div>
  );
}

function WardStatsChart({ data }) {
  if (!data.length) return <p className="text-gray-400 text-sm">No data available.</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="ward_name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="active" name="Active" fill="#f97316" radius={[4, 4, 0, 0]} />
        <Bar dataKey="resolved" name="Resolved" fill="#0d9488" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function TrendsChart({ data }) {
  if (!data.length) return <p className="text-gray-400 text-sm">No trend data available.</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v?.slice(5)} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {CATEGORIES.map((cat) => (
          <Line
            key={cat}
            type="monotone"
            dataKey={cat}
            name={cat.replace(/_/g, ' ')}
            stroke={CATEGORY_COLORS[cat]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function HotspotsTable({ data }) {
  if (!data.length) return <p className="text-gray-400 text-sm">No hotspot data.</p>;
  const sorted = [...data].sort((a, b) => b.count - a.count);
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
          <tr>
            {['Ward', 'Category', 'Count', 'Avg Severity'].map((h) => (
              <th key={h} className="px-3 py-2 text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-3 py-2">{row.ward_name || row.ward_id}</td>
              <td className="px-3 py-2 capitalize">{row.category?.replace(/_/g, ' ')}</td>
              <td className="px-3 py-2 font-semibold text-orange-600">{row.count}</td>
              <td className="px-3 py-2">
                <span className={`font-semibold ${
                  row.avg_severity >= 2.5 ? 'text-red-600' : row.avg_severity >= 1.5 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {typeof row.avg_severity === 'number' ? row.avg_severity.toFixed(1) : row.avg_severity}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WorkerPerformanceTable({ data }) {
  if (!data.length) return <p className="text-gray-400 text-sm">No performance data.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
          <tr>
            {['Name', 'Score', 'Assigned', 'Resolved', 'Penalties'].map((h) => (
              <th key={h} className="px-3 py-2 text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((w, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-medium">{w.name}</td>
              <td className="px-3 py-2 w-36">
                <ScoreBar score={Math.round(w.performance_score ?? w.score ?? 0)} />
              </td>
              <td className="px-3 py-2">{w.assigned_tickets ?? w.assigned ?? '—'}</td>
              <td className="px-3 py-2">{w.resolved_tickets ?? w.resolved ?? '—'}</td>
              <td className="px-3 py-2">
                <span className={`font-semibold ${(w.penalty_count ?? 0) > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                  {w.penalty_count ?? 0}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Analytics() {
  const [wardStats, setWardStats] = useState([]);
  const [trends, setTrends] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [workerPerf, setWorkerPerf] = useState([]);

  const [loadingWardStats, setLoadingWardStats] = useState(true);
  const [loadingTrends, setLoadingTrends] = useState(true);
  const [loadingHotspots, setLoadingHotspots] = useState(true);
  const [loadingWorkerPerf, setLoadingWorkerPerf] = useState(true);

  useEffect(() => {
    api.get('/analytics/ward-stats')
      .then((r) => setWardStats(r.data))
      .catch(() => setWardStats([]))
      .finally(() => setLoadingWardStats(false));

    api.get('/analytics/trends')
      .then((r) => setTrends(r.data))
      .catch(() => setTrends([]))
      .finally(() => setLoadingTrends(false));

    api.get('/analytics/hotspots')
      .then((r) => setHotspots(r.data))
      .catch(() => setHotspots([]))
      .finally(() => setLoadingHotspots(false));

    api.get('/analytics/worker-performance')
      .then((r) => setWorkerPerf(r.data))
      .catch(() => setWorkerPerf([]))
      .finally(() => setLoadingWorkerPerf(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-teal-700 text-white px-6 py-5 shadow-md">
        <h1 className="text-2xl font-bold">Analytics – SwachhMap NMC</h1>
        <p className="text-teal-200 text-sm mt-0.5">Ward-level sanitation intelligence</p>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 2-col grid on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Ward Stats Bar Chart */}
          <SectionCard title="📊 Ward Ticket Overview" loading={loadingWardStats} className="md:col-span-2">
            <WardStatsChart data={wardStats} />
          </SectionCard>

          {/* Trends Line Chart */}
          <SectionCard title="📈 Ticket Trends (Last 30 Days)" loading={loadingTrends} className="md:col-span-2">
            <TrendsChart data={trends} />
          </SectionCard>

          {/* Hotspots Table */}
          <SectionCard title="🔥 Hotspots by Ward & Category" loading={loadingHotspots}>
            <HotspotsTable data={hotspots} />
          </SectionCard>

          {/* Worker Performance */}
          <SectionCard title="👷 Worker Performance" loading={loadingWorkerPerf}>
            <WorkerPerformanceTable data={workerPerf} />
          </SectionCard>

          {/* Heatmap Note */}
          <div className="md:col-span-2 bg-teal-50 border border-teal-200 rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🗺️</span>
              <div>
                <p className="font-semibold text-teal-800">Live Heatmap Available</p>
                <p className="text-sm text-teal-600">Real-time ticket density heatmap is on the main map view.</p>
              </div>
            </div>
            <Link
              to="/"
              className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition whitespace-nowrap"
            >
              Open Map →
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}
