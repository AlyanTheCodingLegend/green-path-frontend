'use client'

import { useState, useEffect } from 'react'
import { api, City, CityData, RouteComparison } from '@/lib/api'
import DashboardCharts from '@/components/DashboardCharts'
import { Loader2, BarChart3, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
    const [cities, setCities] = useState<City[]>([])
    const [selectedCity, setSelectedCity] = useState<City | null>(null)
    const [cityData, setCityData] = useState<CityData | null>(null)
    const [loadingCity, setLoadingCity] = useState(false)
    const [routeData, setRouteData] = useState<RouteComparison | null>(null)
    const [loadingRoute, setLoadingRoute] = useState(false)

    useEffect(() => {
        loadCities()
    }, [])

    useEffect(() => {
        if (selectedCity) {
            loadCityData()
        }
    }, [selectedCity])

    async function loadCities() {
        try {
            const citiesList = await api.getCities()
            setCities(citiesList)
            if (citiesList.length > 0) setSelectedCity(citiesList[0])
        } catch (error) {
            console.error('Failed to load cities:', error)
        }
    }

    async function loadCityData() {
        if (!selectedCity) return
        setLoadingCity(true)
        setRouteData(null)
        try {
            const data = await api.getCityData(selectedCity.name)
            setCityData(data)
        } catch (error) {
            console.error('Failed to load city data:', error)
        } finally {
            setLoadingCity(false)
        }
    }

    async function generateSampleRoute() {
        if (!selectedCity || !cityData) return

        setLoadingRoute(true)
        try {
            // Pick two random hexagons as start/end points
            const features = cityData.hexagons.features
            if (features.length < 2) return

            const startHex = features[Math.floor(Math.random() * features.length)]
            const endHex = features[Math.floor(Math.random() * features.length)]

            // Get coordinates (centroid of hexagon)
            // GeoJSON Polygon coordinates are [[[x,y], ...]]
            // We'll just take the first point of the polygon for simplicity
            const startCoords = startHex.geometry.coordinates[0][0]
            const endCoords = endHex.geometry.coordinates[0][0]

            // GeoJSON is [lon, lat], API expects lat, lon
            const comparison = await api.compareRoutes(
                selectedCity.name,
                startCoords[1], startCoords[0],
                endCoords[1], endCoords[0]
            )

            setRouteData(comparison)
        } catch (error) {
            console.error('Failed to generate route:', error)
            alert('Could not find a valid route between random points. Try again.')
        } finally {
            setLoadingRoute(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                                <BarChart3 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
                                <p className="text-sm text-gray-600">Urban Heat & Walkability Insights</p>
                            </div>
                        </div>
                        <Link href="/" className="text-blue-600 hover:underline font-medium">
                            Back to Map
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6">
                {/* Controls */}
                <div className="bg-white rounded-lg shadow-sm border p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-semibold text-gray-700">City:</label>
                        <div className="flex gap-2">
                            {cities.map((city) => (
                                <button
                                    key={city.name}
                                    onClick={() => setSelectedCity(city)}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedCity?.name === city.name
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {city.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={generateSampleRoute}
                        disabled={!cityData || loadingRoute}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loadingRoute ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Generate Sample Route Analysis
                    </button>
                </div>

                {/* Content */}
                {loadingCity ? (
                    <div className="flex flex-col items-center justify-center h-96">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                        <p className="text-gray-500">Loading city analytics...</p>
                    </div>
                ) : cityData ? (
                    <DashboardCharts cityData={cityData} routeData={routeData} />
                ) : (
                    <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                        <p className="text-gray-500">Select a city to view analytics</p>
                    </div>
                )}
            </main>
        </div>
    )
}
