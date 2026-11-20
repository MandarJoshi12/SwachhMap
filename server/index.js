'use strict';
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const initSqlJs = require('sql.js');

const app = express();
const PORT = 3001;
const DB_PATH = path.join(__dirname, 'db', 'swachhmap.db');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── Multer ────────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`),
});
const upload = multer({ storage });

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().replace('T', ' ').substring(0, 19);
}
function scatter(base, r) { return base + (Math.random() * r * 2 - r); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Main async init ───────────────────────────────────────────────────────────
async function main() {
  const SQL = await initSqlJs();

  let db;
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
    console.log('📂 Loaded existing DB from', DB_PATH);
  } else {
    db = new SQL.Database();
    console.log('🌱 No DB found – seeding...');
    require('./db/seed')(db);
    save(db);
    console.log('💾 DB saved to', DB_PATH);
  }

  function save(d) {
    fs.writeFileSync(DB_PATH, Buffer.from((d || db).export()));
  }

  // ── DB helpers ──────────────────────────────────────────────────────────────
  function dbAll(sql, params = []) {
    const stmt = db.prepare(sql);
    if (params.length) stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }

  function dbGet(sql, params = []) {
    return dbAll(sql, params)[0] || null;
  }

  function dbRun(sql, params = []) {
    db.run(sql, params);
    const r = db.exec('SELECT last_insert_rowid() AS id');
    const lid = r.length ? r[0].values[0][0] : null;
    save();
    return { lastInsertRowid: lid };
  }

  // ── Middleware ────────────────────────────────────────────────────────────────
  app.use(cors({ origin: 'http://localhost:5173' }));
  app.use(express.json());
  app.use('/uploads', express.static(UPLOADS_DIR));

  // ── Wards ─────────────────────────────────────────────────────────────────────
  app.get('/api/wards', (req, res) => {
    res.json(dbAll('SELECT * FROM wards'));
  });

  // ── Tickets ───────────────────────────────────────────────────────────────────
  app.get('/api/tickets', (req, res) => {
    let q = 'SELECT * FROM tickets WHERE 1=1';
    const params = [];
    if (req.query.ward_id) { q += ' AND ward_id=?'; params.push(Number(req.query.ward_id)); }
    if (req.query.status) { q += ' AND status=?'; params.push(req.query.status); }
    if (req.query.severity) { q += ' AND severity=?'; params.push(Number(req.query.severity)); }
    q += ' ORDER BY created_at DESC';
    res.json(dbAll(q, params));
  });

  app.post('/api/tickets', upload.single('photo_before'), (req, res) => {
    const { lat, lng, ward_id, category, duration_bucket, severity, citizen_phone } = req.body;
    const photo_before = req.file ? `/uploads/${req.file.filename}` : null;
    const sla = new Date(Date.now() + 72 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    const { lastInsertRowid } = dbRun(
      `INSERT INTO tickets (lat,lng,ward_id,category,duration_bucket,severity,status,photo_before,citizen_phone,sla_deadline)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [lat, lng, ward_id, category, duration_bucket, severity || 1, 'open', photo_before, citizen_phone, sla]
    );
    if (citizen_phone) {
      dbRun('INSERT INTO notifications (ticket_id,citizen_phone,message,type) VALUES (?,?,?,?)',
        [lastInsertRowid, citizen_phone, `Your complaint #${lastInsertRowid} has been registered.`, 'ticket_created']);
    }
    res.status(201).json(dbGet('SELECT * FROM tickets WHERE id=?', [lastInsertRowid]));
  });

  app.get('/api/tickets/:id', (req, res) => {
    const ticket = dbGet('SELECT * FROM tickets WHERE id=?', [Number(req.params.id)]);
    if (!ticket) return res.status(404).json({ error: 'Not found' });
    const complaints = dbAll('SELECT * FROM complaints WHERE ticket_id=?', [Number(req.params.id)]);
    res.json({ ...ticket, complaints });
  });

  app.patch('/api/tickets/:id', upload.single('photo_after'), (req, res) => {
    const tid = Number(req.params.id);
    const ticket = dbGet('SELECT * FROM tickets WHERE id=?', [tid]);
    if (!ticket) return res.status(404).json({ error: 'Not found' });
    const fields = { ...req.body };
    if (req.file) fields.photo_after = `/uploads/${req.file.filename}`;
    if (fields.status === 'cleaned') fields.resolved_at = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const sets = Object.keys(fields).map(k => `${k}=?`).join(', ');
    const values = Object.values(fields);
    dbRun(`UPDATE tickets SET ${sets} WHERE id=?`, [...values, tid]);
    if (fields.status === 'cleaned' && ticket.citizen_phone) {
      dbRun('INSERT INTO notifications (ticket_id,citizen_phone,message,type) VALUES (?,?,?,?)',
        [tid, ticket.citizen_phone, `Ticket #${tid} has been resolved!`, 'resolved']);
    }
    res.json(dbGet('SELECT * FROM tickets WHERE id=?', [tid]));
  });

  app.post('/api/tickets/:id/complaints', (req, res) => {
    const tid = Number(req.params.id);
    const { citizen_phone, text, type } = req.body;
    const { lastInsertRowid } = dbRun(
      'INSERT INTO complaints (ticket_id,citizen_phone,text,type) VALUES (?,?,?,?)',
      [tid, citizen_phone, text, type || 'followup']);
    dbRun('UPDATE tickets SET repeat_count=repeat_count+1 WHERE id=?', [tid]);
    res.status(201).json(dbGet('SELECT * FROM complaints WHERE id=?', [lastInsertRowid]));
  });

  // ── Notifications ─────────────────────────────────────────────────────────────
  app.get('/api/notifications/:phone', (req, res) => {
    res.json(dbAll('SELECT * FROM notifications WHERE citizen_phone=? ORDER BY created_at DESC', [req.params.phone]));
  });

  app.patch('/api/notifications/:id/read', (req, res) => {
    dbRun('UPDATE notifications SET read_status=1 WHERE id=?', [Number(req.params.id)]);
    res.json({ success: true });
  });

  // ── Workers ───────────────────────────────────────────────────────────────────
  app.get('/api/workers', (req, res) => {
    let q = 'SELECT * FROM workers WHERE 1=1';
    const params = [];
    if (req.query.ward_id) { q += ' AND ward_id=?'; params.push(Number(req.query.ward_id)); }
    res.json(dbAll(q, params));
  });

  // ── Fines ─────────────────────────────────────────────────────────────────────
  app.get('/api/fines', (req, res) => {
    res.json(dbAll(
      'SELECT f.*,w.name as worker_name FROM fines f JOIN workers w ON f.worker_id=w.id ORDER BY f.created_at DESC'
    ));
  });

  app.patch('/api/fines/:id', (req, res) => {
    const id = Number(req.params.id);
    dbRun(`UPDATE fines SET status=?, resolved_at=datetime('now') WHERE id=?`, [req.body.status, id]);
    res.json(dbGet('SELECT * FROM fines WHERE id=?', [id]));
  });

  // ── Health Alerts ─────────────────────────────────────────────────────────────
  app.get('/api/health-alerts', (req, res) => {
    res.json(dbAll(
      'SELECT ha.*,w.name as ward_name FROM health_alerts ha JOIN wards w ON ha.ward_id=w.id WHERE ha.is_active=1 ORDER BY ha.created_at DESC'
    ));
  });

  // ── Analytics ─────────────────────────────────────────────────────────────────
  app.get('/api/analytics/heatmap', (req, res) => {
    res.json(dbAll('SELECT lat,lng,severity FROM tickets').map(t => [t.lat, t.lng, t.severity]));
  });

  app.get('/api/analytics/ward-stats', (req, res) => {
    res.json(dbAll(`
      SELECT w.id, w.name,
        COUNT(t.id) as total,
        SUM(CASE WHEN t.status='cleaned' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN t.status IN ('open','assigned','in_progress') THEN 1 ELSE 0 END) as active,
        AVG(t.severity) as avg_severity
      FROM wards w LEFT JOIN tickets t ON w.id=t.ward_id
      GROUP BY w.id
    `));
  });

  app.get('/api/analytics/hotspots', (req, res) => {
    res.json(dbAll(`
      SELECT ward_id, category, COUNT(*) as count, AVG(severity) as avg_sev
      FROM tickets GROUP BY ward_id, category ORDER BY count DESC LIMIT 20
    `));
  });

  app.get('/api/analytics/worker-performance', (req, res) => {
    res.json(dbAll(`
      SELECT w.id,w.name,w.ward_id,w.performance_score,w.penalty_count,
        COUNT(t.id) as assigned_tickets,
        SUM(CASE WHEN t.status='cleaned' THEN 1 ELSE 0 END) as resolved_tickets
      FROM workers w LEFT JOIN tickets t ON w.id=t.assigned_worker_id
      GROUP BY w.id ORDER BY w.performance_score DESC
    `));
  });

  app.get('/api/analytics/trends', (req, res) => {
    res.json(dbAll(`
      SELECT date(created_at) as day, COUNT(*) as count, category
      FROM tickets WHERE created_at >= date('now','-30 days')
      GROUP BY day,category ORDER BY day ASC
    `));
  });

  // ── Admin Auth ────────────────────────────────────────────────────────────────
  app.post('/api/admin/login', (req, res) => {
    const { email, password } = req.body;
    const user = dbGet('SELECT * FROM users WHERE email=? AND password=?', [email, password]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, ward_id: user.ward_id } });
  });

  app.post('/api/admin/logout', (req, res) => { res.json({ success: true }); });

  // ── Simulate ──────────────────────────────────────────────────────────────────
  app.get('/api/simulate', (req, res) => {
    const categories = ['garbage_dump', 'overflowing_bin', 'blocked_drain', 'stagnant_water'];
    const durations = ['1-3 days', 'about a week', '2+ weeks'];
    const wards = dbAll('SELECT * FROM wards');
    const ward = pick(wards);
    const phone = `9${Math.floor(Math.random() * 900000000 + 100000000)}`;
    const sla = new Date(Date.now() + 72 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    const { lastInsertRowid } = dbRun(
      `INSERT INTO tickets (lat,lng,ward_id,category,duration_bucket,severity,status,citizen_phone,sla_deadline)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [scatter(ward.center_lat, 0.005), scatter(ward.center_lng, 0.005),
      ward.id, pick(categories), pick(durations), Math.ceil(Math.random() * 3),
        'open', phone, sla]
    );
    res.json({ message: 'Simulated ticket created', ticket_id: lastInsertRowid, ward: ward.name });
  });

  // ── Start ─────────────────────────────────────────────────────────────────────
  app.listen(PORT, () => {
    console.log(`🚀 SwachhMap server running at http://localhost:${PORT}`);
  });
}

main().catch(err => { console.error(err); process.exit(1); });
