import { execFile } from 'child_process'
import { promisify } from 'util'
import type { GitDiffResult, GitFileStat } from '../shared/types'

const execFileAsync = promisify(execFile)

export class GitService {
  // Get git diff --numstat for the given working directory
  async getDiffStat(cwd: string): Promise<GitDiffResult> {
    try {
      const { stdout } = await execFileAsync('git', ['diff', '--numstat'], {
        cwd,
        timeout: 10000
      })

      const files: GitFileStat[] = []
      let totalAdditions = 0
      let totalDeletions = 0

      const lines = stdout.trim().split('\n').filter(Boolean)

      for (const line of lines) {
        const parts = line.split('\t')
        if (parts.length < 3) continue

        const additions = parts[0] === '-' ? 0 : parseInt(parts[0], 10)
        const deletions = parts[1] === '-' ? 0 : parseInt(parts[1], 10)
        const file = parts[2]

        files.push({ file, additions, deletions })
        totalAdditions += additions
        totalDeletions += deletions
      }

      return { cwd, files, totalAdditions, totalDeletions }
    } catch {
      // Return empty result if git is not available or not a git repo
      return { cwd, files: [], totalAdditions: 0, totalDeletions: 0 }
    }
  }
}
