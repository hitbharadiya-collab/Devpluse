import { Router, type Request, type Response } from 'express'

const router = Router()

router.get('/repos', async (req: Request, res: Response) => {
  const username = String(req.query.username || process.env.GITHUB_USERNAME || 'hitbharadiya-collab').trim()
  try {
    const ghRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=12`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'DevPulse-Control-Plane',
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
    })
    if (!ghRes.ok) {
      res.status(ghRes.status).json({ success: false, message: `GitHub API returned ${ghRes.status}` })
      return
    }
    const raw = (await ghRes.json()) as Array<Record<string, unknown>>
    const repos = raw.map((r) => ({
      name: String(r.name || ''),
      fullName: String(r.full_name || ''),
      htmlUrl: String(r.html_url || ''),
      branch: String(r.default_branch || 'main'),
      language: String(r.language || 'TypeScript'),
      stars: Number(r.stargazers_count || 0),
      updatedAt: String(r.updated_at || new Date().toISOString()),
      private: Boolean(r.private),
    }))
    res.json({ success: true, username, data: repos })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : 'Failed to fetch GitHub repositories.',
    })
  }
})

export default router
