import pool from '../config/database.js'

try {
  const result = await pool.query('SELECT NOW() AS connected_at')
  console.log('Database connection successful:', result.rows[0])
} catch (error) {
  if (error instanceof Error) {
    console.error('Actual database error:', error.message)
  } else {
    console.error('Unknown database connection error.')
  }
  process.exitCode = 1
} finally {
  await pool.end()
}
