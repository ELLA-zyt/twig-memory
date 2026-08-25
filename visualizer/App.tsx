import { Route, Routes } from 'react-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import ErrorBoundary from './components/ErrorBoundary'
import AppLayout from './layout/AppLayout'
import TodayPage from './pages/TodayPage'
import BookPage from './pages/BookPage'
import ClaimsPage from './pages/ClaimsPage'
import SettingsPage from './pages/SettingsPage'
import ThreadsPage from './pages/ThreadsPage'
import ThreadDetailPage from './pages/ThreadDetailPage'
import AuditPage from './pages/AuditPage'
import DayCardPage from './pages/DayCardPage'

export default function App() {
  return (
    <ErrorBoundary>
      <TooltipProvider delayDuration={300}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<TodayPage />} />
            <Route path="book" element={<BookPage />} />
            <Route path="day" element={<DayCardPage />} />
            <Route path="threads" element={<ThreadsPage />} />
            <Route path="threads/:id" element={<ThreadDetailPage />} />
            <Route path="claims" element={<ClaimsPage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
        {/* shadcn Sonner：全局通知；主题变量继承穆夏描金/羊皮纸 */}
        <Toaster theme="light" position="bottom-right" richColors closeButton />
      </TooltipProvider>
    </ErrorBoundary>
  )
}
