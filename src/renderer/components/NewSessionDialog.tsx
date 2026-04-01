import React, { useState } from 'react'

interface NewSessionDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (folderPath: string) => void
}

const NewSessionDialog: React.FC<NewSessionDialogProps> = ({ open, onClose, onConfirm }) => {
  const [folderPath, setFolderPath] = useState('')

  if (!open) return null

  const handleSelectFolder = async () => {
    const result = await window.electronAPI.dialog.selectFolder()
    if (!result.canceled && result.folderPath) {
      setFolderPath(result.folderPath)
    }
  }

  const handleConfirm = () => {
    if (folderPath) {
      onConfirm(folderPath)
      setFolderPath('')
      onClose()
    }
  }

  const handleCancel = () => {
    setFolderPath('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#16213e] rounded-lg shadow-xl p-6 w-96 border border-[#0f3460]">
        <h2 className="text-lg font-semibold text-[#e0e0e0] mb-4">New Session</h2>

        {/* Folder selection */}
        <div className="mb-4">
          <label className="block text-sm text-[#888888] mb-2">Working Directory</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={folderPath}
              readOnly
              placeholder="Select a folder..."
              className="flex-1 px-3 py-2 bg-[#1a1a2e] border border-[#0f3460] rounded text-sm text-[#e0e0e0] placeholder-[#888888]"
            />
            <button
              onClick={handleSelectFolder}
              className="px-3 py-2 bg-[#0f3460] hover:bg-blue-700 text-[#e0e0e0] rounded text-sm transition-colors"
            >
              Browse
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-2">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm text-[#888888] hover:text-[#e0e0e0] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!folderPath}
            className="px-4 py-2 bg-[#0f3460] hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-[#e0e0e0] rounded text-sm transition-colors"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}

export default NewSessionDialog
