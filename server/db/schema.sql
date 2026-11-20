-- SwachhMap Database Schema

CREATE TABLE IF NOT EXISTS wards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  zone TEXT,
  supervisor_id INTEGER,
  center_lat REAL,
  center_lng REAL
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin','supervisor')) NOT NULL,
  ward_id INTEGER REFERENCES wards(id)
);

CREATE TABLE IF NOT EXISTS workers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  ward_id INTEGER REFERENCES wards(id),
  performance_score REAL DEFAULT 100,
  penalty_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  ward_id INTEGER REFERENCES wards(id),
  category TEXT CHECK(category IN ('garbage_dump','overflowing_bin','blocked_drain','stagnant_water')),
  duration_bucket TEXT,
  severity INTEGER CHECK(severity IN (1,2,3)),
  status TEXT CHECK(status IN ('open','assigned','in_progress','cleaned','rejected')) DEFAULT 'open',
  photo_before TEXT,
  photo_after TEXT,
  citizen_phone TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  resolved_at TEXT,
  assigned_worker_id INTEGER REFERENCES workers(id),
  assigned_supervisor_id INTEGER REFERENCES users(id),
  merged_into INTEGER REFERENCES tickets(id),
  sla_deadline TEXT,
  repeat_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS complaints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER REFERENCES tickets(id),
  citizen_phone TEXT,
  text TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  type TEXT DEFAULT 'followup'
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER REFERENCES tickets(id),
  citizen_phone TEXT,
  message TEXT,
  type TEXT,
  read_status INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER REFERENCES tickets(id),
  worker_id INTEGER REFERENCES workers(id),
  supervisor_id INTEGER REFERENCES users(id),
  ward_id INTEGER REFERENCES wards(id),
  amount REAL,
  reason TEXT,
  status TEXT CHECK(status IN ('pending','paid','waived')) DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS health_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ward_id INTEGER REFERENCES wards(id),
  alert_type TEXT,
  risk_level TEXT CHECK(risk_level IN ('low','medium','high','critical')),
  ticket_ids TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  resolved_at TEXT,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS penalty_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fine_id INTEGER REFERENCES fines(id),
  worker_id INTEGER REFERENCES workers(id),
  amount REAL,
  created_at TEXT DEFAULT (datetime('now')),
  notes TEXT
);
