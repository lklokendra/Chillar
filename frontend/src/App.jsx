import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './routes/ProtectedRoute'
import DashboardPage from './pages/DashboardPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import GullakGoalPage from './pages/GullakGoalPage'
import GullakHistoryPage from './pages/GullakHistoryPage'
import GullakPage from './pages/GullakPage'
import HistoryPage from './pages/HistoryPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import SplitGroupPage from './pages/SplitGroupPage'
import SplitPage from './pages/SplitPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/gullak" element={<GullakPage />} />
        <Route path="/gullak/history" element={<GullakHistoryPage />} />
        <Route path="/gullak/goals/:goalId" element={<GullakGoalPage />} />
        <Route path="/split" element={<SplitPage />} />
        <Route path="/split/:groupId" element={<SplitGroupPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
