import { useState } from 'react'
import {
  Activity,
  Bell,
  Bug,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderGit2,
  GitBranch,
  HelpCircle,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  ScanSearch,
  ScrollText,
  Search,
  Settings,
  Shield,
  Users,
  X,
} from 'lucide-react'
import {
  INITIAL_AUDIT_EVENTS,
  INITIAL_PIPELINES,
  INITIAL_PROJECTS,
  INITIAL_TEAM,
  INITIAL_VULNERABILITIES,
  WORKSPACES,
} from './data/mockDevPulse'
import type { AuditEvent, DevProject, NavRoute, PipelineRun, TeamMember, VulnerabilityFinding } from './types/devpulse'
import { LoginScreen, SecurityPinScreen } from './components/devpulse/AuthScreens'
import { OverviewView, PipelinesView, ProjectsView } from './components/devpulse/DevOpsViews'
import {
  ActivityLogsView,
  DevSecOpsView,
  SecurityScansView,
  SettingsView,
  TeamView,
  VulnerabilitiesView,
} from './components/devpulse/SecurityAdminViews'

interface UserProfile {
  id?: string | number
  name?: string
  email: string
  role?: string
  organization?: string
}

interface DashboardProps {
  user?: UserProfile
  onLogout?: () => void
}

const NAV_ITEMS: { id: NavRoute; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'projects', label: 'Projects', icon: FolderGit2 },
  { id: 'pipelines', label: 'CI/CD Pipelines', icon: GitBranch },
  { id: 'devsecops', label: 'DevSecOps', icon: Shield },
  { id: 'scans', label: 'Security Scans', icon: ScanSearch },
  { id: 'vulnerabilities', label: 'Vulnerabilities', icon: Bug },
  { id: 'team', label: 'Team Management', icon: Users },
  { id: 'activity', label: 'Activity Logs', icon: ScrollText },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function Dashboard({ user, onLogout }: DashboardProps) {
  const [authMode, setAuthMode] = useState<'app' | 'login' | 'pin'>('app')
  const [sessionEmail, setSessionEmail] = useState(user?.email || 'hit.bharadiya@devpulse.io')
  const [route, setRoute] = useState<NavRoute>('overview')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [workspace, setWorkspace] = useState(WORKSPACES[0])
  const [globalSearch, setGlobalSearch] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [toast, setToast] = useState('')

  const [projects, setProjects] = useState<DevProject[]>(INITIAL_PROJECTS)
  const [pipelines, setPipelines] = useState<PipelineRun[]>(INITIAL_PIPELINES)
  const [vulnerabilities, setVulnerabilities] = useState<VulnerabilityFinding[]>(INITIAL_VULNERABILITIES)
  const [team, setTeam] = useState<TeamMember[]>(INITIAL_TEAM)
  const [events, setEvents] = useState<AuditEvent[]>(INITIAL_AUDIT_EVENTS)

  const notify = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3200)
  }

  const handleTriggerPipeline = () => {
    const newRun: PipelineRun = {
      id: `RUN-${Math.floor(8843 + Math.random() * 140)}`,
      pipelineName: 'manual-release-gate',
      project: projects[0]?.name || 'auth-identity-gateway',
      branch: 'main',
      commit: Math.random().toString(16).slice(2, 9),
      author: user?.name || 'Hit Bharadiya',
      status: 'Success',
      duration: '1m 48s',
      testsPassed: '152 / 152',
      environment: 'Production',
      timestamp: 'Just now',
      stages: [
        { name: 'Source', status: 'passed', time: '4s' },
        { name: 'Build', status: 'passed', time: '36s' },
        { name: 'SAST Scan', status: 'passed', time: '22s' },
        { name: 'Unit Tests', status: 'passed', time: '28s' },
        { name: 'Deploy', status: 'passed', time: '18s' },
      ],
      logs: [
        '[NOW] INFO  Manual CI/CD execution triggered from DevPulse Control Plane',
        '[NOW] PASS  SAST & SCA policy checks passed with 0 blockers',
        '[NOW] DONE  Deployment verified on prod-eks-us-east-1',
      ],
    }
    setPipelines((prev) => [newRun, ...prev])
    setEvents((prev) => [
      {
        id: `EVT-${Math.floor(9922 + Math.random() * 70)}`,
        actor: user?.name || 'Hit Bharadiya',
        action: `Triggered pipeline ${newRun.id} on ${newRun.project}`,
        resource: newRun.project,
        category: 'Pipeline',
        ip: '103.85.12.19',
        timestamp: 'Just now',
        risk: 'Normal',
      },
      ...prev,
    ])
    notify(`Pipeline ${newRun.id} completed & verified!`)
  }

  const handlePatchVuln = (id: string) => {
    setVulnerabilities((prev) => prev.map((v) => (v.id === id ? { ...v, status: 'Patched' } : v)))
    notify(`Vulnerability ${id} marked as Patched.`)
  }

  if (authMode === 'login') {
    return (
      <LoginScreen
        onLoginSuccess={(email) => {
          setSessionEmail(email)
          setAuthMode('pin')
        }}
      />
    )
  }

  if (authMode === 'pin') {
    return (
      <SecurityPinScreen
        userEmail={sessionEmail}
        onVerified={() => {
          setAuthMode('app')
          notify('Security PIN verified — Full operator session unlocked')
        }}
        onSkip={() => setAuthMode('app')}
      />
    )
  }

  const currentLabel = NAV_ITEMS.find((n) => n.id === route)?.label || 'Overview'
  const displayName = user?.name || sessionEmail.split('@')[0]

  return (
    <div className="min-h-screen bg-[#07090f] text-slate-100 flex">
      {/* Mobile Sidebar Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Left Collapsible Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen bg-[#090c14] border-r border-slate-800/90 flex flex-col transition-all duration-200 ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/25">
              <Activity className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div className="truncate">
                <div className="text-base font-bold tracking-tight text-white">DevPulse</div>
                <div className="text-[10px] font-mono text-cyan-400">DEVSECOPS CLOUD</div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 items-center justify-center text-slate-400 hover:text-white cursor-pointer"
            title="Collapse Sidebar"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = route === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setRoute(item.id)
                  setMobileOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  active
                    ? 'bg-blue-600/15 text-white border border-blue-500/35 shadow-xs'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/70 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-400' : 'text-slate-400'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Bottom Auth Preview Switcher */}
        {!collapsed && (
          <div className="p-3 border-t border-slate-800/80 space-y-2">
            <button
              type="button"
              onClick={() => setAuthMode('pin')}
              className="w-full py-2 px-3 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-[11px] font-medium text-purple-300 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" /> Security PIN Lock
            </button>
            <button
              type="button"
              onClick={() => {
                if (onLogout) onLogout()
                setAuthMode('login')
              }}
              className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-rose-500/15 border border-slate-800 hover:border-rose-500/30 text-[11px] font-medium text-slate-300 hover:text-rose-300 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out / Login UI
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className="h-16 px-4 lg:px-7 bg-[#090c14]/90 backdrop-blur-md border-b border-slate-800/90 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Workspace Selector */}
            <div className="relative">
              <select
                value={workspace.id}
                onChange={(e) => {
                  const found = WORKSPACES.find((w) => w.id === e.target.value)
                  if (found) setWorkspace(found)
                }}
                className="appearance-none pl-3 pr-7 py-1.5 rounded-lg bg-[#0c101a] border border-slate-800 text-xs font-semibold text-white cursor-pointer focus:outline-none focus:border-blue-500"
              >
                {WORKSPACES.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2 pointer-events-none" />
            </div>

            {/* Breadcrumbs */}
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
              <span>/</span>
              <span>{workspace.plan}</span>
              <span>/</span>
              <span className="text-slate-200 font-medium">{currentLabel}</span>
            </div>
          </div>

          {/* Global Search + Right Controls */}
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0c101a] border border-slate-800 w-56 lg:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <input
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && globalSearch.trim()) {
                    setRoute('projects')
                  }
                }}
                placeholder="Search repos, CVEs, runs..."
                className="bg-transparent text-xs text-white w-full focus:outline-none"
              />
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen(!notifOpen)
                  setHelpOpen(false)
                  setProfileOpen(false)
                }}
                className="w-9 h-9 rounded-lg bg-[#0c101a] border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white relative cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                <span className="w-2 h-2 rounded-full bg-blue-500 absolute top-2 right-2" />
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-[#0c101a] border border-slate-800 p-4 shadow-2xl z-50 text-xs">
                  <div className="font-semibold text-white mb-2">Security & Build Alerts</div>
                  <p className="text-slate-400 mb-3">
                    1 Critical SAML vulnerability blocked in <span className="text-cyan-400">customer-portal-web</span>.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setRoute('vulnerabilities')
                      setNotifOpen(false)
                    }}
                    className="w-full py-1.5 rounded-lg bg-blue-600 text-white font-semibold cursor-pointer"
                  >
                    Inspect Finding
                  </button>
                </div>
              )}
            </div>

            {/* Help Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setHelpOpen(!helpOpen)
                  setNotifOpen(false)
                  setProfileOpen(false)
                }}
                className="w-9 h-9 rounded-lg bg-[#0c101a] border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
              {helpOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#0c101a] border border-slate-800 p-4 shadow-2xl z-50 text-xs space-y-2">
                  <div className="font-semibold text-white">DevPulse Documentation</div>
                  <p className="text-slate-400">
                    Enterprise DevSecOps platform demonstration build with interactive CI/CD and SAST/SCA workflows.
                  </p>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(!profileOpen)
                  setNotifOpen(false)
                  setHelpOpen(false)
                }}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-lg bg-[#0c101a] border border-slate-800 text-xs cursor-pointer"
              >
                <span className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center font-bold text-white text-[11px]">
                  {displayName.slice(0, 2).toUpperCase()}
                </span>
                <span className="hidden md:inline font-medium text-slate-200">{displayName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl bg-[#0c101a] border border-slate-800 p-2 shadow-2xl z-50 text-xs space-y-1">
                  <div className="px-2.5 py-1.5 border-b border-slate-800 text-slate-400 truncate">{sessionEmail}</div>
                  <button
                    type="button"
                    onClick={() => {
                      setRoute('settings')
                      setProfileOpen(false)
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200 cursor-pointer"
                  >
                    Security Policy Settings
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false)
                      setAuthMode('pin')
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-800 text-purple-300 cursor-pointer"
                  >
                    Lock with Security PIN
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false)
                      setAuthMode('login')
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded hover:bg-rose-500/15 text-rose-300 cursor-pointer"
                  >
                    Preview Login Screen
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Active Screen Viewport */}
        <main className="flex-1 p-4 lg:p-7 max-w-[1520px] w-full mx-auto">
          {route === 'overview' && (
            <OverviewView
              projects={projects}
              pipelines={pipelines}
              vulnerabilities={vulnerabilities}
              events={events}
              onNavigate={setRoute}
              onTriggerPipeline={handleTriggerPipeline}
            />
          )}
          {route === 'projects' && (
            <ProjectsView
              projects={projects}
              onAddProject={(p) => {
                setProjects((prev) => [p, ...prev])
                notify(`Repository ${p.name} registered.`)
              }}
              onDeleteProject={(id) => {
                setProjects((prev) => prev.filter((p) => p.id !== id))
                notify('Repository removed from workspace.')
              }}
            />
          )}
          {route === 'pipelines' && (
            <PipelinesView pipelines={pipelines} onTriggerRun={handleTriggerPipeline} />
          )}
          {route === 'devsecops' && (
            <DevSecOpsView vulnerabilities={vulnerabilities} onPatchVuln={handlePatchVuln} />
          )}
          {route === 'scans' && <SecurityScansView />}
          {route === 'vulnerabilities' && (
            <VulnerabilitiesView vulnerabilities={vulnerabilities} onPatchVuln={handlePatchVuln} />
          )}
          {route === 'team' && (
            <TeamView
              members={team}
              onInviteMember={(email, role) => {
                setTeam((prev) => [
                  ...prev,
                  {
                    id: `USR-0${prev.length + 1}`,
                    name: email.split('@')[0],
                    email,
                    role,
                    mfaEnabled: false,
                    lastActive: 'Invited',
                    status: 'Invited',
                  },
                ])
                notify(`Invitation sent to ${email}`)
              }}
            />
          )}
          {route === 'activity' && <ActivityLogsView events={events} />}
          {route === 'settings' && <SettingsView onOpenPinTest={() => setAuthMode('pin')} />}
        </main>
      </div>

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-[#0f172a] border border-blue-500/50 text-xs font-medium text-white shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  )
}

export default Dashboard

