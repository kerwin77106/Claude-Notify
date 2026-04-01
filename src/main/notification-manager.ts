import { Notification } from 'electron'
import Store from 'electron-store'
import { v4 as uuidv4 } from 'uuid'
import type { NotificationRecord, SessionStatus } from '../shared/types'
import type { SettingsManager } from './settings-manager'

interface NotificationStore {
  history: NotificationRecord[]
}

export class NotificationManager {
  private store: Store<NotificationStore>
  private settingsManager: SettingsManager
  private onClickCallback: ((sessionId: string) => void) | null = null

  constructor(settingsManager: SettingsManager) {
    this.settingsManager = settingsManager
    this.store = new Store<NotificationStore>({
      name: 'notifications',
      defaults: {
        history: []
      }
    })
  }

  // Try to send a notification when status changes
  trySendNotification(
    sessionId: string,
    sessionName: string,
    newStatus: SessionStatus,
    runningDurationMs: number
  ): void {
    const settings = this.settingsManager.get()

    // Check if notifications are enabled
    if (!settings.notification.enabled) return

    // Only notify on idle or error transitions (task completed or failed)
    if (newStatus !== 'idle' && newStatus !== 'error') return

    // Check running threshold
    if (runningDurationMs < settings.notification.runningThresholdMs) return

    // Check mute period
    if (this.isInMutePeriod(settings.notification.muteStart, settings.notification.muteEnd)) return

    const type = newStatus === 'error' ? 'error' : 'completed'
    const durationSec = Math.round(runningDurationMs / 1000)
    const message =
      type === 'error'
        ? `Session "${sessionName}" encountered an error after ${durationSec}s`
        : `Session "${sessionName}" completed after ${durationSec}s`

    // Create and show Electron notification
    const notification = new Notification({
      title: type === 'error' ? 'Claude Code Error' : 'Claude Code Completed',
      body: message,
      silent: !settings.notification.sound
    })

    notification.on('click', () => {
      if (this.onClickCallback) {
        this.onClickCallback(sessionId)
      }
    })

    notification.show()

    // Save to history
    const record: NotificationRecord = {
      id: uuidv4(),
      sessionId,
      sessionName,
      type,
      message,
      timestamp: Date.now(),
      read: false
    }

    const history = this.store.get('history')
    history.unshift(record)

    // Keep only the last 100 notifications
    if (history.length > 100) {
      history.length = 100
    }

    this.store.set('history', history)
  }

  // Get notification history
  getHistory(): NotificationRecord[] {
    return this.store.get('history')
  }

  // Clear notification history
  clearHistory(): void {
    this.store.set('history', [])
  }

  // Set callback for notification click
  onNotificationClicked(callback: (sessionId: string) => void): void {
    this.onClickCallback = callback
  }

  private isInMutePeriod(muteStart: string | null, muteEnd: string | null): boolean {
    if (!muteStart || !muteEnd) return false

    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()

    const [startH, startM] = muteStart.split(':').map(Number)
    const [endH, endM] = muteEnd.split(':').map(Number)

    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    if (startMinutes <= endMinutes) {
      // Same-day range (e.g., 09:00 - 17:00)
      return currentMinutes >= startMinutes && currentMinutes < endMinutes
    } else {
      // Overnight range (e.g., 22:00 - 07:00)
      return currentMinutes >= startMinutes || currentMinutes < endMinutes
    }
  }
}
