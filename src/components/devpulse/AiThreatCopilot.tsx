import { useState } from 'react'
import { AlertTriangle, Bot, Check, Copy, Play, ShieldAlert, Sparkles, Terminal } from 'lucide-react'

interface AiAnalysisResult {
  engine: string
  riskScore: number
  threatLevel: 'Critical' | 'High' | 'Medium' | 'Low'
  attackType: string
  mitreTactic: string
  summary: string
  remediationCli: string
  indicators: string[]
}

const ATTACK_SCENARIOS = [
  {
    id: 'sqli',
    label: 'Simulate SQL Injection',
    payload:
      '2026-11-18T12:15:04Z [WAF-ALERT] src_ip=185.220.101.42 method=GET uri="/api/projects?id=1%27%20UNION%20SELECT%20username,password_hash%20FROM%20users--" status=500 latency=412ms',
  },
  {
    id: 'bruteforce',
    label: 'Simulate SSH Brute-Force',
    payload:
      '2026-11-18T12:16:19Z [SSHD-AUTH] Failed password for root from 91.240.118.17 port 54122 ssh2 (58 consecutive 401 Unauthorized attempts in 12s)',
  },
  {
    id: 'jwt',
    label: 'Simulate JWT Token Forgery',
    payload:
      '2026-11-18T12:17:41Z [AUTH-GUARD] Invalid JWT signature on /api/teams/promote: header={"alg":"none","typ":"JWT"} payload={"sub":"usr_902","role":"admin"} privilege_escalation=true',
  },
]

export function AiThreatCopilot() {
  const [logInput, setLogInput] = useState(ATTACK_SCENARIOS[0].payload)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [result, setResult] = useState<AiAnalysisResult>({
    engine: 'DevPulse AI Guard (Ready)',
    riskScore: 94,
    threatLevel: 'Critical',
    attackType: 'SQL Injection (OWASP A03:2021)',
    mitreTactic: 'TA0001 - Initial Access / T1190 Exploit Public-Facing Application',
    summary:
      'Malicious SQL UNION payload detected in inbound query string attempting unauthorized credential table extraction.',
    remediationCli:
      'npx prisma validate && iptables -A INPUT -s 185.220.101.42 -j DROP # Enforce parameterized queries',
    indicators: ['UNION SELECT SQL injection pattern', 'Source IP 185.220.101.42 on TOR exit list', 'DB query latency spike (412ms)'],
  })

  const analyzeThreat = async (payloadToAnalyze: string) => {
    const trimmed = payloadToAnalyze.trim()
    if (!trimmed) return
    setLoading(true)
    setCopied(false)
    try {
      const res = await fetch('/api/ai/analyze-threat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ logPayload: trimmed }),
      })
      const data = await res.json()
      if (res.ok && data?.analysis) {
        setResult(data.analysis)
      }
    } catch {
      // Keep current result safely if offline
    } finally {
      setLoading(false)
    }
  }

  const handleSimulate = (payload: string) => {
    setLogInput(payload)
    void analyzeThreat(payload)
  }

  const handleCopyCli = async () => {
    try {
      await navigator.clipboard?.writeText(result.remediationCli)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore clipboard errors
    }
  }

  const scoreColor =
    result.riskScore >= 85
      ? 'text-rose-400 border-rose-500/40 bg-rose-500/10'
      : result.riskScore >= 70
        ? 'text-amber-400 border-amber-500/40 bg-amber-500/10'
        : 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10'

  return (
    <div className="rounded-xl bg-gradient-to-br from-[#0d1322] via-[#0c101a] to-[#111827] border border-cyan-500/30 p-5 shadow-lg shadow-cyan-950/20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center">
            <Bot className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">AI Threat Detection &amp; Live Attack Simulator</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> {result.engine}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Real-time autonomous log classification, MITRE ATT&amp;CK mapping, and instant auto-remediation CLI generation.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {ATTACK_SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              type="button"
              disabled={loading}
              onClick={() => handleSimulate(sc.payload)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-cyan-950/60 border border-slate-700 hover:border-cyan-500/50 text-[11px] font-medium text-slate-200 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3 h-3 text-cyan-400" /> {sc.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
        {/* Left: Raw Telemetry / Log Input */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-2.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Inbound Security Telemetry / Raw Log</span>
            <span className="text-[10px] text-cyan-400 font-normal">Live Stream Ready</span>
          </label>
          <textarea
            rows={4}
            value={logInput}
            onChange={(e) => setLogInput(e.target.value)}
            placeholder="Paste suspicious HTTP request, SSH auth log, or JWT payload..."
            className="w-full rounded-lg bg-[#070a12] border border-slate-800 focus:border-cyan-500/60 focus:outline-none p-3 text-xs font-mono text-slate-200 leading-relaxed"
          />
          <button
            type="button"
            disabled={loading || !logInput.trim()}
            onClick={() => void analyzeThreat(logInput)}
            className="w-full py-2 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            <ShieldAlert className="w-4 h-4" />
            {loading ? 'AI Engine Analyzing Telemetry...' : 'Analyze Threat with AI Copilot'}
          </button>
        </div>

        {/* Right: AI Verdict, Risk Score & Remediation */}
        <div className="lg:col-span-7 rounded-lg bg-[#070a12]/90 border border-slate-800 p-4 flex flex-col justify-between space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${scoreColor}`}>
                  {result.threatLevel.toUpperCase()} THREAT
                </span>
                <span className="text-xs font-semibold text-slate-300">{result.mitreTactic}</span>
              </div>
              <h3 className="text-base font-bold text-white mt-1.5">{result.attackType}</h3>
            </div>

            <div className={`px-3 py-1.5 rounded-lg border text-right ${scoreColor}`}>
              <span className="text-[10px] uppercase tracking-wider block opacity-80">AI Risk Score</span>
              <strong className="text-xl font-extrabold">{result.riskScore}/100</strong>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">{result.summary}</p>

          <div className="flex flex-wrap gap-1.5">
            {result.indicators.map((ioc, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-amber-300 flex items-center gap-1"
              >
                <AlertTriangle className="w-2.5 h-2.5" /> {ioc}
              </span>
            ))}
          </div>

          <div className="rounded-lg bg-slate-950 border border-slate-800/90 p-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
              <code className="text-[11px] font-mono text-emerald-300 truncate">{result.remediationCli}</code>
            </div>
            <button
              type="button"
              onClick={() => void handleCopyCli()}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 flex items-center gap-1 shrink-0 cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy Fix'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
