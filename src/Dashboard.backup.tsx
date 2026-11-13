import { useEffect, useMemo, useState } from 'react'
import { startRegistration } from '@simplewebauthn/browser'
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Boxes,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  Code2,
  Fingerprint,
  GitBranch,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Server,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AuthUser } from './App'
import './App.css'

type BackendStatus = 'active' | 'completed' | 'archived'
type BackendPriority = 'low' | 'medium' | 'high'
type WorkspaceRole = 'Admin' | 'DevSecOps' | 'Engineer' | 'Viewer'

type Project = {
  id: string
  name: string
  description: string
  rawStatus: BackendStatus
  status: string
  priority: BackendPriority
  color: string
  updatedAt?: string
}

type ProjectsResponse = {
  success: boolean
  data: Array<{
    id: string
    name: string
    description: string
    status: BackendStatus
    priority: BackendPriority
    updated_at?: string
  }>
}

type SecurityLogRow = {
  id: string
  event_code: string
  event_message: string
  source_ip: string
  status: 'blocked' | 'verified' | 'monitored'
  created_at: string
}

type PipelineRun = {
  id: string
  run_code: string
  service: string
  branch: string
  commit_sha: string
  status: 'passed' | 'running' | 'failed'
  duration: string
  triggered_by: string
  created_at: string
}

type TeamMemberRow = {
  id: string
  member_email: string
  role: WorkspaceRole
  status: string
  added_at: string
}

type PasskeyRow = {
  id: string
  credential_id: string
  device_type: string
  backed_up: boolean
  label: string
  created_at: string
}

interface DashboardProps {
  user: AuthUser
  onLogout: () => Promise<void>
}

const API_URL = '/api/projects'
const SECURITY_LOGS_URL = '/api/auth/security-logs'
const TEAMS_URL = '/api/teams'
const PIPELINES_URL = '/api/pipelines'
const PASSKEYS_URL = '/api/passkeys'

function mapProject(project: ProjectsResponse['data'][number]): Project {
  const statusLabels: Record<BackendStatus, string> = {
    active: 'In Progress',
    completed: 'Completed',
    archived: 'Archived',
  }

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    rawStatus: project.status,
    status: statusLabels[project.status],
    priority: project.priority,
    color:
      project.priority === 'high'
        ? 'purple'
        : project.priority === 'low'
          ? 'green'
          : 'blue',
    updatedAt: project.updated_at,
  }
}

function Dashboard({ user, onLogout }: DashboardProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | BackendStatus>('all')
  const [showModal, setShowModal] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activePage, setActivePage] = useState('Overview')

  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [savingProject, setSavingProject] = useState(false)
  const [apiError, setApiError] = useState('')
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [projectStatus, setProjectStatus] = useState<BackendStatus>('active')
  const [projectPriority, setProjectPriority] = useState<BackendPriority>('medium')
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)

  const [securityLogs, setSecurityLogs] = useState<SecurityLogRow[]>([])
  const [auditingSecurity, setAuditingSecurity] = useState(false)

  const [orgName, setOrgName] = useState('DevPulse Enterprise')
  const [currentRole, setCurrentRole] = useState<WorkspaceRole>('Admin')
  const [members, setMembers] = useState<TeamMemberRow[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('Engineer')
  const [teamFeedback, setTeamFeedback] = useState('')

  const [pipelines, setPipelines] = useState<PipelineRun[]>([])
  const [pipelineService, setPipelineService] = useState('devpulse-api-gateway')
  const [pipelineBranch, setPipelineBranch] = useState('main')
  const [triggeringBuild, setTriggeringBuild] = useState(false)
  const [pipelineFeedback, setPipelineFeedback] = useState('')

  // WebAuthn Hardware Passkeys State
  const [passkeys, setPasskeys] = useState<PasskeyRow[]>([])
  const [passkeyLabel, setPasskeyLabel] = useState('Windows Hello / Laptop Key')
  const [registeringPasskey, setRegisteringPasskey] = useState(false)
  const [passkeyFeedback, setPasskeyFeedback] = useState('')

  const fetchSecurityLogs = async () => {
    try {
      const res = await fetch(SECURITY_LOGS_URL, { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) {
          setSecurityLogs(json.data)
        }
      }
    } catch {
      // Ignore transient errors
    }
  }

  const fetchTeamWorkspace = async () => {
    try {
      const res = await fetch(TEAMS_URL, { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          setOrgName(json.organization.name)
          setCurrentRole(json.organization.currentRole)
          setMembers(json.members)
        }
      }
    } catch {
      // Ignore transient errors
    }
  }

  const fetchPipelines = async () => {
    try {
      const res = await fetch(PIPELINES_URL, { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) {
          setPipelines(json.data)
        }
      }
    } catch {
      // Ignore transient errors
    }
  }

  const fetchPasskeys = async () => {
    try {
      const res = await fetch(PASSKEYS_URL, { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) {
          setPasskeys(json.data)
        }
      }
    } catch {
      // Ignore transient errors
    }
  }

  useEffect(() => {
    const controller = new AbortController()

    async function loadInitialData() {
      try {
        setLoadingProjects(true)
        setApiError('')

        const response = await fetch(API_URL, {
          signal: controller.signal,
          credentials: 'include',
        })

        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Unable to load projects.')
        }

        const payload = result as ProjectsResponse
        const mapped = payload.data.map(mapProject)
        setProjects(mapped)
        if (mapped[0]?.name) {
          setPipelineService(mapped[0].name.toLowerCase().replace(/\s+/g, '-'))
        }

        await Promise.all([
          fetchSecurityLogs(),
          fetchTeamWorkspace(),
          fetchPipelines(),
          fetchPasskeys(),
        ])
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return

        setApiError(
          error instanceof Error
            ? error.message
            : 'Unable to connect to the projects service.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setLoadingProjects(false)
        }
      }
    }

    void loadInitialData()

    return () => controller.abort()
  }, [])

  const metrics = useMemo(() => {
    const total = projects.length
    const active = projects.filter((p) => p.rawStatus === 'active').length
    const completed = projects.filter((p) => p.rawStatus === 'completed').length
    const archived = projects.filter((p) => p.rawStatus === 'archived').length
    const highPriority = projects.filter((p) => p.priority === 'high').length
    const mediumPriority = projects.filter((p) => p.priority === 'medium').length
    const lowPriority = projects.filter((p) => p.priority === 'low').length
    return {
      total,
      active,
      completed,
      archived,
      highPriority,
      mediumPriority,
      lowPriority,
    }
  }, [projects])

  const liveTelemetryChart = useMemo(
    () => [
      { category: 'Active', count: metrics.active },
      { category: 'Completed', count: metrics.completed },
      { category: 'Archived', count: metrics.archived },
      { category: 'High SLA', count: metrics.highPriority },
      { category: 'Medium SLA', count: metrics.mediumPriority },
      { category: 'Low SLA', count: metrics.lowPriority },
    ],
    [metrics],
  )

  const filteredProjects = useMemo(
    () =>
      projects.filter((project) => {
        const matchesSearch = `${project.name} ${project.description}`
          .toLowerCase()
          .includes(search.toLowerCase())
        const matchesStatus =
          statusFilter === 'all' || project.rawStatus === statusFilter
        return matchesSearch && matchesStatus
      }),
    [projects, search, statusFilter],
  )

  const openCreateModal = () => {
    setEditingProject(null)
    setNewProjectName('')
    setNewProjectDescription('')
    setProjectStatus('active')
    setProjectPriority('medium')
    setApiError('')
    setShowModal(true)
  }

  const openEditModal = (project: Project) => {
    setEditingProject(project)
    setNewProjectName(project.name)
    setNewProjectDescription(project.description)
    setProjectStatus(project.rawStatus)
    setProjectPriority(project.priority)
    setApiError('')
    setShowModal(true)
  }

  const closeProjectModal = () => {
    if (savingProject) return
    setShowModal(false)
    setEditingProject(null)
    setApiError('')
  }

  const saveProject = async () => {
    const name = newProjectName.trim()
    if (!name || savingProject) return

    const isEditing = editingProject !== null

    try {
      setSavingProject(true)
      setApiError('')

      const response = await fetch(
        isEditing ? `${API_URL}/${editingProject.id}` : API_URL,
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name,
            description: newProjectDescription.trim(),
            status: projectStatus,
            priority: projectPriority,
          }),
        },
      )

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            (isEditing ? 'Unable to update project.' : 'Unable to create project.'),
        )
      }

      const savedProject = mapProject(
        (result as { data: ProjectsResponse['data'][number] }).data,
      )

      if (isEditing) {
        setProjects((current) =>
          current.map((project) =>
            project.id === savedProject.id ? savedProject : project,
          ),
        )
      } else {
        setProjects((current) => [savedProject, ...current])
      }

      setShowModal(false)
      setEditingProject(null)
      setNewProjectName('')
      setNewProjectDescription('')
      setApiError('')
      await fetchSecurityLogs()
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : 'Unable to save project.',
      )
    } finally {
      setSavingProject(false)
    }
  }

  const handleQuickStatusChange = async (
    project: Project,
    nextStatus: BackendStatus,
  ) => {
    const previousProjects = [...projects]

    setProjects((current) =>
      current.map((item) =>
        item.id === project.id
          ? mapProject({
              id: item.id,
              name: item.name,
              description: item.description,
              status: nextStatus,
              priority: item.priority,
            })
          : item,
      ),
    )

    try {
      const response = await fetch(`${API_URL}/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: nextStatus }),
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to update status.')
      }
      await fetchSecurityLogs()
    } catch (error) {
      setProjects(previousProjects)
      setApiError(
        error instanceof Error ? error.message : 'Status update failed.',
      )
    }
  }

  const deleteProject = async (project: Project) => {
    const confirmed = window.confirm(
      `Delete "${project.name}"? This action cannot be undone.`,
    )

    if (!confirmed || deletingProjectId) return

    try {
      setDeletingProjectId(project.id)
      setApiError('')

      const response = await fetch(`${API_URL}/${project.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to delete project.')
      }

      setProjects((current) =>
        current.filter((item) => item.id !== project.id),
      )

      if (editingProject?.id === project.id) {
        setShowModal(false)
        setEditingProject(null)
      }
      await fetchSecurityLogs()
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : 'Unable to delete project.',
      )
    } finally {
      setDeletingProjectId(null)
    }
  }

  const runSecurityAudit = async () => {
    setAuditingSecurity(true)
    await fetchSecurityLogs()
    setTimeout(() => {
      setAuditingSecurity(false)
    }, 450)
  }

  const triggerPipelineBuild = async () => {
    if (triggeringBuild) return
    setTriggeringBuild(true)
    setPipelineFeedback('')

    try {
      const res = await fetch(`${PIPELINES_URL}/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          service: pipelineService.trim() || 'devpulse-core-service',
          branch: pipelineBranch.trim() || 'main',
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to trigger build.')
      }

      setPipelines((prev) => [data.data, ...prev])
      setPipelineFeedback(
        `Build ${data.data.run_code} persisted to PostgreSQL & logged in SIEM audit stream.`,
      )
      await fetchSecurityLogs()

      setTimeout(() => {
        void fetchPipelines()
      }, 1800)
    } catch (err) {
      setPipelineFeedback(
        err instanceof Error ? err.message : 'Pipeline trigger failed.',
      )
    } finally {
      setTriggeringBuild(false)
    }
  }

  const handleRegisterPasskey = async () => {
    if (registeringPasskey) return
    setRegisteringPasskey(true)
    setPasskeyFeedback('')

    try {
      const optRes = await fetch(`${PASSKEYS_URL}/register/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      const optData = await optRes.json()
      if (!optRes.ok || !optData.success) {
        throw new Error(optData.message || 'Unable to generate Passkey options.')
      }

      const credential = await startRegistration({ optionsJSON: optData.options })

      const verifyRes = await fetch(`${PASSKEYS_URL}/register/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          credential,
          label: passkeyLabel.trim() || 'Windows Hello / Security Key',
        }),
      })
      const verifyData = await verifyRes.json()
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.message || 'Passkey verification failed.')
      }

      setPasskeyFeedback(
        'Hardware Passkey enrolled in PostgreSQL! Security Hardening Score is now 100%.',
      )
      await Promise.all([fetchPasskeys(), fetchSecurityLogs()])
    } catch (err) {
      setPasskeyFeedback(
        err instanceof Error
          ? err.message
          : 'Passkey registration cancelled or unsupported on this device.',
      )
    } finally {
      setRegisteringPasskey(false)
    }
  }

  const handleRemovePasskey = async (id: string) => {
    setPasskeyFeedback('')
    try {
      await fetch(`${PASSKEYS_URL}/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      await Promise.all([fetchPasskeys(), fetchSecurityLogs()])
    } catch {
      // Ignore
    }
  }

  const handleAddMember = async () => {
    if (!inviteEmail.trim()) return
    setTeamFeedback('')
    try {
      const res = await fetch(`${TEAMS_URL}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Unable to add member.')
      }
      setInviteEmail('')
      setTeamFeedback('Member saved to PostgreSQL RBAC directory.')
      await Promise.all([fetchTeamWorkspace(), fetchSecurityLogs()])
    } catch (err) {
      setTeamFeedback(
        err instanceof Error ? err.message : 'Failed to invite member.',
      )
    }
  }

  const handleRoleUpdate = async (memberId: string, newRole: WorkspaceRole) => {
    setTeamFeedback('')
    try {
      const res = await fetch(`${TEAMS_URL}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Unable to update role.')
      }
      setTeamFeedback('RBAC role updated in PostgreSQL.')
      await Promise.all([fetchTeamWorkspace(), fetchSecurityLogs()])
    } catch (err) {
      setTeamFeedback(
        err instanceof Error ? err.message : 'Role update failed.',
      )
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    setTeamFeedback('')
    try {
      const res = await fetch(`${TEAMS_URL}/members/${memberId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Unable to remove member.')
      }
      setTeamFeedback('Member access revoked.')
      await Promise.all([fetchTeamWorkspace(), fetchSecurityLogs()])
    } catch (err) {
      setTeamFeedback(
        err instanceof Error ? err.message : 'Member removal failed.',
      )
    }
  }

  const hasPasskeyEnrolled = passkeys.length > 0

  const securityControls = [
    {
      name: 'Bcrypt Password Hashing & Session Store',
      tech: 'bcryptjs (12 rounds) + connect-pg-simple',
      active: true,
    },
    {
      name: 'Multi-Tenant RBAC & Owner Isolation',
      tech: 'PostgreSQL organizations + owner_id enforcement',
      active: true,
    },
    {
      name: 'Persistent CI/CD & Webhook Audit Trail',
      tech: 'PostgreSQL pipeline_runs + SIEM ingestion',
      active: true,
    },
    {
      name: 'HTTP Security Headers & Brute-Force Guard',
      tech: 'Helmet + CORS + express-rate-limit + Zod',
      active: true,
    },
    {
      name: 'Hardware WebAuthn / Passkey MFA',
      tech: '@simplewebauthn/server (Enroll in Settings)',
      active: hasPasskeyEnrolled,
    },
  ]

  const activeDefenseCount = securityControls.filter((c) => c.active).length
  const hardeningScore = Math.round(
    (activeDefenseCount / securityControls.length) * 100,
  )

  const blockedAttemptsCount = securityLogs.filter(
    (log) => log.status === 'blocked',
  ).length

  const navigation = [
    { label: 'Overview', icon: LayoutDashboard },
    { label: 'Projects', icon: Boxes, count: metrics.total },
    { label: 'Security', icon: ShieldCheck, count: blockedAttemptsCount },
    { label: 'Pipelines', icon: GitBranch, count: pipelines.length },
    { label: 'Teams', icon: Users, count: members.length },
  ]

  const userInitials = user.email.slice(0, 2).toUpperCase()

  const renderProjectsPanel = () => (
    <div className="panel projects-panel">
      <div className="panel-header">
        <div>
          <h3>Managed Projects Registry</h3>
          <p>
            Owner-isolated PostgreSQL projects ({filteredProjects.length} of{' '}
            {metrics.total} shown)
          </p>
        </div>
        {activePage === 'Overview' && (
          <button
            className="text-button"
            onClick={() => setActivePage('Projects')}
          >
            Full view <ArrowUpRight size={15} />
          </button>
        )}
      </div>

      <div
        className="filter-pills"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '16px',
        }}
      >
        {(
          [
            { key: 'all', label: `All (${metrics.total})` },
            { key: 'active', label: `In Progress (${metrics.active})` },
            { key: 'completed', label: `Completed (${metrics.completed})` },
            { key: 'archived', label: `Archived (${metrics.archived})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            className={`filter-pill ${statusFilter === tab.key ? 'active' : ''}`}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #293548',
              background: statusFilter === tab.key ? '#6366f1' : '#0f172a',
              color: statusFilter === tab.key ? '#fff' : '#94a3b8',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onClick={() => setStatusFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="projects-list">
        {loadingProjects && (
          <div className="empty-state">
            <p>Loading projects from PostgreSQL...</p>
          </div>
        )}

        {apiError && (
          <div className="empty-state" role="alert">
            <p>{apiError}</p>
          </div>
        )}

        {!loadingProjects && !apiError && filteredProjects.length > 0 ? (
          filteredProjects.map((project) => (
            <div className="project-row" key={project.id}>
              <div className={`project-symbol ${project.color}`}>
                <Code2 size={19} />
              </div>
              <div className="project-main">
                <div className="project-title-row">
                  <strong>{project.name}</strong>
                  <span
                    className={`project-status ${project.status
                      .toLowerCase()
                      .replace(' ', '-')}`}
                  >
                    {project.status}
                  </span>
                </div>
                <p>{project.description || 'No description provided.'}</p>
                <div className="project-priority">
                  Priority: <strong>{project.priority.toUpperCase()}</strong>
                </div>
              </div>
              <div className="project-actions">
                <select
                  aria-label={`Change status for ${project.name}`}
                  className="inline-status-select"
                  value={project.rawStatus}
                  onChange={(event) =>
                    void handleQuickStatusChange(
                      project,
                      event.target.value as BackendStatus,
                    )
                  }
                >
                  <option value="active">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
                <button
                  className="project-action-button"
                  onClick={() => openEditModal(project)}
                  aria-label={`Edit ${project.name}`}
                  title="Edit project"
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="project-action-button delete"
                  onClick={() => void deleteProject(project)}
                  disabled={deletingProjectId === project.id}
                  aria-label={`Delete ${project.name}`}
                  title="Delete project"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        ) : (
          !loadingProjects &&
          !apiError && (
            <div className="empty-state">
              <Search size={22} />
              <p>
                No projects match your current filter. Click "New Project" to
                create one.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  )

  const renderSecurityCenter = () => (
    <div className="security-section">
      <div className="security-banner">
        <div className="security-banner-left">
          <div className="security-shield-badge">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2>DevSecOps Security Operations Center</h2>
            <p>
              Workspace <strong>{orgName}</strong> · Role:{' '}
              <strong>{currentRole}</strong> · Live PostgreSQL SIEM audit stream
            </p>
          </div>
        </div>
        <div className="security-banner-right">
          <div className="security-score-box">
            <span>Hardening Score</span>
            <strong>{hardeningScore}%</strong>
          </div>
          {!hasPasskeyEnrolled && (
            <button
              className="primary-button"
              onClick={() => setActivePage('Settings')}
              style={{ fontSize: '12px', padding: '9px 14px' }}
            >
              <Fingerprint size={14} /> Enroll Passkey (100%)
            </button>
          )}
          <button
            className="secondary-button"
            onClick={() => void runSecurityAudit()}
            disabled={auditingSecurity}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 14px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <RefreshCw size={14} />
            {auditingSecurity ? 'Refreshing...' : 'Refresh Audit Logs'}
          </button>
        </div>
      </div>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-top">
            <span>Active Defense Layers</span>
            <div className="stat-icon green-bg">
              <Lock size={19} />
            </div>
          </div>
          <div className="stat-value">
            0{activeDefenseCount} / 0{securityControls.length}
          </div>
          <div className="stat-footer">
            <span className="trend positive">
              <CheckCircle2 size={14} /> Enforced
            </span>
            <span>RBAC, Bcrypt, CI/CD & WebAuthn</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>Blocked Intrusion Events</span>
            <div className="stat-icon orange-bg">
              <ShieldAlert size={19} />
            </div>
          </div>
          <div className="stat-value">
            {blockedAttemptsCount.toString().padStart(2, '0')}
          </div>
          <div className="stat-footer">
            <span className="trend positive">
              <ArrowUpRight size={14} /> Real DB
            </span>
            <span>Recorded in `security_logs`</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>Hardware Passkeys</span>
            <div className="stat-icon purple-bg">
              <Fingerprint size={19} />
            </div>
          </div>
          <div className="stat-value">
            {passkeys.length.toString().padStart(2, '0')}
          </div>
          <div className="stat-footer">
            <span>
              {hasPasskeyEnrolled ? 'WebAuthn MFA Active' : 'Enroll in Settings'}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>Persisted Pipeline Runs</span>
            <div className="stat-icon blue-bg">
              <KeyRound size={19} />
            </div>
          </div>
          <div className="stat-value">
            {pipelines.length.toString().padStart(2, '0')}
          </div>
          <div className="stat-footer">
            <span>Stored in `pipeline_runs`</span>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Security Architecture Controls</h3>
              <p>Active middleware & database protection status</p>
            </div>
          </div>
          <div className="security-layer-list">
            {securityControls.map((control, index) => (
              <div className="security-layer-item" key={index}>
                <div>
                  <strong>{control.name}</strong>
                  <small>{control.tech}</small>
                </div>
                <span
                  className={`sec-pill ${control.active ? 'active' : 'pending'}`}
                >
                  {control.active ? 'Active' : 'Enroll Passkey'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Live PostgreSQL Security Audit Stream</h3>
              <p>Real authentication, RBAC & Passkey events from database</p>
            </div>
            <Terminal size={17} color="#8e9bb0" />
          </div>
          <div className="audit-table-wrap">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Security Event</th>
                  <th>Origin IP</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {securityLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{ textAlign: 'center', color: '#8e9bb0' }}
                    >
                      No security events recorded yet.
                    </td>
                  </tr>
                ) : (
                  securityLogs.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.event_code}</strong>
                        <div style={{ fontSize: '10px', color: '#7f91aa' }}>
                          {new Date(item.created_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td>{item.event_message}</td>
                      <td>{item.source_ip}</td>
                      <td>
                        <span className={`sec-pill ${item.status}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-icon">
            <Activity size={22} />
          </div>
          <div>
            <h2>DevPulse</h2>
            <span>DEVSECOPS PLATFORM</span>
          </div>
          
        </div>

        <div className="workspace">
          <div className="workspace-avatar">DP</div>
          <div className="workspace-info">
            <strong>{orgName}</strong>
            <span>Role: {currentRole} · PG18</span>
          </div>
          <ChevronDown size={15} />
        </div>

        <div className="nav-section">
          <span className="nav-heading">WORKSPACE</span>
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                className={`nav-item ${activePage === item.label ? 'active' : ''}`}
                onClick={() => {
                  setActivePage(item.label)
                  setSidebarOpen(false)
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span className="nav-count">{item.count}</span>
                )}
              </button>
            )
          })}
        </div>

        <div className="nav-section tools-section">
          <span className="nav-heading">ACCOUNT & SYSTEM</span>
          <button
            className={`nav-item ${activePage === 'Settings' ? 'active' : ''}`}
            onClick={() => {
              setActivePage('Settings')
              setSidebarOpen(false)
            }}
          >
            <Settings size={18} />
            <span>Settings & Passkeys</span>
          </button>
          <button
            className={`nav-item ${activePage === 'Help Center' ? 'active' : ''}`}
            onClick={() => {
              setActivePage('Help Center')
              setSidebarOpen(false)
            }}
          >
            <CircleHelp size={18} />
            <span>Architecture Docs</span>
          </button>
        </div>

        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="upgrade-icon">
              <Zap size={17} />
            </div>
            <strong>Authenticated Session</strong>
            <p>{user.email}</p>
            <button
              onClick={() => void onLogout()}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                background: '#dc2626',
              }}
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
          <div className="profile">
            <div className="profile-avatar">{userInitials}</div>
            <div className="profile-info">
              <strong>{user.email.split('@')[0]}</strong>
              <span>{currentRole} · Verified</span>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu size={21} />
            </button>
            <div className="breadcrumb">
              <span>{orgName}</span>
              <span className="breadcrumb-separator">/</span>
              <strong>{activePage}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="top-search">
              <Search size={16} />
              <input
                type="search"
                placeholder="Search projects..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <kbd>Ctrl K</kbd>
            </div>
            <div className="notification-wrapper">
              <button
                className="icon-button notification-button"
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="Notifications"
              >
                <Bell size={19} />
                <span className="notification-dot" />
              </button>
              {showNotifications && (
                <div className="notification-popover">
                  <div className="popover-heading">
                    <strong>Security & Telemetry Alerts</strong>
                  </div>
                  <p>
                    Signed in as {user.email} ({currentRole}). Hardening:{' '}
                    {hardeningScore}%.
                  </p>
                  <button onClick={() => setShowNotifications(false)}>
                    Close
                  </button>
                </div>
              )}
            </div>
            <div className="top-avatar" title={user.email}>
              {userInitials}
            </div>
          </div>
        </header>

        <div className="page-container">
          <section className="welcome-section">
            <div>
              <div className="eyebrow">
                <span className="status-pulse" />
                MULTI-TENANT RBAC & WEBAUTHN WORKSPACE
              </div>
              <h1>
                Welcome back, Hit Bharadiya{' '}
                <span>
                  <Sparkles size={22} style={{ display: 'inline' }} />
                </span>
              </h1>
              <p>
                Owner-isolated PostgreSQL projects, RBAC team governance,
                persistent CI/CD pipelines, and hardware Passkey MFA.
              </p>
            </div>
            <button className="primary-button" onClick={openCreateModal}>
              <Plus size={18} />
              New Project
            </button>
          </section>

          {activePage === 'Overview' && (
            <>
              <section className="stats-grid">
                <div className="stat-card">
                  <div className="stat-top">
                    <span>Total Projects</span>
                    <div className="stat-icon purple-bg">
                      <Boxes size={19} />
                    </div>
                  </div>
                  <div className="stat-value">
                    {metrics.total.toString().padStart(2, '0')}
                  </div>
                  <div className="stat-footer">
                    <span className="trend positive">
                      <ArrowUpRight size={14} /> Live DB
                    </span>
                    <span>Owner isolated</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-top">
                    <span>Active Projects</span>
                    <div className="stat-icon blue-bg">
                      <GitBranch size={19} />
                    </div>
                  </div>
                  <div className="stat-value">
                    {metrics.active.toString().padStart(2, '0')}
                  </div>
                  <div className="stat-footer">
                    <span className="trend positive">
                      <ArrowUpRight size={14} /> In Progress
                    </span>
                    <span>Active engineering</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-top">
                    <span>High Priority SLA</span>
                    <div className="stat-icon orange-bg">
                      <AlertTriangle size={19} />
                    </div>
                  </div>
                  <div className="stat-value">
                    {metrics.highPriority.toString().padStart(2, '0')}
                  </div>
                  <div className="stat-footer">
                    <span className="trend negative">
                      <ArrowDownRight size={14} /> Critical SLA
                    </span>
                    <span>Requires close tracking</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-top">
                    <span>Security Hardening</span>
                    <div className="stat-icon green-bg">
                      <ShieldCheck size={19} />
                    </div>
                  </div>
                  <div className="stat-value">{hardeningScore}%</div>
                  <div className="stat-footer">
                    <span className="trend positive">
                      <Check size={14} /> {activeDefenseCount} Guards
                    </span>
                    <span>
                      {hasPasskeyEnrolled
                        ? 'Passkey MFA Active'
                        : 'Add Passkey for 100%'}
                    </span>
                  </div>
                </div>
              </section>

              <section className="dashboard-grid">
                <div className="panel performance-panel">
                  <div className="panel-header">
                    <div>
                      <h3>Live PostgreSQL Workspace Distribution</h3>
                      <p>
                        Real-time breakdown of project lifecycle & SLA priority
                        (updates instantly on CRUD)
                      </p>
                    </div>
                    <span className="select-button">Live Telemetry</span>
                  </div>

                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={liveTelemetryChart}
                        margin={{ top: 10, right: 12, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid
                          stroke="rgba(148, 163, 184, 0.1)"
                          strokeDasharray="3 5"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="category"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#94a3b8', fontSize: 12 }}
                          dy={8}
                        />
                        <YAxis
                          allowDecimals={false}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#94a3b8', fontSize: 12 }}
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                          contentStyle={{
                            background: '#171e2d',
                            border: '1px solid #30394c',
                            borderRadius: '10px',
                            color: '#fff',
                          }}
                        />
                        <Bar
                          dataKey="count"
                          name="Projects"
                          fill="#3b82f6"
                          radius={[6, 6, 0, 0]}
                          barSize={38}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="panel pipeline-panel">
                  <div className="panel-header">
                    <div>
                      <h3>System & Pipeline Health</h3>
                      <p>Live backend & database posture</p>
                    </div>
                    <Server size={16} color="#8e9bb0" />
                  </div>

                  <div className="pipeline-score">
                    <div className="score-ring">
                      <div className="score-inner">
                        <strong>
                          {hardeningScore}
                          <span>%</span>
                        </strong>
                        <small>Secured</small>
                      </div>
                    </div>
                  </div>

                  <div className="pipeline-details">
                    <div>
                      <span className="detail-dot green-dot" /> Hardware
                      Passkeys <strong>{passkeys.length}</strong>
                    </div>
                    <div>
                      <span className="detail-dot yellow-dot" /> Pipeline Runs{' '}
                      <strong>{pipelines.length}</strong>
                    </div>
                    <div>
                      <span className="detail-dot red-dot" /> Blocked Attacks{' '}
                      <strong>{blockedAttemptsCount}</strong>
                    </div>
                  </div>
                  <div className="pipeline-footer">
                    <span>
                      <Check size={14} /> PostgreSQL & RBAC Engine Online
                    </span>
                  </div>
                </div>
              </section>

              <section className="bottom-grid" style={{ marginBottom: '20px' }}>
                {renderProjectsPanel()}

                <div className="panel activity-panel">
                  <div className="panel-header">
                    <div>
                      <h3>Recent Security & Audit Events</h3>
                      <p>Live events from PostgreSQL `security_logs`</p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setActivePage('Security')}
                    >
                      All logs <ArrowUpRight size={14} />
                    </button>
                  </div>

                  <div className="activity-list">
                    {securityLogs.slice(0, 4).map((log) => (
                      <div className="activity-item" key={log.id}>
                        <div
                          className={`activity-icon ${
                            log.status === 'blocked' ? 'orange' : 'green'
                          }`}
                        >
                          <ShieldCheck size={16} />
                        </div>
                        <div className="activity-content">
                          <strong>{log.event_code}</strong>
                          <p>{log.event_message}</p>
                          <span>
                            <Clock3 size={12} />{' '}
                            {new Date(log.created_at).toLocaleTimeString()} ·{' '}
                            {log.source_ip}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </>
          )}

          {activePage === 'Projects' && renderProjectsPanel()}

          {activePage === 'Security' && renderSecurityCenter()}

          {activePage === 'Pipelines' && (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3>PostgreSQL Persistent CI/CD Pipeline Runner</h3>
                  <p>
                    Trigger real database-persisted builds & ingest GitHub
                    webhooks (`/api/pipelines/webhook`)
                  </p>
                </div>
                <button
                  className="secondary-button"
                  onClick={() => void fetchPipelines()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '9px',
                    fontSize: '12px',
                  }}
                >
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>

              {pipelineFeedback && (
                <div
                  style={{
                    marginBottom: '14px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#6ee7b7',
                    fontSize: '12px',
                  }}
                >
                  {pipelineFeedback}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '10px',
                  marginBottom: '18px',
                }}
              >
                <input
                  type="text"
                  value={pipelineService}
                  onChange={(e) => setPipelineService(e.target.value)}
                  placeholder="Service name (e.g. aximam-ai-core)"
                  style={{
                    flex: '1 1 220px',
                    padding: '10px 12px',
                    borderRadius: '9px',
                    border: '1px solid #2a374b',
                    background: '#0b1423',
                    color: '#fff',
                  }}
                />
                <input
                  type="text"
                  value={pipelineBranch}
                  onChange={(e) => setPipelineBranch(e.target.value)}
                  placeholder="Branch (e.g. main)"
                  style={{
                    flex: '0 1 160px',
                    padding: '10px 12px',
                    borderRadius: '9px',
                    border: '1px solid #2a374b',
                    background: '#0b1423',
                    color: '#fff',
                  }}
                />
                <button
                  className="primary-button"
                  disabled={triggeringBuild}
                  onClick={() => void triggerPipelineBuild()}
                >
                  <Play size={15} />
                  {triggeringBuild ? 'Triggering...' : 'Trigger & Persist Build'}
                </button>
              </div>

              <div className="audit-table-wrap">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Run ID</th>
                      <th>Service</th>
                      <th>Branch</th>
                      <th>Commit</th>
                      <th>Triggered By</th>
                      <th>Duration</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pipelines.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          style={{ textAlign: 'center', color: '#8e9bb0' }}
                        >
                          No pipeline runs recorded yet. Click "Trigger & Persist
                          Build" above.
                        </td>
                      </tr>
                    ) : (
                      pipelines.map((run) => (
                        <tr key={run.id}>
                          <td>
                            <strong>{run.run_code}</strong>
                          </td>
                          <td>{run.service}</td>
                          <td>{run.branch}</td>
                          <td>
                            <code>{run.commit_sha}</code>
                          </td>
                          <td>{run.triggered_by}</td>
                          <td>{run.duration}</td>
                          <td>
                            <span
                              className={`sec-pill ${
                                run.status === 'passed'
                                  ? 'verified'
                                  : run.status === 'failed'
                                    ? 'blocked'
                                    : 'monitored'
                              }`}
                            >
                              {run.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activePage === 'Teams' && (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3>PostgreSQL RBAC Team & Access Directory</h3>
                  <p>
                    Organization: <strong>{orgName}</strong> · Your Role:{' '}
                    <strong>{currentRole}</strong>
                  </p>
                </div>
              </div>

              {teamFeedback && (
                <div
                  style={{
                    marginBottom: '14px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(59, 130, 246, 0.12)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    color: '#93c5fd',
                    fontSize: '12px',
                  }}
                >
                  {teamFeedback}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '10px',
                  marginBottom: '18px',
                }}
              >
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="engineer@company.com"
                  style={{
                    flex: '1 1 240px',
                    padding: '10px 12px',
                    borderRadius: '9px',
                    border: '1px solid #2a374b',
                    background: '#0b1423',
                    color: '#fff',
                  }}
                />
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as WorkspaceRole)
                  }
                  style={{
                    padding: '10px 12px',
                    borderRadius: '9px',
                    border: '1px solid #2a374b',
                    background: '#0b1423',
                    color: '#fff',
                  }}
                >
                  <option value="Engineer">Engineer</option>
                  <option value="DevSecOps">DevSecOps</option>
                  <option value="Viewer">Viewer (Read-Only)</option>
                  <option value="Admin">Admin</option>
                </select>
                <button
                  className="primary-button"
                  onClick={() => void handleAddMember()}
                >
                  <UserPlus size={15} /> Save Member to DB
                </button>
              </div>

              <div className="audit-table-wrap">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Member Email</th>
                      <th>RBAC Role</th>
                      <th>Status</th>
                      <th>Added At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => {
                      const isSelf =
                        member.member_email.toLowerCase() ===
                        user.email.toLowerCase()
                      return (
                        <tr key={member.id}>
                          <td>
                            <strong>{member.member_email}</strong>
                          </td>
                          <td>
                            <select
                              className="inline-status-select"
                              value={member.role}
                              disabled={isSelf || currentRole !== 'Admin'}
                              onChange={(e) =>
                                void handleRoleUpdate(
                                  member.id,
                                  e.target.value as WorkspaceRole,
                                )
                              }
                            >
                              <option value="Admin">Admin</option>
                              <option value="DevSecOps">DevSecOps</option>
                              <option value="Engineer">Engineer</option>
                              <option value="Viewer">Viewer</option>
                            </select>
                          </td>
                          <td>
                            <span className="sec-pill verified">
                              {member.status}
                            </span>
                          </td>
                          <td>
                            {new Date(member.added_at).toLocaleDateString()}
                          </td>
                          <td>
                            {!isSelf && currentRole === 'Admin' ? (
                              <button
                                className="project-action-button delete"
                                onClick={() =>
                                  void handleRemoveMember(member.id)
                                }
                                title="Revoke access"
                              >
                                <Trash2 size={14} />
                              </button>
                            ) : (
                              <span style={{ color: '#64748b', fontSize: '11px' }}>
                                Owner
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activePage === 'Settings' && (
            <div style={{ display: 'grid', gap: '20px' }}>
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Hardware WebAuthn / Passkey MFA Enrollment</h3>
                    <p>
                      Register Windows Hello, Fingerprint, or USB Security Key in
                      PostgreSQL (`user_passkeys`) for 100% hardening
                    </p>
                  </div>
                </div>

                {passkeyFeedback && (
                  <div
                    style={{
                      marginBottom: '14px',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#6ee7b7',
                      fontSize: '12px',
                    }}
                  >
                    {passkeyFeedback}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px',
                    marginBottom: '18px',
                  }}
                >
                  <input
                    type="text"
                    value={passkeyLabel}
                    onChange={(e) => setPasskeyLabel(e.target.value)}
                    placeholder="Device label (e.g. HP Laptop Windows Hello)"
                    style={{
                      flex: '1 1 240px',
                      padding: '10px 12px',
                      borderRadius: '9px',
                      border: '1px solid #2a374b',
                      background: '#0b1423',
                      color: '#fff',
                    }}
                  />
                  <button
                    className="primary-button"
                    disabled={registeringPasskey}
                    onClick={() => void handleRegisterPasskey()}
                  >
                    <Fingerprint size={16} />
                    {registeringPasskey
                      ? 'Waiting for Device Prompt...'
                      : 'Register Hardware Passkey'}
                  </button>
                </div>

                <div className="audit-table-wrap">
                  <table className="audit-table">
                    <thead>
                      <tr>
                        <th>Device Label</th>
                        <th>Authenticator Type</th>
                        <th>Enrolled Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {passkeys.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            style={{ textAlign: 'center', color: '#8e9bb0' }}
                          >
                            No hardware passkeys enrolled yet. Click "Register
                            Hardware Passkey" above.
                          </td>
                        </tr>
                      ) : (
                        passkeys.map((pk) => (
                          <tr key={pk.id}>
                            <td>
                              <strong>{pk.label}</strong>
                            </td>
                            <td>
                              <span className="sec-pill verified">
                                {pk.device_type}
                              </span>
                            </td>
                            <td>
                              {new Date(pk.created_at).toLocaleDateString()}
                            </td>
                            <td>
                              <button
                                className="project-action-button delete"
                                onClick={() => void handleRemovePasskey(pk.id)}
                                title="Remove passkey"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Account & Security Session Settings</h3>
                    <p>Active PostgreSQL user profile and RBAC session controls</p>
                  </div>
                  <button
                    className="primary-button"
                    onClick={() => void onLogout()}
                    style={{ background: '#dc2626', borderColor: '#ef4444' }}
                  >
                    <LogOut size={15} /> Sign Out of Session
                  </button>
                </div>
                <div className="security-layer-list">
                  <div className="security-layer-item">
                    <div>
                      <strong>Authenticated User Email</strong>
                      <small>{user.email}</small>
                    </div>
                    <span className="sec-pill verified">Verified</span>
                  </div>
                  <div className="security-layer-item">
                    <div>
                      <strong>Assigned Workspace & RBAC Role</strong>
                      <small>
                        {orgName} · Role: {currentRole}
                      </small>
                    </div>
                    <span className="sec-pill active">{currentRole}</span>
                  </div>
                  <div className="security-layer-item">
                    <div>
                      <strong>User UUID (PostgreSQL)</strong>
                      <small>{user.id}</small>
                    </div>
                    <span className="sec-pill active">Primary Key</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePage === 'Help Center' && (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3>DevPulse Architecture Documentation</h3>
                  <p>Full-stack security and database architecture overview</p>
                </div>
              </div>
              <div className="security-layer-list">
                <div className="security-layer-item">
                  <div>
                    <strong>Frontend Stack</strong>
                    <small>
                      React 19 + TypeScript + Vite + Recharts + @simplewebauthn/browser
                    </small>
                  </div>
                  <span className="sec-pill active">Connected</span>
                </div>
                <div className="security-layer-item">
                  <div>
                    <strong>Backend & Security Stack</strong>
                    <small>
                      Express 5 + Helmet + Zod + Bcryptjs + Express-Session +
                      RBAC + WebAuthn
                    </small>
                  </div>
                  <span className="sec-pill active">Connected</span>
                </div>
                <div className="security-layer-item">
                  <div>
                    <strong>Database Tables (PostgreSQL 18)</strong>
                    <small>
                      `users`, `session`, `organizations`,
                      `organization_members`, `projects`, `pipeline_runs`,
                      `user_passkeys`, `security_logs`
                    </small>
                  </div>
                  <span className="sec-pill verified">Operational</span>
                </div>
              </div>
            </div>
          )}

          <footer className="dashboard-footer">
            <span>2026 DevPulse Enterprise Platform. All rights reserved.</span>
            <span>
              <span className="footer-status" /> PostgreSQL, RBAC, CI/CD &
              WebAuthn Engine Operational
            </span>
          </footer>
        </div>
      </main>

      {showModal && (
        <div className="modal-backdrop" onClick={closeProjectModal}>
          <div
            className="project-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>{editingProject ? 'Edit Project' : 'Create New Project'}</h2>
                <p>
                  {editingProject
                    ? 'Update your project details and settings.'
                    : 'Add a new owner-isolated project to PostgreSQL.'}
                </p>
              </div>
              <button
                className="icon-button"
                onClick={closeProjectModal}
                aria-label="Close modal"
                disabled={savingProject}
              >
                <X size={19} />
              </button>
            </div>

            {apiError && (
              <div className="modal-error" role="alert">
                {apiError}
              </div>
            )}

            <label htmlFor="project-name">Project Name</label>
            <input
              id="project-name"
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              placeholder="Enter project name"
              maxLength={80}
              disabled={savingProject}
            />

            <label htmlFor="project-description">Description</label>
            <textarea
              id="project-description"
              value={newProjectDescription}
              onChange={(event) => setNewProjectDescription(event.target.value)}
              placeholder="Describe your project"
              maxLength={240}
              disabled={savingProject}
            />

            <label htmlFor="project-status">Project Status</label>
            <select
              id="project-status"
              value={projectStatus}
              onChange={(event) =>
                setProjectStatus(event.target.value as BackendStatus)
              }
              disabled={savingProject}
            >
              <option value="active">In Progress</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>

            <label htmlFor="project-priority">Priority</label>
            <select
              id="project-priority"
              value={projectPriority}
              onChange={(event) =>
                setProjectPriority(event.target.value as BackendPriority)
              }
              disabled={savingProject}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>

            <div className="modal-actions">
              <button
                className="secondary-button"
                onClick={closeProjectModal}
                disabled={savingProject}
              >
                Cancel
              </button>
              <button
                className="primary-button"
                onClick={() => void saveProject()}
                disabled={!newProjectName.trim() || savingProject}
              >
                {editingProject ? <Pencil size={16} /> : <Plus size={16} />}
                {savingProject
                  ? 'Saving...'
                  : editingProject
                    ? 'Save Changes'
                    : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard




