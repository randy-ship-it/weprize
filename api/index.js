/**
 * Vercel Node serverless entry — Express app handles all /api/* via rewrite.
 * SPA remains Vite static build; do not serve dist from here.
 */
import app from '../server/index.js'

export default app
