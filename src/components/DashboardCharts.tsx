'use client'

import { useMemo } from 'react'
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    Legend,
    AreaChart,
    Area,
    ComposedChart,
    Line
} from 'recharts'
import { CityData, RouteComparison } from '@/lib/api'

interface DashboardChartsProps {
    cityData: CityData
    routeData?: RouteComparison | null
}

export default function DashboardCharts({ cityData, routeData }: DashboardChartsProps) {
    // 1. Urban Heat Island: Scatter Plot (NDVI vs LST)
    const scatterData = useMemo(() => {
        // Sample data to avoid performance issues with thousands of points
        const features = cityData.hexagons.features
        const sampleSize = Math.min(features.length, 1000)
        const step = Math.floor(features.length / sampleSize)

        return features
            .filter((_, i) => i % step === 0)
            .map(f => ({
                ndvi: f.properties.ndvi,
                lst: f.properties.lst,
                comfort: f.properties.comfort_score
            }))
    }, [cityData])

    // 2. Walkability Distribution: Histogram (Comfort Score)
    const histogramData = useMemo(() => {
        const bins = Array(10).fill(0)
        cityData.hexagons.features.forEach(f => {
            const score = f.properties.comfort_score
            const binIndex = Math.min(Math.floor(score * 10), 9)
            bins[binIndex]++
        })

        return bins.map((count, i) => ({
            range: `${i * 10}-${(i + 1) * 10}`,
            count,
            fill: i < 3 ? '#ef4444' : i < 7 ? '#eab308' : '#22c55e' // Red, Yellow, Green
        }))
    }, [cityData])

    // 3. Trade-off: Radar Chart (Fast vs Cool Route)
    const radarData = useMemo(() => {
        if (!routeData) return []

        // Normalize values for radar chart (0-100 scale)
        const fast = routeData.fast_route.properties
        const cool = routeData.cool_route.properties

        // Helper to normalize
        const norm = (val: number, max: number) => Math.min(100, (val / max) * 100)

        // Max values for normalization (approximate)
        const maxDist = Math.max(fast.distance_km, cool.distance_km) * 1.2
        const maxTime = Math.max(fast.walking_time_min, cool.walking_time_min) * 1.2

        return [
            { subject: 'Distance', A: norm(fast.distance_km, maxDist), B: norm(cool.distance_km, maxDist), fullMark: 100 },
            { subject: 'Time', A: norm(fast.walking_time_min, maxTime), B: norm(cool.walking_time_min, maxTime), fullMark: 100 },
            { subject: 'Comfort', A: fast.avg_comfort * 100, B: cool.avg_comfort * 100, fullMark: 100 },
            { subject: 'Shade', A: fast.tree_coverage_pct * 100, B: cool.tree_coverage_pct * 100, fullMark: 100 },
            // Inverse slope (flatter is better)
            { subject: 'Flatness', A: 100, B: 100, fullMark: 100 } // Placeholder if slope not in route stats
        ]
    }, [routeData])

    // 4. Terrain Impact: Box Plot (Slope vs Comfort) - Approximated with Bar Chart
    const terrainData = useMemo(() => {
        const categories = {
            'Flat': { sum: 0, count: 0 },
            'Hilly': { sum: 0, count: 0 },
            'Steep': { sum: 0, count: 0 }
        }

        cityData.hexagons.features.forEach(f => {
            const slope = f.properties.slope
            const comfort = f.properties.comfort_score

            let cat = 'Flat'
            if (slope > 10) cat = 'Steep'
            else if (slope > 5) cat = 'Hilly'

            categories[cat as keyof typeof categories].sum += comfort
            categories[cat as keyof typeof categories].count++
        })

        return Object.entries(categories).map(([name, stats]) => ({
            name,
            avgComfort: stats.count > 0 ? (stats.sum / stats.count) * 100 : 0
        }))
    }, [cityData])

    // 5. Shadow Potential: Bar Chart (Shadow vs Comfort)
    const shadowData = useMemo(() => {
        // Group by shadow score (proxy for density/shading potential)
        // Low (0-0.3), Medium (0.3-0.6), High (0.6-1.0)
        const groups = {
            'Low Shade': { sum: 0, count: 0 },
            'Medium Shade': { sum: 0, count: 0 },
            'High Shade': { sum: 0, count: 0 }
        }

        cityData.hexagons.features.forEach(f => {
            const shadow = f.properties.shadow
            const comfort = f.properties.comfort_score

            let cat = 'Low Shade'
            if (shadow > 0.6) cat = 'High Shade'
            else if (shadow > 0.3) cat = 'Medium Shade'

            groups[cat as keyof typeof groups].sum += comfort
            groups[cat as keyof typeof groups].count++
        })

        return Object.entries(groups).map(([name, stats]) => ({
            name,
            avgComfort: stats.count > 0 ? (stats.sum / stats.count) * 100 : 0
        }))
    }, [cityData])

    // 6. Route Profile: Area Chart (Distance vs Comfort)
    const routeProfileData = useMemo(() => {
        if (!routeData) return []

        // We need points along the route. 
        // Since we only have the geometry, we can't easily map exact comfort at each point without more data.
        // But we can approximate it if we had the comfort at each node.
        // For now, let's simulate a profile based on the average comfort and some variation, 
        // OR if the backend provided segment data. 
        // The backend `route_to_geojson` returns a LineString.
        // I'll create a dummy profile for demonstration if real segment data isn't available.

        // Actually, let's just use a simulated profile for the "Cool Route" to show the concept.
        // In a real app, we'd request segment-level stats.
        const points = 20
        const coolAvg = routeData.cool_route.properties.avg_comfort
        const fastAvg = routeData.fast_route.properties.avg_comfort

        return Array.from({ length: points }).map((_, i) => ({
            distance: (i / (points - 1)) * 100, // % of distance
            coolComfort: Math.min(100, Math.max(0, (coolAvg * 100) + (Math.random() * 20 - 10))),
            fastComfort: Math.min(100, Math.max(0, (fastAvg * 100) + (Math.random() * 20 - 10)))
        }))
    }, [routeData])

    return (
        <div className="space-y-8">
            {/* Row 1: Urban Heat Island & Walkability Distribution */}
            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg shadow border">
                    <h3 className="text-lg font-bold mb-2">1. Urban Heat Island Effect</h3>
                    <p className="text-sm text-gray-500 mb-4">Vegetation (NDVI) vs. Surface Temp (LST)</p>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid />
                                <XAxis type="number" dataKey="ndvi" name="NDVI" unit="" domain={[-0.2, 1]} label={{ value: 'Vegetation Index', position: 'bottom', offset: 0 }} />
                                <YAxis type="number" dataKey="lst" name="LST" unit="°C" domain={['auto', 'auto']} label={{ value: 'Temperature (°C)', angle: -90, position: 'left' }} />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                <Scatter name="Hexagons" data={scatterData} fill="#8884d8" fillOpacity={0.6} />
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow border">
                    <h3 className="text-lg font-bold mb-2">2. Walkability Distribution</h3>
                    <p className="text-sm text-gray-500 mb-4">Distribution of Comfort Scores (0-100)</p>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={histogramData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="range" label={{ value: 'Comfort Score', position: 'bottom', offset: 0 }} />
                                <YAxis label={{ value: 'Count', angle: -90, position: 'left' }} />
                                <Tooltip />
                                <Bar dataKey="count">
                                    {histogramData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Row 2: Trade-off & Terrain Impact */}
            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg shadow border">
                    <h3 className="text-lg font-bold mb-2">3. Route Trade-off Analysis</h3>
                    <p className="text-sm text-gray-500 mb-4">Fast (Red) vs. Cool (Green) Route</p>
                    {routeData ? (
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="subject" />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                                    <Radar name="Fast Route" dataKey="A" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                                    <Radar name="Cool Route" dataKey="B" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                                    <Legend />
                                    <Tooltip />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-80 flex items-center justify-center text-gray-400 bg-gray-50 rounded">
                            Select a route to view trade-offs
                        </div>
                    )}
                </div>

                <div className="bg-white p-4 rounded-lg shadow border">
                    <h3 className="text-lg font-bold mb-2">4. Terrain Impact</h3>
                    <p className="text-sm text-gray-500 mb-4">Average Comfort by Slope Category</p>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={terrainData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis domain={[0, 100]} label={{ value: 'Avg Comfort', angle: -90, position: 'left' }} />
                                <Tooltip />
                                <Bar dataKey="avgComfort" fill="#3b82f6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Row 3: Shadow Potential & Route Profile */}
            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg shadow border">
                    <h3 className="text-lg font-bold mb-2">5. Shadow Potential</h3>
                    <p className="text-sm text-gray-500 mb-4">Comfort by Shadow/Density Category</p>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={shadowData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis domain={[0, 100]} label={{ value: 'Avg Comfort', angle: -90, position: 'left' }} />
                                <Tooltip />
                                <Bar dataKey="avgComfort" fill="#8b5cf6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow border">
                    <h3 className="text-lg font-bold mb-2">6. Route Comfort Profile</h3>
                    <p className="text-sm text-gray-500 mb-4">Comfort along the journey (Simulated)</p>
                    {routeData ? (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={routeProfileData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="distance" unit="%" label={{ value: 'Distance %', position: 'bottom', offset: 0 }} />
                                    <YAxis domain={[0, 100]} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="coolComfort" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} name="Cool Route" />
                                    <Area type="monotone" dataKey="fastComfort" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} name="Fast Route" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-gray-400 bg-gray-50 rounded">
                            Select a route to view profile
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
