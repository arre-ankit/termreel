import { Command } from 'commander'
import * as p from '@clack/prompts'
import pc from 'picocolors'
import { loadThemes, selectTheme, type Theme } from '../lib/themes.js'

export const themesCommand = new Command('themes')
  .description('Browse and preview all 200+ VHS themes')
  .action(async () => {
    p.intro(pc.bold('Theme Browser') + pc.gray(` — ${loadThemes().length} themes`))

    const theme = await selectTheme()
    if (!theme) {
      p.cancel('Cancelled.')
      process.exit(0)
    }

    printThemeDetail(theme)

    const action = await p.select({
      message: 'What would you like to do?',
      options: [
        { value: 'copy', label: 'Copy theme name to clipboard' },
        { value: 'copy-json', label: 'Copy as Set Theme JSON (paste into tape file)' },
        { value: 'nothing', label: 'Nothing, just browsing' },
      ],
    })

    if (p.isCancel(action)) {
      p.outro(pc.gray('Done.'))
      process.exit(0)
    }

    if (action === 'copy') {
      const { default: clipboardy } = await import('clipboardy')
      await clipboardy.write(theme.name)
      p.outro(pc.green(`✔ Copied "${theme.name}" to clipboard`))
    } else if (action === 'copy-json') {
      const { default: clipboardy } = await import('clipboardy')
      const json = JSON.stringify({
        background: theme.background,
        foreground: theme.foreground,
        cursor: theme.cursor,
        black: theme.black,
        red: theme.red,
        green: theme.green,
        yellow: theme.yellow,
        blue: theme.blue,
        magenta: theme.magenta,
        cyan: theme.cyan,
        white: theme.white,
        brightBlack: theme.brightBlack,
        brightRed: theme.brightRed,
        brightGreen: theme.brightGreen,
        brightYellow: theme.brightYellow,
        brightBlue: theme.brightBlue,
        brightMagenta: theme.brightMagenta,
        brightCyan: theme.brightCyan,
        brightWhite: theme.brightWhite,
      })
      await clipboardy.write(`Set Theme ${json}`)
      p.outro(pc.green('✔ Copied Set Theme JSON to clipboard'))
    } else {
      p.outro(pc.gray('Done.'))
    }
  })

function printThemeDetail(theme: Theme): void {
  console.log()
  console.log(pc.bold(`  ${theme.name}`))
  console.log()

  const colorRow = (label: string, normal: string, bright: string) => {
    const n = colorSwatch(normal)
    const b = colorSwatch(bright)
    console.log(`  ${pc.gray(label.padEnd(10))}  ${n} ${normal.padEnd(9)}  ${b} ${bright}`)
  }

  console.log(`  ${pc.gray('background')}  ${colorSwatch(theme.background)} ${theme.background}`)
  console.log(`  ${pc.gray('foreground')}  ${colorSwatch(theme.foreground)} ${theme.foreground}`)
  console.log(`  ${pc.gray('cursor')}     ${colorSwatch(theme.cursor)} ${theme.cursor}`)
  console.log()
  colorRow('black', theme.black, theme.brightBlack)
  colorRow('red', theme.red, theme.brightRed)
  colorRow('green', theme.green, theme.brightGreen)
  colorRow('yellow', theme.yellow, theme.brightYellow)
  colorRow('blue', theme.blue, theme.brightBlue)
  colorRow('magenta', theme.magenta, theme.brightMagenta)
  colorRow('cyan', theme.cyan, theme.brightCyan)
  colorRow('white', theme.white, theme.brightWhite)
  console.log()
}

function colorSwatch(hex: string): string {
  try {
    const clean = hex.replace('#', '')
    const r = parseInt(clean.substring(0, 2), 16)
    const g = parseInt(clean.substring(2, 4), 16)
    const b = parseInt(clean.substring(4, 6), 16)
    return `\x1b[48;2;${r};${g};${b}m    \x1b[0m`
  } catch {
    return '    '
  }
}
