import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './hooks/useAuth'
import { useStore } from './store/workspace'

// Lazy imports for pages (will be created in later tasks)
import Login from './pages/Login'
import Workspace from './pages/Workspace'

function AppRoutes() {
  useAuth()
  const user = useStore((s) => s.user)
  const workspace = useStore((s) => s.workspace)

  // Still initializing
  if (user === undefined) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-page">
        <div className="w-6 h-6 rounded-full border-2 border-accent-eden border-t-transparent animate-spin" />
      </div>
    )
  }

  // Not logged in
  if (user === null) {
    return <Login />
  }

  // Logged in but workspace loading
  if (!workspace) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-page">
        <div className="w-6 h-6 rounded-full border-2 border-accent-eden border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to={`/workspace/${workspace.id}`} replace />} />
      <Route path="/workspace/:workspaceId" element={<Workspace />} />
      <Route path="/workspace/:workspaceId/folder/:folderId" element={<Workspace />} />
      <Route path="*" element={<Navigate to={`/workspace/${workspace.id}`} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#FFFFFF',
            color: '#272523',
            border: '1px solid rgba(39,37,35,0.1)',
            borderRadius: '8px',
            fontSize: '13px',
          },
        }}
      />
    </BrowserRouter>
  )
}
