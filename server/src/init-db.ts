import fs from 'node:fs'
import path from 'node:path'
import pool from './config/database.js'

export async function initializeDatabase() {
  try {
    const schemaPath = path.resolve(process.cwd(), 'server/database/schema.sql')
    const projectsPath = path.resolve(process.cwd(), 'server/database/projects.sql')

    if (fs.existsSync(schemaPath)) {
      await pool.query(fs.readFileSync(schemaPath, 'utf8'))
    }
    if (fs.existsSync(projectsPath)) {
      await pool.query(fs.readFileSync(projectsPath, 'utf8'))
    }

    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(160);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(12);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(128);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE;

      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(160) UNIQUE NOT NULL,
        role VARCHAR(60) NOT NULL DEFAULT 'Engineer',
        status VARCHAR(40) NOT NULL DEFAULT 'Active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS patched_vulnerabilities (vuln_id VARCHAR(80) PRIMARY KEY, cve VARCHAR(80), patched_by VARCHAR(160), patched_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS pipelines (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        branch VARCHAR(100) NOT NULL DEFAULT 'main',
        status VARCHAR(40) NOT NULL DEFAULT 'Success',
        duration VARCHAR(40) NOT NULL DEFAULT '1m 24s',
        triggered_by VARCHAR(120) NOT NULL DEFAULT 'System',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)
    console.log('Database tables & 2FA/OAuth columns verified/initialized successfully.')
  } catch (err) {
    console.error('Database initialization warning:', err)
  }
}

