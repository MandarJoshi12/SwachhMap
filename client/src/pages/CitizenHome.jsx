import React from 'react'

export default function CitizenHome() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white p-6 shadow-md">
        <h1 className="text-3xl font-bold">SwachhMap 🗺️</h1>
        <p className="mt-1 text-primary-100">Report civic issues in your ward</p>
      </header>
      <main className="p-4 max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow p-6 mt-4">
          <h2 className="text-xl font-semibold text-gray-700">Welcome to SwachhMap</h2>
          <p className="mt-2 text-gray-500">
            Help keep Nagpur clean by reporting garbage dumps, blocked drains,
            overflowing bins, and stagnant water in your area.
          </p>
          <button className="mt-4 w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition">
            + Report an Issue
          </button>
        </div>
      </main>
    </div>
  )
}
