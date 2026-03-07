import { execSync, spawn } from 'child_process'
import pc from 'picocolors'

export function checkVHSInstalled(): boolean {
  try {
    execSync('which vhs', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

export function printVHSInstallInstructions(): void {
  console.log()
  console.log(pc.red('✖') + ' ' + pc.bold('VHS is not installed.'))
  console.log()
  console.log('  Install it with one of:')
  console.log()
  console.log('  ' + pc.cyan('brew install vhs') + '                              (macOS)')
  console.log('  ' + pc.cyan('go install github.com/charmbracelet/vhs@latest') + '  (Go)')
  console.log('  ' + pc.cyan('https://github.com/charmbracelet/vhs#installation') + '  (other)')
  console.log()
}

export function runVHS(tapePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('vhs', [tapePath], { stdio: ['inherit', 'pipe', 'pipe'] })

    const outChunks: Buffer[] = []
    const errChunks: Buffer[] = []

    child.stdout?.on('data', (chunk: Buffer) => outChunks.push(chunk))
    child.stderr?.on('data', (chunk: Buffer) => errChunks.push(chunk))

    child.on('error', (err) => {
      reject(new Error(`Failed to run vhs: ${err.message}`))
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        const out = Buffer.concat(outChunks).toString().trim()
        const err = Buffer.concat(errChunks).toString().trim()
        const detail = [out, err].filter(Boolean).join('\n')
        reject(new Error(`vhs exited with code ${code}${detail ? `\n\n${detail}` : ''}`))
      }
    })
  })
}

export function injectThemeIntoTape(tapeContent: string, themeJson: string): string {
  const setThemeRegex = /^Set Theme .+$/m
  const themeDirective = `Set Theme ${themeJson}`

  if (setThemeRegex.test(tapeContent)) {
    return tapeContent.replace(setThemeRegex, themeDirective)
  }

  const outputMatch = tapeContent.match(/^(Output .+)$/m)
  if (outputMatch) {
    return tapeContent.replace(
      outputMatch[0],
      `${outputMatch[0]}\n${themeDirective}`,
    )
  }

  return `${themeDirective}\n${tapeContent}`
}
