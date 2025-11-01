'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { Package, MapPin, TrendingUp, Users } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const { isAuthenticated, user } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  if (!user) return null

  const isDonor = user.userType === 'donor'
  const isCollector = user.userType === 'ngo' || user.userType === 'volunteer'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-2xl font-bold text-gray-900">Second-Serve</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user.name}!</span>
              <button
                onClick={() => {
                  useAuthStore.getState().logout()
                  router.push('/')
                }}
                className="text-red-600 hover:text-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isDonor ? (
            <>
              <Link href="/dashboard/donor/create" className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center space-x-4">
                  <div className="bg-primary-100 p-4 rounded-lg">
                    <Package className="h-8 w-8 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Post Surplus Food</h3>
                    <p className="text-gray-600">List available food for donation</p>
                  </div>
                </div>
              </Link>

              <Link href="/dashboard/donor/posts" className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 p-4 rounded-lg">
                    <TrendingUp className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">My Posts</h3>
                    <p className="text-gray-600">View and manage your donations</p>
                  </div>
                </div>
              </Link>
            </>
          ) : (
            <>
              <Link href="/dashboard/collector/map" className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center space-x-4">
                  <div className="bg-primary-100 p-4 rounded-lg">
                    <MapPin className="h-8 w-8 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Find Food</h3>
                    <p className="text-gray-600">Discover nearby food donations</p>
                  </div>
                </div>
              </Link>

              <Link href="/dashboard/collector/pickups" className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 p-4 rounded-lg">
                    <Package className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">My Pickups</h3>
                    <p className="text-gray-600">View pickup history</p>
                  </div>
                </div>
              </Link>
            </>
          )}
        </div>

        {/* Analytics Link */}
        <div className="mt-6">
          <Link href="/analytics" className="card hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">View Analytics</h3>
                <p className="text-gray-600">Track your impact and environmental contribution</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary-600" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user.name}!
          </h1>
          <p className="text-gray-600">
            {isDonor ? 'Manage your food donations and track your impact' : 'Find nearby food donations and help your community'}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total {isDonor ? 'Donations' : 'Pickups'}</p>
                <p className="text-3xl font-bold text-gray-900">{user.stats?.totalDonations || user.stats?.totalPickups || 0}</p>
              </div>
              <Package className="h-12 w-12 text-primary-600" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Meals Served</p>
                <p className="text-3xl font-bold text-gray-900">{user.stats?.mealsServed || 0}</p>
              </div>
              <Users className="h-12 w-12 text-primary-600" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Rating</p>
                <p className="text-3xl font-bold text-gray-900">
                  {user.rating?.average?.toFixed(1) || 'N/A'}
                  {user.rating?.average && <span className="text-lg text-gray-600">/5</span>}
                </p>
              </div>
              <TrendingUp className="h-12 w-12 text-primary-600" />
            </div>
          </div>