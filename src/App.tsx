import { Route, Routes } from 'react-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import ErrorBoundary from './components/ErrorBoundary'
import AppLayout from './layout/AppLayout'
import DemoPage from './pages/DemoPage'
import EvaluationPage from './pages/EvaluationPage'
import FragmentsPage from './pages/FragmentsPage'
import OverviewPage from './pages/OverviewPage'
import RightsPage from './pages/RightsPage'
import ThreadsPage from './pages/ThreadsPage'
import UnderstandingPage from './pages/UnderstandingPage'
import { EngineProvider } from './state/EngineContext'

export default function App() {
  return (
    <ErrorBoundary>
      <EngineProvider>
        <TooltipProvider delayDuration={300}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<OverviewPage />} />
              <Route path="threads" element={<ThreadsPage />} />
              <Route path="understanding" element={<UnderstandingPage />} />
              <Route path="fragments" element={<FragmentsPage />} />
              <Route path="evaluation" element={<EvaluationPage />} />
              <Route path="rights" element={<RightsPage />} />
              <Route path="demo" element={<DemoPage />} />
            </Route>
          </Routes>
          {/* shadcn Sonner：全局通知；主题变量继承穆夏描金/羊皮纸 */}
          <Toaster theme="light" position="bottom-right" richColors closeButton />
        </TooltipProvider>
      </EngineProvider>
    </ErrorBoundary>
  )
}
