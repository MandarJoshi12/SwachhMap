# SwachhMap 🗺️

> **A civic sanitation tracker for Nagpur Municipal Corporation (NMC)**  
> Built as a hackathon prototype for HackKumbh

---

## Project Overview

SwachhMap enables citizens to report sanitation issues (garbage dumps, blocked drains, overflowing bins, stagnant water) on a live map. Ward supervisors and NMC admins get a real-time dashboard to assign workers, track SLAs, issue fines, and monitor ward-level health.

---

## Feature → Requirement Mapping

| Feature | Description | Stack |
|---|---|---|
| Citizen issue reporting | Photo upload, geolocation, category selection | React, Leaflet, Express, Multer |
| Live heatmap | Density overlay of active tickets by severity | Leaflet.heat |
| Ward dashboard | Ticket list, worker assignment, status tracking | React, SQLite |
| SLA tracking | Auto-computed 72-hr deadline, breach alerts | Node.js, SQLite |
| Worker management | Performance score, penalty count, assignment | SQLite, Express |
| Fine system | Raise, track, and resolve fines against workers | SQLite REST API |
| Health alerts | Auto-detect clusters of tickets in a ward | SQLite queries |
| Analytics | Trends, hotspots, ward stats, worker performance | Recharts |
| Notifications | Real-time updates for citizens by phone number | SQLite, React |
| Admin auth | Email/password login for admins and supervisors | Express, React |
| Issue simulation | `GET /api/simulate` creates random ticket for demo | Express |

---

## Setup Instructions

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9

### 1. Install server dependencies
```bash
cd server
npm install
```

### 2. Install client dependencies
```bash
cd client
npm install
```

### 3. Seed the database (auto-runs on first server start)
```bash
cd server
node db/seed.js
```

### 4. Start the server
```bash
cd server
npm run dev
# Server: http://localhost:3001
```

### 5. Start the client (new terminal)
```bash
cd client
npm run dev
# Client: http://localhost:5173
```

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@nmc.gov.in | admin123 |
| Admin | manager@nmc.gov.in | manager123 |
| Supervisor (Dharampeth) | ramesh.patil@nmc.gov.in | supervisor123 |
| Supervisor (Sadar) | sunita.deshmukh@nmc.gov.in | supervisor123 |
| Supervisor (Mangalwari) | vijay.bhambere@nmc.gov.in | supervisor123 |
| Supervisor (Laxmi Nagar) | priya.nair@nmc.gov.in | supervisor123 |
| Supervisor (Ashi Nagar) | anil.meshram@nmc.gov.in | supervisor123 |
| Supervisor (Gandhibagh) | kavita.thakur@nmc.gov.in | supervisor123 |

---

## Seed Data Summary

- **6 wards**: Dharampeth, Sadar, Mangalwari, Laxmi Nagar, Ashi Nagar, Gandhibagh
- **21 sanitation workers** (3–4 per ward)
- **105 tickets**: 80 historical (cleaned), 25 active (open/assigned/in_progress)
- **15 notifications**, **5 pending fines**, **3 health alerts**

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/wards | All wards |
| GET | /api/tickets | All tickets (filterable) |
| POST | /api/tickets | File a new ticket |
| GET | /api/tickets/:id | Ticket detail + complaints |
| PATCH | /api/tickets/:id | Update ticket status |
| POST | /api/tickets/:id/complaints | Add complaint |
| GET | /api/notifications/:phone | Citizen notifications |
| PATCH | /api/notifications/:id/read | Mark as read |
| GET | /api/workers | All workers |
| GET | /api/fines | All fines |
| PATCH | /api/fines/:id | Update fine status |
| GET | /api/health-alerts | Active health alerts |
| GET | /api/analytics/heatmap | Lat/lng/severity array |
| GET | /api/analytics/ward-stats | Per-ward summary |
| GET | /api/analytics/hotspots | Category hotspots |
| GET | /api/analytics/worker-performance | Worker scores |
| GET | /api/analytics/trends | 30-day trend data |
| POST | /api/admin/login | Admin login |
| POST | /api/admin/logout | Admin logout |
| GET | /api/simulate | Create a random ticket |

---

## Project Structure

```
hackkumbh/
├── client/               # React + Vite + Tailwind frontend
│   ├── src/
│   │   ├── pages/        # CitizenHome, MyReports, Notifications, AdminDashboard, Analytics
│   │   ├── components/   # Navbar
│   │   ├── App.jsx
│   │   ├── api.js        # Axios instance
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
├── server/               # Node.js + Express + SQLite backend
│   ├── db/
│   │   ├── schema.sql    # Table definitions
│   │   ├── seed.js       # Seed script
│   │   └── swachhmap.db  # SQLite database (gitignored)
│   └── index.js          # Express app
├── uploads/              # Uploaded photos (gitignored)
├── .gitignore
└── README.md
```

---

## Future Scope

- **PWA / offline support** — service worker for unreliable network areas
- **OTP-based citizen auth** — mobile number verification via SMS
- **AI image classification** — auto-detect issue category from photo
- **WhatsApp bot integration** — citizens report via WhatsApp
- **Push notifications** — real-time browser notifications for supervisors
- **Route optimization** — ML-based daily worker route planning
- **Penalty auto-deduction** — integrate with NMC payroll API
- **Multi-language support** — Marathi, Hindi, English
- **IoT bin sensors** — auto-ticket when bin fill level > 80%
- **Gamification** — citizen leaderboard for most reports resolved

---

*Made with ❤️ for HackKumbh — Nagpur Municipal Corporation*
