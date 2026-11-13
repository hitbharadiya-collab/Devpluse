import type { PipelineStatus, ProjectHealth, Severity } from '../../types/devpulse'

export function SeverityBadge({ severity }: { severity: Severity }) {
  const styles: Record<Severity, string> = {
    Critical: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    High: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    Medium: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    Low: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${styles[severity]}`}>
      {severity}
    </span>
  )
}

export function PipelineBadge({ status }: { status: PipelineStatus }) {
  const styles: Record<PipelineStatus, string> = {
    Success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    Running: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    Failed: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    Queued: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${styles[status]}`}>
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === 'Success'
            ? 'bg-emerald-400'
            : status === 'Running'
              ? 'bg-cyan-400 animate-pulse'
              : status === 'Failed'
                ? 'bg-rose-400'
                : 'bg-slate-400'
        }`}
      />
      {status}
    </span>
  )
}

export function HealthBadge({ health }: { health: ProjectHealth }) {
  const styles: Record<ProjectHealth, string> = {
    Healthy: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    Degraded: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    Critical: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${styles[health]}`}>
      {health}
    </span>
  )
}

export function DemoDataPill() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
      PostgreSQL Live
    </span>
  )
}



