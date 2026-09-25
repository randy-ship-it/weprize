import { createJsonStore } from './json-store.js'
import { createPgStore } from './pg-store.js'

let storePromise = null

/**
 * Prefer DATABASE_URL Postgres when set.
 * Fallback: local JSON file under data/ (dev / single-box only).
 * better-sqlite3 was preferred for local SQLite but native build failed on this box
 * (no make / node-gyp). TODO: swap JSON → Postgres or better-sqlite3 when build tools exist.
 */
export async function getStore() {
  if (!storePromise) {
    storePromise = (async () => {
      const url = process.env.DATABASE_URL
      if (url) {
        console.log('[weprize] store=postgres (DATABASE_URL)')
        return createPgStore(url)
      }
      console.warn(
        '[weprize] store=json file (local only). Set DATABASE_URL for Postgres. TODO(prod): Postgres.',
      )
      return createJsonStore()
    })()
  }
  return storePromise
}
