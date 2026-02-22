import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './context/ToastContext'
import { Channels } from './screens/Channels'
import { Live } from './screens/Live'
import { PlayEditor } from './screens/PlayEditor'
import { Plays } from './screens/Plays'
import { Preview } from './screens/Preview'
import { Settings } from './screens/Settings'

function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-title">PiLites</div>
      <NavLink to="/channels" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
        Channels
      </NavLink>
      <NavLink to="/plays" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
        Plays
      </NavLink>
      <NavLink to="/preview" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
        Preview
      </NavLink>
      <NavLink to="/live" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
        Live
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
        Settings
      </NavLink>
    </nav>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="layout">
          <Sidebar />
          <main className="main">
            <Routes>
              <Route path="/" element={<Navigate to="/channels" replace />} />
              <Route path="/channels" element={<Channels />} />
              <Route path="/plays" element={<Plays />} />
              <Route path="/plays/:id" element={<PlayEditor />} />
              <Route path="/preview" element={<Preview />} />
              <Route path="/live" element={<Live />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </ToastProvider>
    </BrowserRouter>
  )
}
