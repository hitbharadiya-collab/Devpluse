export type NavRoute =
  | 'overview'
  | 'projects'
  | 'pipelines'
  | 'devsecops'
  | 'scans'
  | 'vulnerabilities'
  | 'team'
  | 'activity'
  | 'settings'

export type Severity = 'Critical' | 'High' | 'Medium' | 'Low'
export type PipelineStatus = 'Success' | 'Running' | 'Failed' | 'Queued'
export type ProjectHealth = 'Healthy' | 'Degraded' | 'Critical'

export interface DevProject {
  id: string
  name: string
  repo: string
  branch: string
  owner: string
  language: string
  health: ProjectHealth
  securityScore: number
  openVulns: number
  lastDeploy: string
  environment: 'Production' | 'Staging' | 'Development'
}

export interface PipelineRun {
  id: string
  pipelineName: string
  project: string
  branch: string
  commit: string
  author: string
  status: PipelineStatus
  duration: string
  testsPassed: string
  environment: 'Production' | 'Staging' | 'QA'
  timestamp: string
  stages: {
    name: 'Source' | 'Build' | 'SAST Scan' | 'Unit Tests' | 'Deploy'
    status: 'passed' | 'running' | 'failed' | 'pending'
    time: string
  }[]
  logs: string[]
}

export interface VulnerabilityFinding {
  id: string
  cve: string
  title: string
  project: string
  scanner: 'SAST (Semgrep)' | 'SCA (Trivy)' | 'Secret Scan' | 'Container Audit'
  severity: Severity
  cvss: number
  packageOrFile: string
  status: 'Open' | 'In Review' | 'Patched'
  detectedAt: string
  isSimulated: boolean
}

export interface SecurityScan {
  id: string
  target: string
  scanType: 'Full DevSecOps Suite' | 'Dependency SCA' | 'SAST Code Analysis' | 'Secret Detection'
  findingsCount: number
  criticalCount: number
  duration: string
  status: 'Passed' | 'Warning' | 'Failed'
  executedAt: string
  isSimulated: boolean
}

export interface TeamMember {
  id: string
  name: string
  email: string
  role: 'Org Owner' | 'Security Lead' | 'DevOps Engineer' | 'Developer' | 'Auditor'
  mfaEnabled: boolean
  lastActive: string
  status: 'Active' | 'Invited'
}

export interface AuditEvent {
  id: string
  actor: string
  action: string
  resource: string
  category: 'Security' | 'Pipeline' | 'Access' | 'Config'
  ip: string
  timestamp: string
  risk: 'Normal' | 'Elevated'
}
