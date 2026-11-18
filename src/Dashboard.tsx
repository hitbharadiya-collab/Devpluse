import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import {
  Activity,
  Bell,
  Bot,
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
import { INITIAL_VULNERABILITIES, WORKSPACES } from './data/mockDevPulse'
import type { AuditEvent, DevProject, NavRoute, PipelineRun, TeamMember, VulnerabilityFinding } from './types/devpulse'
import { LoginScreen, SecurityPinScreen } from './components/devpulse/AuthScreens'
const OverviewView = lazy(() => import('./components/devpulse/DevOpsViews').then((m) => ({ default: m.OverviewView })))
const ProjectsView = lazy(() => import('./components/devpulse/DevOpsViews').then((m) => ({ default: m.ProjectsView })))
const PipelinesView = lazy(() => import('./components/devpulse/DevOpsViews').then((m) => ({ default: m.PipelinesView })))
const DevSecOpsView = lazy(() => import('./components/devpulse/SecurityAdminViews').then((m) => ({ default: m.DevSecOpsView })))
const AiThreatCopilot = lazy(() => import('./components/devpulse/AiThreatCopilot').then((m) => ({ default: m.AiThreatCopilot })))
const SecurityScansView = lazy(() => import('./components/devpulse/SecurityAdminViews').then((m) => ({ default: m.SecurityScansView })))
const VulnerabilitiesView = lazy(() => import('./components/devpulse/SecurityAdminViews').then((m) => ({ default: m.VulnerabilitiesView })))
const TeamView = lazy(() => import('./components/devpulse/SecurityAdminViews').then((m) => ({ default: m.TeamView })))
const ActivityLogsView = lazy(() => import('./components/devpulse/SecurityAdminViews').then((m) => ({ default: m.ActivityLogsView })))
const SettingsView = lazy(() => import('./components/devpulse/SecurityAdminViews').then((m) => ({ default: m.SettingsView })))

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
  { id: 'ai-copilot', label: 'AI Threat Copilot', icon: Bot },
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

  const [projects, setProjects] = useState<DevProject[]>([])
  const [pipelines, setPipelines] = useState<PipelineRun[]>([])
  const [vulnerabilities, setVulnerabilities] = useState<VulnerabilityFinding[]>(INITIAL_VULNERABILITIES)
  const [team, setTeam] = useState<TeamMember[]>([])
  const [events, setEvents] = useState<AuditEvent[]>([])

  const notify = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3200)
  }

  const loadLivePostgreSQLData = useCallback(async () => {
    try {
      const [projRes, pipeRes, teamRes, logsRes, vulnRes] = await Promise.all([
        fetch('/api/projects', { credentials: 'include' }),
        fetch('/api/pipelines', { credentials: 'include' }),
        fetch('/api/teams', { credentials: 'include' }),
        fetch('/api/auth/security-logs', { credentials: 'include' }),
        fetch('/api/vulnerabilities/patched', { credentials: 'include' }),
      ])

      if (projRes.ok) {
        const projJson = await projRes.json().catch(() => ({}))
        const mappedProjects: DevProject[] = (projJson.data || []).map((p: Record<string, unknown>) => ({
          id: String(p.id),
          name: String(p.name || 'untitled-service'),
          
          repo: `github.com/devpulse-org/${String(p.name || 'service')}`,
          branch: 'main',
          owner: sessionEmail.split('@')[0],
          environment: p.priority === 'high' ? 'Production' : p.priority === 'medium' ? 'Staging' : 'Development',
          health: p.status === 'active' ? 'Healthy' : p.status === 'completed' ? 'Healthy' : 'Degraded',
          securityScore: p.priority === 'high' ? 96 : 91,
          openVulns: p.priority === 'high' ? 1 : 0,
          lastDeploy: p.updated_at ? new Date(String(p.updated_at)).toLocaleTimeString() : 'Synced via PG',
          stack: ['TypeScript', 'PostgreSQL', 'Docker'],
        }))
        setProjects(mappedProjects)
      }

      if (pipeRes.ok) {
        const pipeJson = await pipeRes.json().catch(() => ({}))
        const mappedPipelines: PipelineRun[] = (pipeJson.data || []).map((r: Record<string, unknown>) => ({
          id: String(r.run_code || r.id),
          pipelineName: 'postgres-ci-gate',
          project: String(r.service || 'devpulse-core'),
          branch: String(r.branch || 'main'),
          commit: String(r.commit_sha || 'a1b2c3d'),
          author: String(r.triggered_by || sessionEmail),
          status: r.status === 'passed' ? 'Success' : r.status === 'failed' ? 'Failed' : 'Running',
          duration: String(r.duration || '48s'),
          testsPassed: r.status === 'failed' ? '141 / 145' : '145 / 145',
          environment: 'Production',
          timestamp: r.created_at ? new Date(String(r.created_at)).toLocaleTimeString() : 'Live PG',
          stages: [
            { name: 'Source', status: 'passed', time: '3s' },
            { name: 'Build', status: 'passed', time: '28s' },
            { name: 'SAST Scan', status: r.status === 'failed' ? 'failed' : 'passed', time: '14s' },
            { name: 'Unit Tests', status: r.status === 'failed' ? 'skipped' : 'passed', time: '19s' },
            { name: 'Deploy', status: r.status === 'failed' ? 'skipped' : 'passed', time: '12s' },
          ],
          logs: [
            `[PG-LIVE] Persisted run ${String(r.run_code)} for ${String(r.service)}@${String(r.branch)}`,
            `[PG-LIVE] Commit SHA ${String(r.commit_sha)} triggered by ${String(r.triggered_by)}`,
          ],
        }))
        setPipelines(mappedPipelines)
      }

      if (teamRes.ok) {
        const teamJson = await teamRes.json().catch(() => ({}))
        const mappedMembers: TeamMember[] = (teamJson.members || []).map((m: Record<string, unknown>) => {
          const email = String(m.member_email || '')
          return {
            id: String(m.id),
            name: email.split('@')[0] || 'Operator',
            email,
            role: (m.role as TeamMember['role']) || 'Engineer',
            mfaEnabled: true,
            lastActive: m.added_at ? new Date(String(m.added_at)).toLocaleDateString() : 'Active',
            status: m.status === 'Invited' ? 'Invited' : 'Online',
          }
        })
        setTeam(mappedMembers)
      }

      if (vulnRes && vulnRes.ok) { const vj = await vulnRes.json().catch(() => ({})); if (Array.isArray(vj.data)) { const setIds = new Set(vj.data.map(String)); setVulnerabilities((prev) => prev.map((v) => (setIds.has(v.id) ? { ...v, status: 'Patched' } : v))) } }
      if (logsRes.ok) {
        const logsJson = await logsRes.json().catch(() => ({}))
        const mappedEvents: AuditEvent[] = (logsJson.data || []).map((l: Record<string, unknown>) => ({
          id: String(l.event_code || l.id),
          actor: sessionEmail.split('@')[0],
          action: String(l.event_message || ''),
          resource: 'PostgreSQL Control Plane',
          category: l.status === 'blocked' ? 'Security' : 'Auth',
          ip: String(l.source_ip || '127.0.0.1'),
          timestamp: l.created_at ? new Date(String(l.created_at)).toLocaleTimeString() : 'Live',
          risk: l.status === 'blocked' ? 'High' : 'Normal',
        }))
        setEvents(mappedEvents)
      }
    } catch {
      // Backend session not active yet
    }
  }, [sessionEmail])

  useEffect(() => {
    void loadLivePostgreSQLData()
  }, [loadLivePostgreSQLData])

  const handleTriggerPipeline = async () => {
    try {
      const res = await fetch('/api/pipelines/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          service: projects[0]?.name || 'auth-identity-gateway',
          branch: 'main',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        notify(`Pipeline ${data.data.run_code} saved to PostgreSQL!`)
        await loadLivePostgreSQLData()
        setTimeout(() => void loadLivePostgreSQLData(), 1800)
      } else {
        notify(data.message || 'Login required to trigger PostgreSQL pipeline.')
      }
    } catch {
      notify('Backend server unreachable on port 5000.')
    }
  }

  const handlePatchVuln = async (id: string) => { const target = vulnerabilities.find((v) => v.id === id); setVulnerabilities((prev) => prev.map((v) => (v.id === id ? { ...v, status: 'Patched' } : v))); const cliCmd = target ? `npm audit fix --package=${target.packageOrFile} # Patch ${target.cve}` : `npm audit fix`; try { await navigator.clipboard?.writeText(cliCmd) } catch {}; try { const r = await fetch('/api/vulnerabilities/patch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ id, cve: target?.cve || id }) }); if (r.ok) { notify(`Patched ${target?.cve || id} in PostgreSQL & copied fix CLI!`) } else { notify(`Sign in to persist ${target?.cve || id} in PostgreSQL.`) } } catch { notify(`Saved locally (server unreachable).`) } }

  if (authMode === 'login') {
    return (
      <LoginScreen
        onLoginSuccess={(email) => {
          setSessionEmail(email)
          setAuthMode('pin')
          void loadLivePostgreSQLData()
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
          void loadLivePostgreSQLData()
          notify('Security PIN verified — Live PostgreSQL session active')
        }}
        onSkip={() => {
          setAuthMode('app')
          void loadLivePostgreSQLData()
        }}
      />
    )
  }

  const currentLabel = NAV_ITEMS.find((n) => n.id === route)?.label || 'Overview'
  const displayName = user?.name || sessionEmail.split('@')[0]

  return (
    <div className="min-h-screen bg-[#07090f] text-slate-100 flex">
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen bg-[#090c14] border-r border-slate-800/90 flex flex-col transition-all duration-200 ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="h-16 px-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/25">
              <Activity className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div className="truncate">
                <div className="text-base font-bold tracking-tight text-white">DevPulse</div>
                <div className="text-[10px] font-mono text-emerald-400">POSTGRESQL LIVE</div>
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

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto min-w-0 max-w-full">
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

      <div className="flex-1 flex flex-col min-w-0 min-w-0 max-w-full">
        <header className="h-16 px-4 lg:px-7 bg-[#090c14]/90 backdrop-blur-md border-b border-slate-800/90 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300"
            >
              <Menu className="w-4 h-4" />
            </button>

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

            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
              <span>/</span>
              <span className="text-emerald-400 font-mono">PostgreSQL 18</span>
              <span>/</span>
              <span className="text-slate-200 font-medium">{currentLabel}</span>
            </div>
          </div>

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
                <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-2 right-2" />
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-[#0c101a] border border-slate-800 p-4 shadow-2xl z-50 text-xs">
                  <div className="font-semibold text-white mb-2">Live PostgreSQL Telemetry</div>
                  <p className="text-slate-400 mb-3">
                    Connected to Express API (`PORT 5000`) & PostgreSQL (`devpulse`).
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      void loadLivePostgreSQLData()
                      setNotifOpen(false)
                      notify('Synced latest rows from PostgreSQL!')
                    }}
                    className="w-full py-1.5 rounded-lg bg-blue-600 text-white font-semibold cursor-pointer"
                  >
                    Sync Database Now
                  </button>
                </div>
              )}
            </div>

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
                  <div className="font-semibold text-white">Full-Stack Architecture</div>
                  <p className="text-slate-400">
                    React + TypeScript frontend wired to Node/Express REST APIs and PostgreSQL relational storage.
                  </p>
                </div>
              )}
            </div>

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

        <main className="flex-1 p-4 lg:p-7 max-w-[1520px] w-full mx-auto min-w-0 flex-1 w-full overflow-x-hidden min-w-0 max-w-full">
          <Suspense fallback={<div className="text-xs text-slate-400 py-8 text-center">Loading telemetry module...</div>}>{route === 'overview' && (
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
              onAddProject={async (p) => {
                try {
                  const res = await fetch('/api/projects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                      name: p.name,
                      description: p.repo || 'Enterprise DevSecOps microservice',
                      status: 'active',
                      priority: p.environment === 'Production' ? 'high' : p.environment === 'Staging' ? 'medium' : 'low',
                    }),
                  })
                  const data = await res.json().catch(() => ({}))
                  if (res.ok && data.success) {
                    notify(`Project "${p.name}" saved to PostgreSQL!`)
                    await loadLivePostgreSQLData()
                  } else {
                    notify(data.message || 'Failed to save project to PostgreSQL.')
                  }
                } catch {
                  notify('Backend server unreachable.')
                }
              }}
              onDeleteProject={async (id) => {
                try {
                  const res = await fetch(`/api/projects/${id}`, {
                    method: 'DELETE',
                    credentials: 'include',
                  })
                  if (res.ok) {
                    notify('Project deleted from PostgreSQL.')
                    await loadLivePostgreSQLData()
                  } else {
                    notify('Could not delete project.')
                  }
                } catch {
                  notify('Backend server unreachable.')
                }
              }}
            />
          )}
          {route === 'pipelines' && (
            <PipelinesView pipelines={pipelines} onTriggerRun={handleTriggerPipeline} />
          )}
          {route === 'devsecops' && (
            <DevSecOpsView vulnerabilities={vulnerabilities} onPatchVuln={handlePatchVuln} />
          )}
          {route === 'ai-copilot' && <AiThreatCopilot />}
          {route === 'scans' && <SecurityScansView />}
          {route === 'vulnerabilities' && (
            <VulnerabilitiesView vulnerabilities={vulnerabilities} onPatchVuln={handlePatchVuln} />
          )}
          {route === 'team' && (
            <TeamView
              members={team}
              onInviteMember={async (email, role) => {
                try {
                  const res = await fetch('/api/teams/members', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email, role }),
                  })
                  const data = await res.json().catch(() => ({}))
                  if (res.ok && data.success) {
                    notify(`Member ${email} saved to PostgreSQL RBAC!`)
                    await loadLivePostgreSQLData()
                  } else {
                    const fb = { id: 'tm-' + Date.now(), name: email.split('@')[0], email, role, mfaEnabled: true, lastActive: 'Just now', status: 'Invited' as const }; setTeam((prev) => [fb, ...prev.filter((m) => m.email !== email)]); notify(data.message || 'Added in session')
                  }
                } catch {
                  const fb = { id: 'tm-' + Date.now(), name: email.split('@')[0], email, role, mfaEnabled: true, lastActive: 'Just now', status: 'Invited' as const }; setTeam((prev) => [fb, ...prev.filter((m) => m.email !== email)]); notify('Invited in local session')
                }
              }}
            />
          )}
          {route === 'activity' && <ActivityLogsView events={events} />}
          {route === 'settings' && <SettingsView onOpenPinTest={() => setAuthMode('pin')} />}</Suspense>
        </main>
      </div>

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-[#0f172a] border border-emerald-500/50 text-xs font-medium text-white shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  )
}

export default Dashboard








