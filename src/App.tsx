import { Route, Routes, NavLink } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import HomePage from './pages/HomePage'
import LibraryPage from './pages/LibraryPage'
import CreatureProfilePage from './pages/CreatureProfilePage'
import SubmitCreaturePage from './pages/SubmitCreaturePage'
import AuthPage from './pages/AuthPage'
import { AuthProvider } from './components/AuthProvider'

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        <header className="border-b border-slate-800 bg-gradient-to-b from-black/80 to-slate-950/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <NavLink to="/" className="flex items-baseline gap-2">
              <span className="font-gothic text-2xl font-semibold text-accent drop-shadow-md">
                LocaLore
              </span>
              <span className="hidden text-xs uppercase tracking-[0.2em] text-slate-400 sm:inline">
                Global Folklore Atlas
              </span>
            </NavLink>
            <nav className="flex items-center gap-4 text-sm">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `hover:text-accent ${isActive ? 'text-accent' : 'text-slate-300'}`
                }
              >
                Map
              </NavLink>
              <NavLink
                to="/library"
                className={({ isActive }) =>
                  `hover:text-accent ${isActive ? 'text-accent' : 'text-slate-300'}`
                }
              >
                Monster Library
              </NavLink>
              <NavLink
                to="/submit"
                className={({ isActive }) =>
                  `hover:text-accent ${isActive ? 'text-accent' : 'text-slate-300'}`
                }
              >
                Submit
              </NavLink>
              <NavLink
                to="/auth"
                className={({ isActive }) =>
                  `rounded border border-slate-700 px-3 py-1.5 text-xs uppercase tracking-wide hover:border-accent hover:text-accent ${
                    isActive ? 'border-accent text-accent' : 'text-slate-200'
                  }`
                }
              >
                Sign in
              </NavLink>
            </nav>
          </div>
        </header>

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/creatures/:id" element={<CreatureProfilePage />} />
            <Route path="/submit" element={<SubmitCreaturePage />} />
            <Route path="/auth" element={<AuthPage />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  )
}

export default App

