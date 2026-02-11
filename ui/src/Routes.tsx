import { Routes, Route, Navigate } from 'react-router-dom'
import App from './App'
import { IdeationPage } from './pages/IdeationPage'
import { RoadmapPage } from './pages/RoadmapPage'

export function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<App />} />
            <Route path="/project/:projectName/ideation" element={<IdeationPage />} />
            <Route path="/project/:projectName/roadmap" element={<RoadmapPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}
