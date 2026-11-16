import { Router, type Request, type Response } from 'express'
import pool from '../config/database.js'
const router = Router()
router.get('/patched', async (_req: Request, res: Response) => { try { const r = await pool.query('SELECT vuln_id FROM patched_vulnerabilities'); res.json({ success: true, data: r.rows.map((x) => x.vuln_id) }) } catch { res.json({ success: true, data: [] }) } })
router.post('/patch', async (req: Request, res: Response) => { const id = String(req.body?.id || '').trim(); const cve = String(req.body?.cve || id); if (!id) { res.status(400).json({ success: false }); return }; try { await pool.query('INSERT INTO patched_vulnerabilities (vuln_id, cve, patched_by) VALUES ($1, $2, $3) ON CONFLICT (vuln_id) DO NOTHING', [id, cve, String(req.session.userId || 'operator')]); res.json({ success: true }) } catch { res.status(500).json({ success: false }) } })
export default router
