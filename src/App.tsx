import { Route, Routes, NavLink } from 'react-router-dom'
import { Eye, BookOpen, MapPin, Scroll, Info, User, LogOut, X, Menu } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import HomePage from './pages/HomePage'
import LibraryPage from './pages/LibraryPage'
import CreatureProfilePage from './pages/CreatureProfilePage'
import SubmitCreaturePage from './pages/SubmitCreaturePage'
import AboutPage from './pages/AboutPage'
import ModerationPage from './pages/ModerationPage'
import AuthModal from './components/AuthModal'
import { useAuth } from './context/AuthContext'
import { useState, useEffect } from 'react'

const navItems = [
  { to: '/', icon: MapPin, label: 'Map' },
  { to: '/library', icon: BookOpen, label: 'Library' },
  { to: '/submit', icon: Scroll, label: 'Submit' },
  { to: '/about', icon: Info, label: 'About' },
]

function App() {
  const { user, signOut, openAuthModal } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-app-background text-parchment">

      {/* ── AUTH MODAL ── */}
      <AuthModal />

      {/* ── HEADER ── */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'border-b border-app-border bg-void/95 backdrop-blur-2xl shadow-void-deep'
            : 'border-b border-transparent bg-transparent backdrop-blur-sm'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">

          {/* Logo */}
          <NavLink
            to="/"
            className="group flex items-center gap-3"
            onClick={() => setMobileNavOpen(false)}
            aria-label="LocaLore — Home"
          >
            <span className="relative flex h-9 w-9 items-center justify-center">
              <span className="absolute inset-0 rounded-full border border-gold/40 animate-glow-pulse" />
              <span className="absolute inset-1 rounded-full bg-app-surface" />
              <Eye className="relative h-4 w-4 text-gold drop-shadow-gold" />
            </span>
            <div className="leading-none">
              <div className="font-heading text-base tracking-[0.18em] text-gold group-hover:text-gold/90 transition-colors">
                LocaLore
              </div>
              <div className="mt-0.5 hidden text-[9px] font-ui uppercase tracking-[0.3em] text-parchment-muted sm:block">
                Forbidden Folklore Archive
              </div>
            </div>
          </NavLink>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-ui font-medium uppercase tracking-[0.2em] transition-all duration-200 ${
                    isActive
                      ? 'bg-gold/10 text-gold border border-gold/25'
                      : 'text-parchment-muted hover:text-parchment hover:bg-app-surface border border-transparent'
                  }`
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </NavLink>
            ))}

            {/* Auth control */}
            {user ? (
              <div className="ml-2 flex items-center gap-2">
                <span className="max-w-[140px] truncate rounded-lg border border-gold/25 bg-gold/10 px-3 py-2 text-[11px] font-ui text-gold">
                  {user.email}
                </span>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  title="Sign out"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-app-border text-parchment-muted transition hover:border-crimson/50 hover:text-crimson"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={openAuthModal}
                className="ml-2 flex items-center gap-1.5 rounded-lg border border-app-border px-3 py-2 text-[11px] font-ui font-medium uppercase tracking-[0.2em] text-parchment-muted transition-all duration-200 hover:border-gold/40 hover:text-gold"
              >
                <User className="h-3.5 w-3.5" />
                Sign in
              </button>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileNavOpen}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-app-border text-parchment-muted transition hover:border-gold/40 hover:text-gold md:hidden"
            onClick={() => setMobileNavOpen((o) => !o)}
          >
            {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* Mobile nav drawer */}
        {mobileNavOpen && (
          <div className="border-t border-app-border bg-void/98 backdrop-blur-2xl md:hidden animate-rise">
            <nav className="flex flex-col gap-0.5 px-4 py-3" aria-label="Mobile navigation">
              {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setMobileNavOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-ui uppercase tracking-[0.2em] transition-all ${
                      isActive
                        ? 'bg-gold/10 text-gold border-l-2 border-gold pl-2.5'
                        : 'text-parchment-muted hover:text-parchment hover:bg-app-surface border-l-2 border-transparent pl-2.5'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}

              {user ? (
                <>
                  <div className="mt-2 rounded-lg border border-gold/25 bg-gold/10 px-3 py-3 text-sm font-ui text-gold truncate">
                    {user.email}
                  </div>
                  <button
                    type="button"
                    onClick={() => { void signOut(); setMobileNavOpen(false) }}
                    className="mt-1 flex items-center gap-3 rounded-lg border border-app-border px-3 py-3 text-sm font-ui uppercase tracking-[0.2em] text-crimson/80 transition hover:border-crimson/40 hover:text-crimson"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => { openAuthModal(); setMobileNavOpen(false) }}
                  className="mt-2 flex items-center gap-3 rounded-lg border border-app-border px-3 py-3 text-sm font-ui uppercase tracking-[0.2em] text-parchment-muted transition hover:border-gold/40 hover:text-gold"
                >
                  <User className="h-4 w-4" />
                  Sign in
                </button>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/creatures/:id" element={<CreatureProfilePage />} />
          <Route path="/submit" element={<SubmitCreaturePage />} />
          <Route path="/moderate" element={<ModerationPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-app-border bg-void py-6 text-center">
        <p className="font-heading text-[10px] tracking-[0.4em] text-parchment-dim uppercase">
          LocaLore · Forbidden Folklore Archive
        </p>
        <p className="mt-1 font-ui text-[10px] text-parchment-muted/50">
          All entries are fragments of collective memory. Tread carefully.
        </p>
      </footer>
    </div>
  )
}

export default App


