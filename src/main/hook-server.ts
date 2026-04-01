import * as http from 'http'
import { EventEmitter } from 'events'

const HOOK_PORT = 23847

export interface ExternalSession {
  sessionId: string
  pid: number
  cwd: string
  name: string
  hwnd: number
  status: 'running' | 'done' | 'exited'
  startedAt: number
  doneAt?: number
  stopCount: number
}

export class HookServer extends EventEmitter {
  private server: http.Server | null = null
  private sessions: Map<string, ExternalSession> = new Map()
  private internalSessionIds: Set<string> = new Set()

  // Register internal session IDs to exclude from external list
  addInternalSessionId(id: string): void {
    this.internalSessionIds.add(id)
  }

  removeInternalSessionId(id: string): void {
    this.internalSessionIds.delete(id)
  }

  getSessions(): ExternalSession[] {
    return Array.from(this.sessions.values())
  }

  getSession(sessionId: string): ExternalSession | undefined {
    return this.sessions.get(sessionId)
  }

  start(): void {
    if (this.server) return

    this.server = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

      if (req.method === 'OPTIONS') {
        res.writeHead(200)
        res.end()
        return
      }

      // Hook event endpoints
      if (req.method === 'POST' && req.url?.startsWith('/api/hook/')) {
        let body = ''
        req.on('data', (chunk) => { body += chunk })
        req.on('end', () => {
          try {
            const data = JSON.parse(body)
            this.handleHookEvent(data)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true }))
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false }))
          }
        })
        return
      }

      // Session list endpoint
      if (req.method === 'GET' && req.url === '/api/sessions') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(this.getSessions()))
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

    this.server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`Hook server port ${HOOK_PORT} already in use`)
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

  private handleHookEvent(data: {
    event: string
    sessionId?: string
    cwd?: string
    pid?: number
    hwnd?: number
    timestamp?: number
  }): void {
    const { event, sessionId, cwd, pid, hwnd, timestamp } = data
    if (!sessionId) return

    // Skip internal sessions
    if (this.internalSessionIds.has(sessionId)) return

    switch (event) {
      case 'start': {
        const name = cwd ? cwd.split(/[/\\]/).pop() || `Session` : `PID:${pid}`
        const session: ExternalSession = {
          sessionId,
          pid: pid || 0,
          cwd: cwd || '',
          name,
          hwnd: hwnd || 0,
          status: 'running',
          startedAt: timestamp || Date.now(),
          stopCount: 0
        }
        this.sessions.set(sessionId, session)
        this.emit('session-start', session)
        break
      }

      case 'stop': {
        const session = this.sessions.get(sessionId)
        if (session) {
          session.status = 'done'
          session.doneAt = timestamp || Date.now()
          session.stopCount++
          this.emit('session-stop', session)
        }
        break
      }

      case 'end': {
        const session = this.sessions.get(sessionId)
        if (session) {
          session.status = 'exited'
          this.emit('session-end', session)
        }
        break
      }
    }
  }
}
