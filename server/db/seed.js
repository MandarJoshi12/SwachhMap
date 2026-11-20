'use strict';
/**
 * seed.js  –  exported as a function so index.js can call it at startup.
 * Accepts an already-initialised sql.js Database instance.
 */

module.exports = function seed(db) {
  // ── helpers ──────────────────────────────────────────────────────────────
  function run(sql, params) { db.run(sql, params); }
  function lastId() { return db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0]; }
  function exec(sql) { db.exec(sql); }
  function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().replace('T', ' ').substring(0, 19);
  }
  function scatter(base, r) { return base + (Math.random() * r * 2 - r); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // ── schema ────────────────────────────────────────────────────────────────
  exec(`
    CREATE TABLE IF NOT EXISTS wards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, zone TEXT,
      supervisor_id INTEGER, center_lat REAL, center_lng REAL
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL, ward_id INTEGER
    );
    CREATE TABLE IF NOT EXISTS workers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, phone TEXT, ward_id INTEGER,
      performance_score REAL DEFAULT 100, penalty_count INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lat REAL NOT NULL, lng REAL NOT NULL, ward_id INTEGER,
      category TEXT, duration_bucket TEXT, severity INTEGER,
      status TEXT DEFAULT 'open',
      photo_before TEXT, photo_after TEXT, citizen_phone TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT, assigned_worker_id INTEGER,
      assigned_supervisor_id INTEGER, merged_into INTEGER,
      sla_deadline TEXT, repeat_count INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER, citizen_phone TEXT,
      text TEXT, created_at TEXT DEFAULT (datetime('now')),
      type TEXT DEFAULT 'followup'
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER, citizen_phone TEXT,
      message TEXT, type TEXT,
      read_status INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS fines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER, worker_id INTEGER,
      supervisor_id INTEGER, ward_id INTEGER,
      amount REAL, reason TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')), resolved_at TEXT
    );
    CREATE TABLE IF NOT EXISTS health_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ward_id INTEGER, alert_type TEXT, risk_level TEXT,
      ticket_ids TEXT, created_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT, is_active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS penalty_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fine_id INTEGER, worker_id INTEGER,
      amount REAL, created_at TEXT DEFAULT (datetime('now')), notes TEXT
    );
  `);

  // ── wards ─────────────────────────────────────────────────────────────────
  const wardData = [
    { name: 'Dharampeth',  zone: 'West',    lat: 21.1458, lng: 79.0882 },
    { name: 'Sadar',       zone: 'Central', lat: 21.1500, lng: 79.0950 },
    { name: 'Mangalwari',  zone: 'Central', lat: 21.1380, lng: 79.0820 },
    { name: 'Laxmi Nagar', zone: 'East',    lat: 21.1520, lng: 79.1050 },
    { name: 'Ashi Nagar',  zone: 'West',    lat: 21.1350, lng: 79.0750 },
    { name: 'Gandhibagh',  zone: 'South',   lat: 21.1430, lng: 79.0780 },
  ];
  const wardIds = wardData.map(w => {
    run('INSERT INTO wards (name,zone,center_lat,center_lng) VALUES (?,?,?,?)',
      [w.name, w.zone, w.lat, w.lng]);
    return lastId();
  });

  // ── admins ────────────────────────────────────────────────────────────────
  run('INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)',
    ['Admin NMC', 'admin@nmc.gov.in', 'admin123', 'admin']);
  run('INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)',
    ['Manager NMC', 'manager@nmc.gov.in', 'manager123', 'admin']);

  // ── supervisors ───────────────────────────────────────────────────────────
  const supervisorDefs = [
    { name: 'Ramesh Patil',    email: 'ramesh.patil@nmc.gov.in' },
    { name: 'Sunita Deshmukh', email: 'sunita.deshmukh@nmc.gov.in' },
    { name: 'Vijay Bhambere',  email: 'vijay.bhambere@nmc.gov.in' },
    { name: 'Priya Nair',      email: 'priya.nair@nmc.gov.in' },
    { name: 'Anil Meshram',    email: 'anil.meshram@nmc.gov.in' },
    { name: 'Kavita Thakur',   email: 'kavita.thakur@nmc.gov.in' },
  ];
  const supervisorIds = supervisorDefs.map((s, i) => {
    run('INSERT INTO users (name,email,password,role,ward_id) VALUES (?,?,?,?,?)',
      [s.name, s.email, 'supervisor123', 'supervisor', wardIds[i]]);
    return lastId();
  });
  supervisorIds.forEach((sid, i) =>
    run('UPDATE wards SET supervisor_id=? WHERE id=?', [sid, wardIds[i]]));

  // ── workers ───────────────────────────────────────────────────────────────
  const workerNamesByWard = [
    ['Sanjay Waghmare', 'Deepak Fulzele', 'Raju Thakre', 'Nitin Dhande'],
    ['Sachin Bondre', 'Prakash Nande', 'Vishal Zade', 'Mahesh Ghode'],
    ['Arun Bhoyar', 'Suresh Rathod', 'Ganesh Dabhade'],
    ['Santosh Kale', 'Nilesh Patle', 'Pravin Yende', 'Rohit Bisen'],
    ['Dinesh Khobragade', 'Ramkumar Atram', 'Sunil Dhok'],
    ['Vinod Ramteke', 'Ashok Dongre', 'Hemant Ukey', 'Narendra Sarve'],
  ];
  const allWorkers = [];
  workerNamesByWard.forEach((names, wi) => {
    names.forEach(name => {
      const phone = `9${Math.floor(Math.random() * 900000000 + 100000000)}`;
      const score = Math.round(60 + Math.random() * 40);
      const penalties = Math.floor(Math.random() * 4);
      run('INSERT INTO workers (name,phone,ward_id,performance_score,penalty_count) VALUES (?,?,?,?,?)',
        [name, phone, wardIds[wi], score, penalties]);
      allWorkers.push({ id: lastId(), ward_id: wardIds[wi], wi });
    });
  });

  // ── tickets ───────────────────────────────────────────────────────────────
  const categories    = ['garbage_dump', 'overflowing_bin', 'blocked_drain', 'stagnant_water'];
  const durations     = ['1-3 days', 'about a week', '2+ weeks'];
  const phones        = ['9876543210', '9823456780', '9765432100', '9988776655', '9112233445'];
  const activeStatuses = ['open', 'assigned', 'in_progress'];

  const historicalTicketIds = [];
  for (let i = 0; i < 80; i++) {
    const wi = i % 6;
    const ward = wardData[wi];
    const daysCreated = Math.floor(Math.random() * 23) + 7;
    const daysResolved = Math.floor(Math.random() * (daysCreated - 1));
    const workersInWard = allWorkers.filter(w => w.wi === wi);
    const worker = pick(workersInWard);
    run(`INSERT INTO tickets
      (lat,lng,ward_id,category,duration_bucket,severity,status,
       citizen_phone,created_at,resolved_at,assigned_worker_id,
       assigned_supervisor_id,sla_deadline,repeat_count)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [scatter(ward.lat, 0.005), scatter(ward.lng, 0.005), wardIds[wi],
       pick(categories), pick(durations), Math.ceil(Math.random() * 3),
       'cleaned', pick(phones), daysAgo(daysCreated), daysAgo(daysResolved),
       worker.id, supervisorIds[wi], daysAgo(daysCreated - 3), 0]);
    historicalTicketIds.push(lastId());
  }

  const activeTicketIds = [];
  for (let i = 0; i < 25; i++) {
    const wi = i % 6;
    const ward = wardData[wi];
    const daysCreated = Math.floor(Math.random() * 7) + 1;
    const workersInWard = allWorkers.filter(w => w.wi === wi);
    const worker = pick(workersInWard);
    const status = pick(activeStatuses);
    run(`INSERT INTO tickets
      (lat,lng,ward_id,category,duration_bucket,severity,status,
       citizen_phone,created_at,assigned_worker_id,
       assigned_supervisor_id,sla_deadline,repeat_count)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [scatter(ward.lat, 0.005), scatter(ward.lng, 0.005), wardIds[wi],
       pick(categories), pick(durations), Math.ceil(Math.random() * 3),
       status, pick(phones), daysAgo(daysCreated),
       status !== 'open' ? worker.id : null,
       status !== 'open' ? supervisorIds[wi] : null,
       daysAgo(daysCreated - 3),
       Math.floor(Math.random() * 3)]);
    activeTicketIds.push(lastId());
  }

  // ── complaints ────────────────────────────────────────────────────────────
  const complaintTexts = [
    'Still not cleaned, very bad smell.',
    'Garbage overflowing again. Please act fast.',
    'Water stagnant for days now.',
    'Drain completely blocked near school.',
    'Health hazard – please resolve urgently.',
  ];
  activeTicketIds.slice(0, 10).forEach((tid, i) => {
    run('INSERT INTO complaints (ticket_id,citizen_phone,text,type,created_at) VALUES (?,?,?,?,?)',
      [tid, pick(phones), pick(complaintTexts), 'followup', daysAgo(2)]);
    if (i < 4) {
      run('INSERT INTO complaints (ticket_id,citizen_phone,text,type,created_at) VALUES (?,?,?,?,?)',
        [tid, pick(phones), pick(complaintTexts), 'escalation', daysAgo(1)]);
    }
  });

  // ── notifications ─────────────────────────────────────────────────────────
  const notifMsgs = [
    'Your complaint has been registered.',
    'A worker has been assigned to your complaint.',
    'Your complaint has been resolved.',
    'SLA deadline approaching for your complaint.',
    'Issue escalated to ward supervisor.',
    'Ticket is now in progress.',
    'Health alert issued for your ward.',
    'Worker en route to your location.',
    'Complaint marked as cleaned – please verify.',
    'Follow-up complaint received.',
    'Inspection scheduled for tomorrow.',
    'Drain cleared – water flow restored.',
    'Garbage dump cleared by sanitation team.',
    'Your area prioritised for today.',
    'Ward supervisor has reviewed your ticket.',
  ];
  for (let i = 0; i < 15; i++) {
    const tid = i < 10 ? activeTicketIds[i] : historicalTicketIds[i - 10];
    run('INSERT INTO notifications (ticket_id,citizen_phone,message,type,read_status,created_at) VALUES (?,?,?,?,?,?)',
      [tid, pick(phones), notifMsgs[i], 'update', i < 5 ? 0 : 1, daysAgo(Math.floor(Math.random() * 5))]);
  }

  // ── fines ─────────────────────────────────────────────────────────────────
  const reasons = [
    'Failed to clean within SLA window',
    'Negligence in waste collection duty',
    'Missed scheduled route',
    'Repeated complaints not addressed',
    'Stagnant water unattended for >3 days',
  ];
  for (let i = 0; i < 5; i++) {
    const worker = allWorkers[i * 4];
    const tid = activeTicketIds[i];
    run('INSERT INTO fines (ticket_id,worker_id,supervisor_id,ward_id,amount,reason,status,created_at) VALUES (?,?,?,?,?,?,?,?)',
      [tid, worker.id, supervisorIds[worker.wi], worker.ward_id, 500, reasons[i], 'pending', daysAgo(2)]);
    const fineId = lastId();
    run('INSERT INTO penalty_ledger (fine_id,worker_id,amount,notes) VALUES (?,?,?,?)',
      [fineId, worker.id, 500, `Auto-generated: ${reasons[i]}`]);
  }

  // ── health alerts ─────────────────────────────────────────────────────────
  run('INSERT INTO health_alerts (ward_id,alert_type,risk_level,ticket_ids,created_at,is_active) VALUES (?,?,?,?,?,?)',
    [wardIds[0], 'stagnant_water_cluster', 'high', JSON.stringify(activeTicketIds.slice(0,3)), daysAgo(2), 1]);
  run('INSERT INTO health_alerts (ward_id,alert_type,risk_level,ticket_ids,created_at,is_active) VALUES (?,?,?,?,?,?)',
    [wardIds[2], 'garbage_overflow', 'medium', JSON.stringify(activeTicketIds.slice(3,6)), daysAgo(4), 1]);
  run('INSERT INTO health_alerts (ward_id,alert_type,risk_level,ticket_ids,created_at,is_active) VALUES (?,?,?,?,?,?)',
    [wardIds[4], 'drain_blockage', 'critical', JSON.stringify(activeTicketIds.slice(6,8)), daysAgo(1), 1]);

  console.log('✅ SwachhMap DB seeded successfully!');
  console.log(`   Wards: ${wardIds.length}, Workers: ${allWorkers.length}`);
  console.log(`   Tickets: 105 (80 historical + 25 active)`);
  console.log(`   Notifications: 15, Fines: 5, Health alerts: 3`);
};
