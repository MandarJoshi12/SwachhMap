import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import CitizenHome from './pages/CitizenHome.jsx'
import MyReports from './pages/MyReports.jsx'
import Notifications from './pages/Notifications.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import Analytics from './pages/Analytics.jsx'
import Navbar from './components/Navbar.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<CitizenHome />} />
        <Route path="/reports" element={<MyReports />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/analytics" element={<Analytics />} />
      </Routes>
    </BrowserRouter>
  )
}
