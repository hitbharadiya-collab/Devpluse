import { useState, type FormEvent } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  FolderGit2,
  GitBranch,
  Play,
  Plus,
  Search,
  Server,
  Terminal,
  X,
  XCircle,
} from 'lucide-react'
import { BUILD_TREND_DATA } from '../../data/mockDevPulse'
import type { AuditEvent, DevProject, NavRoute, PipelineRun, VulnerabilityFinding } from '../../types/devpulse'
import { DemoDataPill, HealthBadge, PipelineBadge } from './UiBadges'

interface OverviewViewProps {
  projects: DevProject[]
  pipelines: PipelineRun[]
  vulnerabilities: VulnerabilityFinding[]
  events: AuditEvent[]
  onNavigate: (route: NavRoute) => void
  onTriggerPipeline: () => void
}

export function OverviewView({
  projects,
  pipelines,
  vulnerabilities,
  events,
  onNavigate,
  onTriggerPipeline,
}: OverviewViewProps) {
  const activePipelines = pipelines.filter((p) => p.status === 'Running' || p.status === 'Queued').length
  const successfulBuilds = 324 + pipelines.filter((p) => p.status === 'Success').length
  const failedBuilds = 12 + pipelines.filter((p) => p.status === 'Failed').length
  const avgSecurity = Math.round(projects.reduce((acc, p) => acc + p.securityScore, 0) / Math.max(projects.length, 1))
  const successRate = ((successfulBuilds / (successfulBuilds + failedBuilds)) * 100).toFixed(1)

  const vulnDist = [
    { name: 'Critical', value: vulnerabilities.filter((v) => v.severity === 'Critical').length, color: '#f43f5e' },
    { name: 'High', value: vulnerabilities.filter((v) => v.severity === 'High').length, color: '#f59e0b' },
    { name: 'Medium', value: vulnerabilities.filter((v) => v.severity === 'Medium').length, color: '#3b82f6' },
    { name: 'Low', value: vulnerabilities.filter((v) => v.severity === 'Low').length, color: '#06b6d4' },
  ]

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl bg-[#0c101a] border border-slate-800/90 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-cyan-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>ALL CONTROL PLANE CLUSTERS OPERATIONAL</span>
            <DemoDataPill />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            DevOps & DevSecOps Command Overview
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Unified telemetry across CI/CD build pipelines, SAST/SCA vulnerability gates, and production workloads.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('devsecops')}
            className="px-3.5 py-2 rounded-lg bg-[#111827] hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer"
          >
            Security Posture
          </button>
          <button
            type="button"
            onClick={onTriggerPipeline}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-600/20 transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" /> Trigger Pipeline
          </button>
        </div>
      </div>

      {/* 6 Core Enterprise KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Total Projects" value={String(projects.length)} delta="+2 this month" accent="blue" />
        <KpiCard label="Active Pipelines" value={String(activePipelines || 1)} delta="Live runners" accent="cyan" />
        <KpiCard label="Successful Builds" value={String(successfulBuilds)} delta="+14.2% wk" accent="emerald" />
        <KpiCard label="Failed Builds" value={String(failedBuilds)} delta="Policy gated" accent="rose" />
        <KpiCard label="Security Score" value={`${avgSecurity}/100`} delta="SOC2 Ready" accent="purple" />
        <KpiCard label="Pipeline Success" value={`${successRate}%`} delta="30d SLA 99.2%" accent="cyan" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CI/CD Build Throughput & Security Trend */}
        <div className="lg:col-span-2 rounded-xl bg-[#0c101a] border border-slate-800/90 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">CI/CD Build Throughput & Security Gate Trend</h3>
              <p className="text-xs text-slate-400">7-day successful builds vs security policy blocks</p>
            </div>
            <span className="text-xs font-mono text-blue-400 bg-blue-500/10 border border-blue-500/25 px-2.5 py-1 rounded-md">
              7D TELEMETRY
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={BUILD_TREND_DATA}>
                <defs>
                  <linearGradient id="dpBlueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="dpCyanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 8, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="success" name="Successful Builds" stroke="#3b82f6" strokeWidth={2.5} fill="url(#dpBlueGrad)" />
                <Area type="monotone" dataKey="securityScore" name="Security Score" stroke="#06b6d4" strokeWidth={2} fill="url(#dpCyanGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vulnerability Overview Donut */}
        <div className="rounded-xl bg-[#0c101a] border border-slate-800/90 p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Vulnerability Overview</h3>
            <p className="text-xs text-slate-400">Open findings across SAST, SCA & containers</p>
          </div>
          <div className="h-44 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={vulnDist} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={4}>
                  {vulnDist.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 8, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800/80 text-xs">
            {vulnDist.map((item) => (
              <div key={item.name} className="flex items-center justify-between px-2 py-1 rounded bg-[#07090f]">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-mono font-semibold text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline Visualization + System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl bg-[#0c101a] border border-slate-800/90 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Latest CI/CD Pipeline Execution</h3>
              <p className="text-xs text-slate-400">
                {pipelines[0]?.project} · <span className="font-mono text-cyan-400">{pipelines[0]?.branch}</span> ({pipelines[0]?.commit})
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('pipelines')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
            >
              All Pipelines <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {pipelines[0]?.stages.map((st) => (
              <div key={st.name} className="p-3.5 rounded-lg bg-[#07090f] border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-200">{st.name}</span>
                  {st.status === 'passed' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : st.status === 'running' ? (
                    <Clock className="w-4 h-4 text-cyan-400 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                </div>
                <div className="text-[11px] font-mono text-slate-400">Duration: {st.time}</div>
              </div>
            ))}
          </div>

          {/* Recent Projects Mini Table */}
          <div className="mt-5 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Recent Services</h4>
              <button
                type="button"
                onClick={() => onNavigate('projects')}
                className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
              >
                Manage Projects
              </button>
            </div>
            <div className="space-y-2">
              {projects.slice(0, 3).map((proj) => (
                <div
                  key={proj.id}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[#07090f] border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <FolderGit2 className="w-4 h-4 text-blue-400" />
                    <div>
                      <span className="font-semibold text-white">{proj.name}</span>
                      <span className="ml-2 font-mono text-[11px] text-slate-500">{proj.branch}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden sm:inline text-slate-400">Score: {proj.securityScore}%</span>
                    <HealthBadge health={proj.health} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Security Findings Summary & System Status */}
        <div className="rounded-xl bg-[#0c101a] border border-slate-800/90 p-5 flex flex-col justify-between space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">System Infrastructure Status</h3>
            <p className="text-xs text-slate-400 mb-3">Control plane & scanner nodes</p>
            <div className="space-y-2 text-xs">
              {[
                { name: 'Kubernetes Build Runners', latency: '18ms', state: 'Operational' },
                { name: 'Semgrep SAST Engine', latency: '42ms', state: 'Operational' },
                { name: 'Trivy Container Registry', latency: '29ms', state: 'Operational' },
                { name: 'SIEM Audit Log Pipeline', latency: '11ms', state: 'Operational' },
              ].map((sys) => (
                <div key={sys.name} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#07090f] border border-slate-800">
                  <span className="text-slate-300 flex items-center gap-2">
                    <Server className="w-3.5 h-3.5 text-cyan-400" /> {sys.name}
                  </span>
                  <span className="font-mono text-[11px] text-emerald-400">{sys.latency}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Recent Activity</h4>
              <button
                type="button"
                onClick={() => onNavigate('activity')}
                className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
              >
                Audit Log
              </button>
            </div>
            <div className="space-y-2">
              {events.slice(0, 2).map((ev) => (
                <div key={ev.id} className="p-2.5 rounded-lg bg-[#07090f] border border-slate-800 text-xs">
                  <p className="text-slate-200 line-clamp-2">{ev.action}</p>
                  <span className="text-[11px] font-mono text-slate-500 mt-1 block">
                    {ev.actor} · {ev.timestamp}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  delta,
  accent,
}: {
  label: string
  value: string
  delta: string
  accent: 'blue' | 'cyan' | 'emerald' | 'rose' | 'purple'
}) {
  const accentColors = {
    blue: 'text-blue-400 border-blue-500/20',
    cyan: 'text-cyan-400 border-cyan-500/20',
    emerald: 'text-emerald-400 border-emerald-500/20',
    rose: 'text-rose-400 border-rose-500/20',
    purple: 'text-purple-400 border-purple-500/20',
  }
  return (
    <div className={`rounded-xl bg-[#0c101a] border ${accentColors[accent]} p-4 transition hover:border-slate-700`}>
      <span className="text-xs font-medium text-slate-400 block">{label}</span>
      <strong className="text-2xl font-bold text-white tracking-tight block my-1.5 font-mono">{value}</strong>
      <span className={`text-[11px] font-medium ${accentColors[accent].split(' ')[0]}`}>{delta}</span>
    </div>
  )
}

/* ==================== PROJECTS MANAGEMENT VIEW ==================== */
export function ProjectsView({
  projects,
  onAddProject,
  onDeleteProject,
}: {
  projects: DevProject[]
  onAddProject: (proj: DevProject) => void
  onDeleteProject: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [envFilter, setEnvFilter] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [repo, setRepo] = useState('')
  const [language, setLanguage] = useState('TypeScript / Node')
  const [environment, setEnvironment] = useState<'Production' | 'Staging' | 'Development'>('Production')
  const [formError, setFormError] = useState('')

  const filtered = projects.filter((p) => {
    const matchQ = p.name.toLowerCase().includes(query.toLowerCase()) || p.owner.toLowerCase().includes(query.toLowerCase())
    const matchEnv = envFilter === 'All' || p.environment === envFilter
    return matchQ && matchEnv
  })

  const handleCreate = (e: FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 3) {
      setFormError('Repository service name must be at least 3 characters.')
      return
    }
    setFormError('')
    onAddProject({
      id: `PRJ-${Math.floor(106 + Math.random() * 890)}`,
      name: name.trim().toLowerCase().replace(/\s+/g, '-'),
      repo: repo.trim() || `github.com/devpulse-org/${name.trim().toLowerCase()}`,
      branch: 'main',
      owner: 'Hit Bharadiya',
      language,
      health: 'Healthy',
      securityScore: 95,
      openVulns: 0,
      lastDeploy: 'Just now',
      environment,
    })
    setName('')
    setRepo('')
    setModalOpen(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Projects & Repository Inventory</h1>
          <p className="text-xs text-slate-400">Monitored microservices, branch policies, and deployment environments.</p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer self-start"
        >
          <Plus className="w-4 h-4" /> Register Repository
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by project name or owner..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0c101a] border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={envFilter}
          onChange={(e) => setEnvFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[#0c101a] border border-slate-800 text-xs text-slate-200 focus:outline-none"
        >
          <option value="All">All Environments</option>
          <option value="Production">Production</option>
          <option value="Staging">Staging</option>
          <option value="Development">Development</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-[#0c101a] border border-slate-800 p-10 text-center text-xs text-slate-400">
          No repositories match your current search or environment filter.
        </div>
      ) : (
        <div className="rounded-xl bg-[#0c101a] border border-slate-800 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-[#090c14]">
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Branch / Stack</th>
                <th className="py-3 px-4">Environment</th>
                <th className="py-3 px-4">Security Score</th>
                <th className="py-3 px-4">Health</th>
                <th className="py-3 px-4">Last Deploy</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-900/50 transition">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white">{p.name}</div>
                    <div className="text-[11px] font-mono text-slate-500">{p.repo}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-mono text-cyan-400">{p.branch}</span>
                    <div className="text-[11px] text-slate-400">{p.language}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-medium">{p.environment}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-white">{p.securityScore}/100</td>
                  <td className="py-3.5 px-4">
                    <HealthBadge health={p.health} />
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">{p.lastDeploy}</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => onDeleteProject(p.id)}
                      className="text-xs text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreate} className="w-full max-w-md rounded-xl bg-[#0c101a] border border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Register New Repository</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            {formError && <p className="text-xs text-rose-400">{formError}</p>}
            <div>
              <label className="block text-xs text-slate-300 mb-1">Service Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. billing-webhook-worker"
                className="w-full px-3 py-2 rounded-lg bg-[#07090f] border border-slate-800 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Git Repository URL</label>
              <input
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="github.com/devpulse-org/billing-webhook-worker"
                className="w-full px-3 py-2 rounded-lg bg-[#07090f] border border-slate-800 text-xs text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Runtime Stack</label>
                <input
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#07090f] border border-slate-800 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Environment</label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value as 'Production' | 'Staging' | 'Development')}
                  className="w-full px-3 py-2 rounded-lg bg-[#07090f] border border-slate-800 text-xs text-white"
                >
                  <option value="Production">Production</option>
                  <option value="Staging">Staging</option>
                  <option value="Development">Development</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-2 rounded-lg bg-slate-800 text-xs text-slate-300">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white">
                Add Service
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

/* ==================== CI/CD PIPELINES & DEVOPS WORKSPACE ==================== */
export function PipelinesView({
  pipelines,
  onTriggerRun,
}: {
  pipelines: PipelineRun[]
  onTriggerRun: () => void
}) {
  const [selectedRun, setSelectedRun] = useState<PipelineRun>(pipelines[0])
  const [statusFilter, setStatusFilter] = useState('All')

  const filtered = pipelines.filter((r) => statusFilter === 'All' || r.status === statusFilter)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">CI/CD Pipelines & Deployment Workspace</h1>
          <p className="text-xs text-slate-400">
            Visual stage execution, automated SAST gates, test results, and live build terminal logs.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#0c101a] border border-slate-800 text-xs text-slate-200"
          >
            <option value="All">All Statuses</option>
            <option value="Success">Success</option>
            <option value="Running">Running</option>
            <option value="Failed">Failed</option>
          </select>
          <button
            type="button"
            onClick={onTriggerRun}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" /> Run Pipeline
          </button>
        </div>
      </div>

      {/* Deployment Environment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { env: 'Production (US-East)', version: 'v2.14.0', uptime: '99.98%', pods: '12 / 12 Healthy' },
          { env: 'Staging (EU-Central)', version: 'v2.15.0-rc2', uptime: '99.91%', pods: '6 / 6 Canary' },
          { env: 'QA Security Sandbox', version: 'feat/sso-saml', uptime: '98.40%', pods: 'Gate Blocked' },
        ].map((card) => (
          <div key={card.env} className="rounded-xl bg-[#0c101a] border border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">{card.env}</span>
              <span className="text-[11px] font-mono text-cyan-400">{card.version}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <span>SLA: {card.uptime}</span>
              <span className="text-slate-200 font-medium">{card.pods}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Runs Table */}
      <div className="rounded-xl bg-[#0c101a] border border-slate-800 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-[#090c14]">
              <th className="py-3 px-4">Run ID</th>
              <th className="py-3 px-4">Pipeline / Service</th>
              <th className="py-3 px-4">Branch & Commit</th>
              <th className="py-3 px-4">Tests</th>
              <th className="py-3 px-4">Duration</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 text-xs">
            {filtered.map((run) => (
              <tr
                key={run.id}
                onClick={() => setSelectedRun(run)}
                className={`cursor-pointer transition ${
                  selectedRun.id === run.id ? 'bg-blue-600/10' : 'hover:bg-slate-900/50'
                }`}
              >
                <td className="py-3.5 px-4 font-mono font-semibold text-blue-400">{run.id}</td>
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-white">{run.pipelineName}</div>
                  <div className="text-[11px] text-slate-400">{run.project}</div>
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-300">
                  <GitBranch className="w-3.5 h-3.5 inline mr-1 text-cyan-400" />
                  {run.branch} ({run.commit})
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-300">{run.testsPassed}</td>
                <td className="py-3.5 px-4 font-mono text-slate-400">{run.duration}</td>
                <td className="py-3.5 px-4">
                  <PipelineBadge status={run.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Selected Pipeline Stage Graph + Build Console Logs */}
      {selectedRun && (
        <div className="rounded-xl bg-[#0c101a] border border-slate-800 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">
                Execution Graph & Build Logs — {selectedRun.id} ({selectedRun.project})
              </h3>
            </div>
            <PipelineBadge status={selectedRun.status} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {selectedRun.stages.map((s) => (
              <div key={s.name} className="p-3 rounded-lg bg-[#07090f] border border-slate-800 text-xs">
                <div className="font-semibold text-slate-200">{s.name}</div>
                <div className="mt-1 flex items-center justify-between text-[11px] font-mono">
                  <span
                    className={
                      s.status === 'passed'
                        ? 'text-emerald-400'
                        : s.status === 'failed'
                          ? 'text-rose-400'
                          : s.status === 'running'
                            ? 'text-cyan-400'
                            : 'text-slate-500'
                    }
                  >
                    {s.status.toUpperCase()}
                  </span>
                  <span className="text-slate-400">{s.time}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-[#05070c] border border-slate-800 p-4 font-mono text-xs text-slate-300 space-y-1.5 overflow-x-auto">
            {selectedRun.logs.map((line, i) => (
              <div
                key={i}
                className={
                  line.includes('ERROR') || line.includes('HALT')
                    ? 'text-rose-400'
                    : line.includes('PASS') || line.includes('DONE')
                      ? 'text-emerald-400'
                      : 'text-slate-300'
                }
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}



