import * as http from 'http'
import { EventEmitter } from 'events'

const HOOK_PORT = 23847

export class HookServer extends EventEmitter {
  private server: http.Server | null = null

  // Start listening for Stop hook reports
  start(): void {
    if (this.server) return

    this.server = http.createServer((req, res) => {
      // CORS headers for local requests
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

      if (req.method === 'OPTIONS') {
        res.writeHead(200)
        res.end()
        return
      }

      if (req.method === 'POST' && req.url === '/api/session-done') {
        let body = ''
        req.on('data', (chunk) => { body += chunk })
        req.on('end', () => {
          try {
            const data = JSON.parse(body)
            // Emit event with PID and cwd
            this.emit('session-done', {
              pid: data.pid || 0,
              cwd: data.cwd || ''
            })
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true }))
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }))
          }
        })
        return
      }

      // Health check
      if (req.method === 'GET' && req.url === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, service: 'claude-notify-dashboard' }))
        return
      }

      res.writeHead(404)
      res.end()
    })

    this.server.listen(HOOK_PORT, '127.0.0.1', () => {
      console.log(`Hook server listening on http://127.0.0.1:${HOOK_PORT}`)
    })

    // Don't crash if port is in use
    this.server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`Hook server port ${HOOK_PORT} already in use, skipping`)
      }
      this.server = null
    })
  }

  stop(): void {
    if (this.server) {
      this.server.close()
      this.server = null
    }
  }

  getPort(): number {
    return HOOK_PORT
  }
}
