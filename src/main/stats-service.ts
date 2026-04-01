import Store from 'electron-store'
import type { SessionStats, DailyStat } from '../shared/types'

interface StatsStore {
  totalSessions: number
  totalRunningTimeMs: number
  totalCommands: number
  dailyStats: DailyStat[]
}

export class StatsService {
  private store: Store<StatsStore>

  constructor() {
    this.store = new Store<StatsStore>({
      name: 'stats',
      defaults: {
        totalSessions: 0,
        totalRunningTimeMs: 0,
        totalCommands: 0,
        dailyStats: []
      }
    })
  }

  // Track a new session activity (e.g., session created or running time added)
  trackActivity(runningTimeMs: number = 0, newSession: boolean = false): void {
    const today = this.getTodayKey()

    if (newSession) {
      this.store.set('totalSessions', this.store.get('totalSessions') + 1)
    }

    if (runningTimeMs > 0) {
      this.store.set(
        'totalRunningTimeMs',
        this.store.get('totalRunningTimeMs') + runningTimeMs
      )
    }

    // Update daily stats
    const dailyStats = this.store.get('dailyStats')
    let todayStat = dailyStats.find((s) => s.date === today)

    if (!todayStat) {
      todayStat = { date: today, sessions: 0, commands: 0, runningTimeMs: 0 }
      dailyStats.push(todayStat)
    }

    if (newSession) {
      todayStat.sessions += 1
    }

    if (runningTimeMs > 0) {
      todayStat.runningTimeMs += runningTimeMs
    }

    // Keep only last 30 days
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    const cutoffKey = cutoff.toISOString().slice(0, 10)

    this.store.set(
      'dailyStats',
      dailyStats.filter((s) => s.date >= cutoffKey)
    )
  }

  // Track a command execution
  trackCommand(): void {
    this.store.set('totalCommands', this.store.get('totalCommands') + 1)

    const today = this.getTodayKey()
    const dailyStats = this.store.get('dailyStats')
    let todayStat = dailyStats.find((s) => s.date === today)

    if (!todayStat) {
      todayStat = { date: today, sessions: 0, commands: 0, runningTimeMs: 0 }
      dailyStats.push(todayStat)
    }

    todayStat.commands += 1
    this.store.set('dailyStats', dailyStats)
  }

  // Get aggregated stats
  getStats(): SessionStats {
    const today = this.getTodayKey()
    const dailyStats = this.store.get('dailyStats')
    const todayStat = dailyStats.find((s) => s.date === today)

    return {
      totalSessions: this.store.get('totalSessions'),
      totalRunningTimeMs: this.store.get('totalRunningTimeMs'),
      totalCommands: this.store.get('totalCommands'),
      sessionsToday: todayStat?.sessions ?? 0,
      commandsToday: todayStat?.commands ?? 0,
      dailyStats: [...dailyStats]
    }
  }

  private getTodayKey(): string {
    return new Date().toISOString().slice(0, 10)
  }
}
