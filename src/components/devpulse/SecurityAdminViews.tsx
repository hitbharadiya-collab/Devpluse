import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  CheckCircle2,
  Download,
  FileCode2,
  Key,
  Lock,
  PackageCheck,
  Search,
  Shield,
  ShieldAlert,
  UserPlus,
} from 'lucide-react'
import { SECURITY_SCANS, SECURITY_TREND_DATA } from '../../data/mockDevPulse'
import type { AuditEvent, TeamMember, VulnerabilityFinding } from '../../types/devpulse'
import { DemoDataPill, SeverityBadge } from './UiBadges'

/* ==================== DEVSECOPS DASHBOARD VIEW ==================== */
export function DevSecOpsView({
  vulnerabilities,
  onPatchVuln,
}: {
  vulnerabilities: VulnerabilityFinding[]
  onPatchVuln: (id: string) => void
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-white">DevSecOps Security Posture Center</h1>
            <DemoDataPill />
          </div>
          <p className="text-xs text-slate-400">
            Continuous SAST code analysis, SCA dependency auditing, secret scanning, and policy compliance.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const headers = ['ID', 'Title', 'Severity', 'Package/File', 'CVSS', 'Status']
            const rows = vulnerabilities.map((v) => [
              v.id,
              `"${String(v.title || '').replace(/"/g, '""')}"`,
              v.severity,
              `"${String(((v as unknown as Record<string, unknown>).package ?? (v as unknown as Record<string, unknown>).file ?? 'core')).replace(/"/g, '""')}"`,
              String(v.cvss ?? 'N/A'),
              v.status,
            ])
            const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `devpulse-security-report-${new Date().toISOString().slice(0, 10)}.csv`
            a.click()
            URL.revokeObjectURL(url)
          }}
          className="px-3.5 py-2 rounded-lg bg-[#0c101a] hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer self-start"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" /> Export Security Report
        </button>
      </div>

      {/* 4 DevSecOps Pillar Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-[#0c101a] border border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>SAST Code Security</span>
            <FileCode2 className="w-4 h-4 text-blue-400" />
          </div>
          <strong className="text-xl font-bold text-white block mt-2">94.2% Clean</strong>
          <span className="text-[11px] text-amber-400">1 SAML parser rule flagged</span>
        </div>

        <div className="rounded-xl bg-[#0c101a] border border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Dependency SCA Audit</span>
            <PackageCheck className="w-4 h-4 text-purple-400" />
          </div>
          <strong className="text-xl font-bold text-white block mt-2">412 Packages</strong>
          <span className="text-[11px] text-cyan-400">1 transitive patch queued</span>
        </div>

        <div className="rounded-xl bg-[#0c101a] border border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Secret Scanning</span>
            <Key className="w-4 h-4 text-emerald-400" />
          </div>
          <strong className="text-xl font-bold text-white block mt-2">Pre-Receive Active</strong>
          <span className="text-[11px] text-emerald-400">0 production keys leaked</span>
        </div>

        <div className="rounded-xl bg-[#0c101a] border border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Compliance Gate</span>
            <Shield className="w-4 h-4 text-cyan-400" />
          </div>
          <strong className="text-xl font-bold text-white block mt-2">SOC2 + OWASP</strong>
          <span className="text-[11px] text-emerald-400">Enforced on main branch</span>
        </div>
      </div>

      {/* Security Trends Chart */}
      <div className="rounded-xl bg-[#0c101a] border border-slate-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Vulnerability Remediation & Severity Trend</h3>
            <p className="text-xs text-slate-400">4-week reduction across Critical, High, and Medium findings</p>
          </div>
          <DemoDataPill />
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={SECURITY_TREND_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="week" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="critical" name="Critical" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="high" name="High" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="medium" name="Medium" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="low" name="Low" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Findings Quick Remediation */}
      <VulnerabilitiesView vulnerabilities={vulnerabilities} onPatchVuln={onPatchVuln} compact />
    </div>
  )
}

/* ==================== VULNERABILITIES / SECURITY FINDINGS VIEW ==================== */
export function VulnerabilitiesView({
  vulnerabilities,
  onPatchVuln,
  compact = false,
}: {
  vulnerabilities: VulnerabilityFinding[]
  onPatchVuln: (id: string) => void
  compact?: boolean
}) {
  const [search, setSearch] = useState('')
  const [sevFilter, setSevFilter] = useState('All')

  const filtered = vulnerabilities.filter((v) => {
    const matchQ =
      v.title.toLowerCase().includes(search.toLowerCase()) ||
      v.cve.toLowerCase().includes(search.toLowerCase()) ||
      v.project.toLowerCase().includes(search.toLowerCase())
    const matchSev = sevFilter === 'All' || v.severity === sevFilter
    return matchQ && matchSev
  })

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">Security Findings & CVEs</h1>
              <DemoDataPill />
            </div>
            <p className="text-xs text-slate-400">Prioritized remediation queue with CVSS v3.1 scores and file locations.</p>
          </div>
          <div className="flex gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter CVE or repo..."
                className="pl-8 pr-3 py-2 rounded-lg bg-[#0c101a] border border-slate-800 text-xs text-white"
              />
            </div>
            <select
              value={sevFilter}
              onChange={(e) => setSevFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#0c101a] border border-slate-800 text-xs text-slate-200"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-[#0c101a] border border-slate-800 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-[#090c14]">
              <th className="py-3 px-4">Advisory / ID</th>
              <th className="py-3 px-4">Finding & Target</th>
              <th className="py-3 px-4">Scanner</th>
              <th className="py-3 px-4">Severity</th>
              <th className="py-3 px-4">CVSS</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Remediation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 text-xs">
            {filtered.map((v) => (
              <tr key={v.id} className="hover:bg-slate-900/50">
                <td className="py-3.5 px-4 font-mono font-semibold text-cyan-400">{v.cve}</td>
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-white">{v.title}</div>
                  <div className="text-[11px] font-mono text-slate-400">
                    {v.project} · {v.packageOrFile}
                  </div>
                </td>
                <td className="py-3.5 px-4 text-slate-300">{v.scanner}</td>
                <td className="py-3.5 px-4">
                  <SeverityBadge severity={v.severity} />
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-white">{v.cvss.toFixed(1)}</td>
                <td className="py-3.5 px-4">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      v.status === 'Patched'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-slate-800 text-slate-200'
                    }`}
                  >
                    {v.status}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  {v.status !== 'Patched' ? (
                    <button
                      type="button"
                      onClick={() => onPatchVuln(v.id)}
                      className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold cursor-pointer"
                    >
                      Mark Patched
                    </button>
                  ) : (
                    <span className="text-[11px] text-emerald-400 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ==================== SECURITY SCANS VIEW ==================== */
export function SecurityScansView() {
  const [runningScan, setRunningScan] = useState(false)
  const [scans, setScans] = useState(SECURITY_SCANS)

  const handleTriggerScan = () => {
    setRunningScan(true)
    setTimeout(() => {
      setScans((prev) => [
        {
          id: `SCN-${Math.floor(911 + Math.random() * 88)}`,
          target: 'All Production Services (main)',
          scanType: 'Full DevSecOps Suite',
          findingsCount: 0,
          criticalCount: 0,
          duration: '24s',
          status: 'Passed',
          executedAt: 'Just now',
          isSimulated: true,
        },
        ...prev,
      ])
      setRunningScan(false)
    }, 600)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Security Scans & Policy Audits</h1>
            <DemoDataPill />
          </div>
          <p className="text-xs text-slate-400">Automated SAST, SCA, and container image scan execution history.</p>
        </div>
        <button
          type="button"
          onClick={handleTriggerScan}
          disabled={runningScan}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer self-start"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          {runningScan ? 'Running Full Suite...' : 'Launch On-Demand Scan'}
        </button>
      </div>

      <div className="rounded-xl bg-[#0c101a] border border-slate-800 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-[#090c14]">
              <th className="py-3 px-4">Scan ID</th>
              <th className="py-3 px-4">Target Repository</th>
              <th className="py-3 px-4">Engine Suite</th>
              <th className="py-3 px-4">Findings</th>
              <th className="py-3 px-4">Duration</th>
              <th className="py-3 px-4">Gate Result</th>
              <th className="py-3 px-4">Executed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 text-xs">
            {scans.map((s) => (
              <tr key={s.id} className="hover:bg-slate-900/50">
                <td className="py-3.5 px-4 font-mono text-blue-400 font-semibold">{s.id}</td>
                <td className="py-3.5 px-4 font-semibold text-white">{s.target}</td>
                <td className="py-3.5 px-4 text-slate-300">{s.scanType}</td>
                <td className="py-3.5 px-4 font-mono text-slate-200">
                  {s.findingsCount} total ({s.criticalCount} critical)
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-400">{s.duration}</td>
                <td className="py-3.5 px-4">
                  <span
                    className={`px-2.5 py-0.5 rounded text-[11px] font-semibold ${
                      s.status === 'Passed'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : s.status === 'Warning'
                          ? 'bg-amber-500/15 text-amber-300'
                          : 'bg-rose-500/15 text-rose-300'
                    }`}
                  >
                    {s.status}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-slate-400">{s.executedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ==================== TEAM MANAGEMENT VIEW ==================== */
export function TeamView({
  members,
  onInviteMember,
}: {
  members: TeamMember[]
  onInviteMember: (email: string, role: TeamMember['role']) => void
}) {
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<TeamMember['role']>('DevOps Engineer')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Team Management & RBAC Access</h1>
        <p className="text-xs text-slate-400">Manage organization roles, hardware MFA enforcement, and operator permissions.</p>
      </div>

      <div className="rounded-xl bg-[#0c101a] border border-slate-800 p-4 flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder="engineer@devpulse.io"
          className="flex-1 px-3 py-2 rounded-lg bg-[#07090f] border border-slate-800 text-xs text-white"
        />
        <select
          value={inviteRole}
          onChange={(e) => setInviteRole(e.target.value as TeamMember['role'])}
          className="px-3 py-2 rounded-lg bg-[#07090f] border border-slate-800 text-xs text-slate-200"
        >
          <option value="Security Lead">Security Lead</option>
          <option value="DevOps Engineer">DevOps Engineer</option>
          <option value="Developer">Developer</option>
          <option value="Auditor">Auditor</option>
        </select>
        <button
          type="button"
          onClick={() => {
            if (inviteEmail.includes('@')) {
              onInviteMember(inviteEmail, inviteRole)
              setInviteEmail('')
            }
          }}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" /> Invite Operator
        </button>
      </div>

      <div className="rounded-xl bg-[#0c101a] border border-slate-800 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-[#090c14]">
              <th className="py-3 px-4">Operator</th>
              <th className="py-3 px-4">RBAC Role</th>
              <th className="py-3 px-4">MFA / Passkey</th>
              <th className="py-3 px-4">Last Activity</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 text-xs">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-slate-900/50">
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-white">{m.name}</div>
                  <div className="text-[11px] text-slate-400">{m.email}</div>
                </td>
                <td className="py-3.5 px-4">
                  <span className="px-2.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/25 font-medium">
                    {m.role}
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  {m.mfaEnabled ? (
                    <span className="text-emerald-400 font-medium">Enforced</span>
                  ) : (
                    <span className="text-amber-400 font-medium">Pending Setup</span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-slate-400">{m.lastActive}</td>
                <td className="py-3.5 px-4 text-slate-200">{m.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ==================== ACTIVITY LOGS VIEW ==================== */
export function ActivityLogsView({ events }: { events: AuditEvent[] }) {
  const [cat, setCat] = useState('All')
  const filtered = events.filter((e) => cat === 'All' || e.category === cat)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">SIEM Activity & Compliance Audit Logs</h1>
          <p className="text-xs text-slate-400">Immutable operational trail across deployments, policy changes, and access events.</p>
        </div>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[#0c101a] border border-slate-800 text-xs text-slate-200"
        >
          <option value="All">All Categories</option>
          <option value="Security">Security</option>
          <option value="Pipeline">Pipeline</option>
          <option value="Access">Access</option>
          <option value="Config">Config</option>
        </select>
      </div>

      <div className="space-y-2.5">
        {filtered.map((ev) => (
          <div key={ev.id} className="rounded-xl bg-[#0c101a] border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono text-cyan-400 font-semibold">{ev.id}</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">{ev.category}</span>
                <span className="text-slate-400">by {ev.actor}</span>
              </div>
              <p className="text-xs text-white font-medium mt-1.5">{ev.action}</p>
            </div>
            <div className="text-right font-mono text-[11px] text-slate-400">
              <div>IP: {ev.ip}</div>
              <div>{ev.timestamp}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ==================== SETTINGS VIEW ==================== */
export function SettingsView({ onOpenPinTest }: { onOpenPinTest: () => void }) {
  const [blockCritical, setBlockCritical] = useState(true)
  const [requirePin, setRequirePin] = useState(true)
  const [savedMsg, setSavedMsg] = useState('')

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-white">Workspace & DevSecOps Policy Settings</h1>
        <p className="text-xs text-slate-400">Configure automated deployment gates, step-up Security PIN, and webhook signing.</p>
      </div>

      <div className="rounded-xl bg-[#0c101a] border border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
          <div>
            <h3 className="text-sm font-semibold text-white">Block Production Deploys on Critical/High CVEs</h3>
            <p className="text-xs text-slate-400">Automatically halt CI/CD pipeline when SAST or SCA detects severe risk.</p>
          </div>
          <input
            type="checkbox"
            checked={blockCritical}
            onChange={(e) => setBlockCritical(e.target.checked)}
            className="w-4 h-4 accent-blue-600"
          />
        </div>

        <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
          <div>
            <h3 className="text-sm font-semibold text-white">Mandatory 6-Digit Security PIN for Release Approvals</h3>
            <p className="text-xs text-slate-400">Enforce step-up operator verification before unlocking production clusters.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenPinTest}
              className="px-3 py-1.5 rounded-lg bg-purple-600/20 border border-purple-500/35 text-xs text-purple-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" /> Test PIN Screen
            </button>
            <input
              type="checkbox"
              checked={requirePin}
              onChange={(e) => setRequirePin(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-emerald-400">{savedMsg}</span>
          <button
            type="button"
            onClick={() => {
              setSavedMsg('Enterprise DevSecOps policy saved.')
              setTimeout(() => setSavedMsg(''), 3000)
            }}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  )
}








