import React from 'react'
import { useUIStore } from '../stores/ui-store'
import { useSettingsStore } from '../stores/settings-store'

const SettingsPanel: React.FC = () => {
  const settingsPanelOpen = useUIStore((s) => s.settingsPanelOpen)
  const setSettingsPanelOpen = useUIStore((s) => s.setSettingsPanelOpen)
  const settings = useSettingsStore((s) => s.settings)
  const updateSetting = useSettingsStore((s) => s.updateSetting)

  if (!settingsPanelOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/40"
        onClick={() => setSettingsPanelOpen(false)}
      />

      {/* Panel */}
      <div className="w-96 h-full bg-[#16213e] border-l border-[#0f3460] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#0f3460]">
          <h2 className="text-lg font-semibold text-[#e0e0e0]">Settings</h2>
          <button
            onClick={() => setSettingsPanelOpen(false)}
            className="p-1 rounded hover:bg-[#0f3460] text-[#888888] hover:text-[#e0e0e0] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Notifications */}
          <section>
            <h3 className="text-sm font-medium text-[#e0e0e0] mb-3">Notifications</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-sm text-[#888888]">Enable Notifications</span>
                <input
                  type="checkbox"
                  checked={settings.notificationsEnabled}
                  onChange={(e) => updateSetting('notificationsEnabled', e.target.checked)}
                  className="w-4 h-4 accent-blue-400"
                />
              </label>
              <div>
                <label className="block text-sm text-[#888888] mb-1">
                  Threshold (seconds)
                </label>
                <input
                  type="number"
                  value={Math.round(settings.notificationThresholdMs / 1000)}
                  onChange={(e) => updateSetting('notificationThresholdMs', parseInt(e.target.value) * 1000 || 30000)}
                  min={1}
                  className="w-full px-3 py-2 bg-[#1a1a2e] border border-[#0f3460] rounded text-sm text-[#e0e0e0] focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>
          </section>

          {/* Mute schedule */}
          <section>
            <h3 className="text-sm font-medium text-[#e0e0e0] mb-3">Mute Schedule</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-[#888888] mb-1">Start</label>
                <input
                  type="time"
                  value={settings.muteStart || ''}
                  onChange={(e) => updateSetting('muteStart', e.target.value || undefined)}
                  className="w-full px-3 py-2 bg-[#1a1a2e] border border-[#0f3460] rounded text-sm text-[#e0e0e0] focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm text-[#888888] mb-1">End</label>
                <input
                  type="time"
                  value={settings.muteEnd || ''}
                  onChange={(e) => updateSetting('muteEnd', e.target.value || undefined)}
                  className="w-full px-3 py-2 bg-[#1a1a2e] border border-[#0f3460] rounded text-sm text-[#e0e0e0] focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>
          </section>

          {/* Appearance */}
          <section>
            <h3 className="text-sm font-medium text-[#e0e0e0] mb-3">Appearance</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-[#888888] mb-1">Font Size</label>
                <input
                  type="number"
                  value={settings.fontSize}
                  onChange={(e) => updateSetting('fontSize', parseInt(e.target.value) || 14)}
                  min={10}
                  max={24}
                  className="w-full px-3 py-2 bg-[#1a1a2e] border border-[#0f3460] rounded text-sm text-[#e0e0e0] focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm text-[#888888] mb-1">Font Family</label>
                <input
                  type="text"
                  value={settings.fontFamily}
                  onChange={(e) => updateSetting('fontFamily', e.target.value)}
                  className="w-full px-3 py-2 bg-[#1a1a2e] border border-[#0f3460] rounded text-sm text-[#e0e0e0] focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm text-[#888888] mb-1">Sidebar Width</label>
                <input
                  type="range"
                  value={settings.sidebarWidth}
                  onChange={(e) => updateSetting('sidebarWidth', parseInt(e.target.value))}
                  min={180}
                  max={400}
                  className="w-full accent-blue-400"
                />
                <span className="text-xs text-[#888888]">{settings.sidebarWidth}px</span>
              </div>
            </div>
          </section>

          {/* System */}
          <section>
            <h3 className="text-sm font-medium text-[#e0e0e0] mb-3">System</h3>
            <label className="flex items-center justify-between">
              <span className="text-sm text-[#888888]">Show Git Panel</span>
              <input
                type="checkbox"
                checked={settings.showGitPanel}
                onChange={(e) => updateSetting('showGitPanel', e.target.checked)}
                className="w-4 h-4 accent-blue-400"
              />
            </label>
          </section>
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel
