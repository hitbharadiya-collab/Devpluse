import pool from '../config/database.js'
import { ensurePipelineTables } from '../routes/pipelines.routes.js'

async function seed() {
  await ensurePipelineTables()

  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(120) NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      priority VARCHAR(24) NOT NULL DEFAULT 'medium',
      owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  const existing = await pool.query('SELECT COUNT(*)::int AS c FROM projects')
  if (existing.rows[0].c === 0) {
    await pool.query(`
      INSERT INTO projects (name, description, status, priority) VALUES
      ('auth-identity-gateway', 'Zero-trust OAuth2, OIDC & WebAuthn passkey authentication service', 'active', 'high'),
      ('payment-ledger-api', 'PCI-DSS compliant core transaction & settlement microservice', 'active', 'high'),
      ('customer-portal-web', 'React + TypeScript enterprise customer dashboard & SSO frontend', 'active', 'medium'),
      ('k8s-policy-enforcer', 'Automated container image signing & admission controller webhook', 'completed', 'low');
    `)
    console.log('Seeded 4 PostgreSQL projects.')
  }

  const pipeCount = await pool.query('SELECT COUNT(*)::int AS c FROM pipeline_runs')
  if (pipeCount.rows[0].c === 0) {
    await pool.query(`
      INSERT INTO pipeline_runs (run_code, service, branch, commit_sha, status, duration, triggered_by) VALUES
      ('RUN-8841', 'auth-identity-gateway', 'main', 'a94f1c2', 'passed', '1m 34s', 'hit.bharadiya@devpulse.io'),
      ('RUN-8840', 'payment-ledger-api', 'release/v2.4', '7b3e09d', 'passed', '2m 11s', 'ci-webhook@devpulse.io'),
      ('RUN-8839', 'customer-portal-web', 'feat/saml-fix', 'c41d88a', 'failed', '58s', 'devsecops-bot@devpulse.io'),
      ('RUN-8838', 'k8s-policy-enforcer', 'main', '19e2f5b', 'passed', '1m 19s', 'hit.bharadiya@devpulse.io');
    `)
    console.log('Seeded 4 PostgreSQL pipeline runs.')
  }

  await pool.end()
  console.log('PostgreSQL live seed complete!')
}

seed().catch((err) => {
  console.error('Seed error:', err)
  process.exit(1)
})
