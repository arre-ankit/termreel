import { Command } from 'commander'
import * as p from '@clack/prompts'
import ora from 'ora'
import pc from 'picocolors'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join, basename } from 'path'
import { selectTheme, themeToVHSString } from '../lib/themes.js'
import { checkVHSInstalled, printVHSInstallInstructions, runVHS, injectThemeIntoTape } from '../lib/vhs.js'

export const runCommand = new Command('run')
  .description('Run a .tape file through VHS')
  .argument('<tape>', 'path to the .tape file')
  .option('-t, --theme <name>', 'theme name to use (skips interactive picker)')
  .option('--no-theme', 'use the theme already in the tape file')
  .action(async (tapePath: string, opts: { theme?: string | boolean }) => {
    if (!checkVHSInstalled()) {
      printVHSInstallInstructions()
      process.exit(1)
    }

    if (!existsSync(tapePath)) {
      console.log(pc.red(`✖ File not found: ${tapePath}`))
      process.exit(1)
    }

    p.intro(pc.bold('termreel run') + pc.gray(` — ${basename(tapePath)}`))

    let tapeContent = readFileSync(tapePath, 'utf-8')
    let finalTapePath = tapePath

    const skipTheme = opts.theme === false
    const themeFlag = typeof opts.theme === 'string' ? opts.theme : null

    if (!skipTheme) {
      let themeJson: string | null = null

      if (themeFlag) {
        const { findTheme } = await import('../lib/themes.js')
        const found = findTheme(themeFlag)
        if (!found) {
          console.log(pc.yellow(`⚠ Theme "${themeFlag}" not found, using tape's existing theme`))
        } else {
          themeJson = themeToVHSString(found)
        }
      } else {
        const theme = await selectTheme()
        if (!theme) {
          p.cancel('Cancelled.')
          process.exit(0)
        }
        themeJson = themeToVHSString(theme)
      }

      if (themeJson) {
        tapeContent = injectThemeIntoTape(tapeContent, themeJson)
        const tmpFile = join(tmpdir(), `termreel-${Date.now()}.tape`)
        writeFileSync(tmpFile, tapeContent, 'utf-8')
        finalTapePath = tmpFile
      }
    }

    const spinner = ora({ text: 'Recording...', color: 'cyan' }).start()

    try {
      await runVHS(finalTapePath)
      spinner.succeed(pc.green('Recording complete!'))

      const outputMatches = tapeContent.match(/^Output (.+)$/gm)
      if (outputMatches) {
        console.log()
        outputMatches.forEach((line) => {
          const file = line.replace('Output ', '')
          console.log('  ' + pc.gray('→') + ' ' + pc.cyan(file))
        })
      }

      p.outro(pc.green('Done!'))
    } catch (err) {
      spinner.fail(pc.red('Recording failed'))
      console.log(pc.red(String(err)))
      process.exit(1)
    }
  })
