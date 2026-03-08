import { Command } from 'commander'
import * as p from '@clack/prompts'
import ora from 'ora'
import pc from 'picocolors'
import { writeFileSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { getApiKey, saveApiKey, getProvider, saveProvider } from '../lib/config.js'
import { generateTape, generateName, refineTape, fixTape, PROVIDERS, type Provider } from '../lib/ai.js'
import { selectTheme } from '../lib/themes.js'
import { selectFont, DEFAULT_FONT } from '../lib/fonts.js'
import { checkVHSInstalled, printVHSInstallInstructions, runVHS } from '../lib/vhs.js'

const DIMENSION_PRESETS = [
  { value: '1280x720', label: '1280 × 720', hint: 'HD (recommended)' },
  { value: '1920x1080', label: '1920 × 1080', hint: 'Full HD' },
  { value: '800x600', label: '800 × 600', hint: 'Compact' },
  { value: 'custom', label: 'Custom', hint: 'Enter your own dimensions' },
]

const FORMAT_OPTIONS = [
  { value: 'gif', label: 'GIF', hint: 'Best for sharing on GitHub/X' },
  { value: 'mp4', label: 'MP4', hint: 'Best for video players' },
  { value: 'webm', label: 'WebM', hint: 'Best for web' },
]

function fileUrl(filePath: string): string {
  return `file://${resolve(filePath)}`
}

function hyperlink(text: string, url: string): string {
  return `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`
}

async function resolveProviderAndKey(): Promise<{ provider: Provider; apiKey: string; model: string }> {
  const savedProvider = getProvider()

  const provider = await p.select({
    message: 'AI provider',
    options: Object.entries(PROVIDERS).map(([value, meta]) => ({
      value,
      label: meta.label,
      hint: meta.defaultModel,
    })),
    initialValue: savedProvider ?? 'anthropic',
  }) as Provider

  if (p.isCancel(provider)) { p.cancel('Cancelled.'); process.exit(0) }
  saveProvider(provider)

  const meta = PROVIDERS[provider]

  const model = await p.select({
    message: 'Model',
    options: meta.models.map((m) => ({
      value: m,
      label: m,
      hint: m === meta.defaultModel ? 'default' : '',
    })),
    initialValue: meta.defaultModel,
  }) as string

  if (p.isCancel(model)) { p.cancel('Cancelled.'); process.exit(0) }

  let apiKey = getApiKey(provider)

  if (!apiKey) {
    console.log()
    console.log(pc.gray(`  No ${meta.label} API key found. Get one at `) + pc.cyan(meta.docsUrl))
    console.log()

    const key = await p.text({
      message: `Enter your ${meta.label} API key`,
      placeholder: meta.keyHint,
      validate: (v) => {
        if (!v.startsWith(meta.keyPrefix)) return `Key must start with ${meta.keyPrefix}`
        if (v.length < 20) return 'API key looks too short'
      },
    })

    if (p.isCancel(key)) { p.cancel('Cancelled.'); process.exit(0) }
    saveApiKey(provider, key as string)
    apiKey = key as string
    console.log(pc.gray(`  Saved to ~/.config/termreel/config.json`))
    console.log()
  }

  return { provider, apiKey, model }
}

function printTape(tapeContent: string): void {
  console.log()
  tapeContent.split('\n').forEach((line) => {
    if (line.startsWith('Output')) console.log('  ' + pc.cyan(line))
    else if (line.startsWith('Set')) console.log('  ' + pc.gray(line))
    else if (line.startsWith('#')) console.log('  ' + pc.gray(line))
    else if (line.startsWith('Hide') || line.startsWith('Show')) console.log('  ' + pc.yellow(line))
    else if (line.startsWith('Sleep') || line.startsWith('Wait')) console.log('  ' + pc.gray(line))
    else if (line.trim()) console.log('  ' + pc.white(line))
    else console.log()
  })
  console.log()
}

function printOutputFiles(tapeContent: string): void {
  const matches = tapeContent.match(/^Output (.+)$/gm) ?? []
  if (matches.length === 0) return
  console.log()
  matches.forEach((line) => {
    const file = line.replace('Output ', '').trim()
    const link = hyperlink(file, fileUrl(file))
    console.log('  ' + pc.gray('→') + ' ' + pc.cyan(link))
  })
  console.log()
}

const MAX_AUTO_FIX_ATTEMPTS = 3

async function recordAndRefineLoop(
  tapePath: string,
  apiKey: string,
  provider: Provider,
  model: string,
): Promise<void> {
  let autoFixAttempts = 0

  while (true) {
    const currentTape = readFileSync(tapePath, 'utf-8')

    const recordSpinner = ora({ text: 'Recording...', color: 'cyan' }).start()
    let recordError: string | null = null

    try {
      await runVHS(tapePath)
      recordSpinner.succeed(pc.green('Recording complete!'))
      autoFixAttempts = 0
    } catch (err) {
      recordError = String(err)
      recordSpinner.fail(pc.red('Recording failed'))
      console.log()
      console.log(pc.red('  ' + recordError.split('\n').join('\n  ')))
      console.log()
    }

    if (!recordError) {
      printOutputFiles(currentTape)

      const action = await p.select({
        message: 'What next?',
        options: [
          { value: 'refine', label: 'Refine with AI', hint: 'describe what to change' },
          { value: 'done', label: 'Done' },
        ],
      })

      if (p.isCancel(action) || action === 'done') {
        p.outro(pc.green('All done!'))
        return
      }

      const refinement = await p.text({
        message: 'What would you like to change?',
        placeholder: 'e.g. slower typing, add git status at the end, make the pauses shorter',
        validate: (v) => { if (!v || v.trim().length < 5) return 'Please describe the change' },
      })

      if (p.isCancel(refinement)) { p.outro(pc.gray(`Tape saved to ${pc.white(tapePath)}`)); return }

      const refineSpinner = ora({ text: 'Refining tape...', color: 'cyan' }).start()

      try {
        const refined = await refineTape(apiKey, {
          currentTape,
          refinement: refinement as string,
          provider,
          model,
        })
        refineSpinner.succeed(pc.green('Tape refined!'))
        writeFileSync(tapePath, refined, 'utf-8')
        printTape(refined)
      } catch (err) {
        refineSpinner.fail(pc.red('Refinement failed'))
        console.log(pc.red(String(err)))
        p.outro(pc.gray(`Tape saved to ${pc.white(tapePath)}`))
        return
      }
    } else {
      if (autoFixAttempts >= MAX_AUTO_FIX_ATTEMPTS) {
        console.log(pc.yellow(`  Auto-fix failed after ${MAX_AUTO_FIX_ATTEMPTS} attempts.`))
        console.log(pc.gray(`  Tape saved to ${pc.white(tapePath)} — edit it manually and run: termreel run ${tapePath}`))
        p.outro(pc.red('Could not auto-fix the tape.'))
        return
      }

      autoFixAttempts++
      console.log(pc.yellow(`  Auto-fixing with AI (attempt ${autoFixAttempts}/${MAX_AUTO_FIX_ATTEMPTS})...`))

      const fixSpinner = ora({ text: `Sending error to ${PROVIDERS[provider].label} to fix the tape...`, color: 'yellow' }).start()

      try {
        const fixed = await fixTape(apiKey, {
          currentTape,
          error: recordError,
          provider,
          model,
        })
        fixSpinner.succeed(pc.green('Tape fixed! Re-recording...'))
        writeFileSync(tapePath, fixed, 'utf-8')
        printTape(fixed)
      } catch (err) {
        fixSpinner.fail(pc.red('Auto-fix failed'))
        console.log(pc.red(String(err)))
        p.outro(pc.gray(`Tape saved to ${pc.white(tapePath)}`))
        return
      }
    }
  }
}

export const newCommand = new Command('new')
  .description('Generate a terminal demo with AI and record it')
  .action(async () => {
    p.intro(pc.bold('termreel new') + pc.gray(' — AI tape generator'))

    const { provider, apiKey, model } = await resolveProviderAndKey()

    const description = await p.text({
      message: 'Describe what you want to demo',
      placeholder: 'e.g. Show how to install and use my CLI tool "myapp" — npm install, then myapp init, then myapp run',
      validate: (v) => {
        if (!v || v.trim().length < 10) return 'Please describe your demo (at least 10 characters)'
      },
    })

    if (p.isCancel(description)) { p.cancel('Cancelled.'); process.exit(0) }

    // kick off name generation in background while user picks the rest
    const namePromise = generateName({ description: description as string, provider, apiKey, model })

    const formats = await p.multiselect({
      message: 'Output formats',
      options: FORMAT_OPTIONS,
      initialValues: ['gif'],
      required: true,
    })

    if (p.isCancel(formats)) { p.cancel('Cancelled.'); process.exit(0) }

    const theme = await selectTheme('Catppuccin Mocha')
    if (!theme) { p.cancel('Cancelled.'); process.exit(0) }

    const font = await selectFont(DEFAULT_FONT.name)
    if (!font) { p.cancel('Cancelled.'); process.exit(0) }

    const dimensionPreset = await p.select({
      message: 'Terminal dimensions',
      options: DIMENSION_PRESETS,
      initialValue: '1280x720',
    })

    if (p.isCancel(dimensionPreset)) { p.cancel('Cancelled.'); process.exit(0) }

    let width = 1280
    let height = 720

    if (dimensionPreset === 'custom') {
      const wInput = await p.text({ message: 'Width (px)', placeholder: '1280', defaultValue: '1280', validate: (v) => { if (isNaN(Number(v))) return 'Must be a number' } })
      if (p.isCancel(wInput)) { p.cancel('Cancelled.'); process.exit(0) }
      const hInput = await p.text({ message: 'Height (px)', placeholder: '720', defaultValue: '720', validate: (v) => { if (isNaN(Number(v))) return 'Must be a number' } })
      if (p.isCancel(hInput)) { p.cancel('Cancelled.'); process.exit(0) }
      width = Number(wInput)
      height = Number(hInput)
    } else {
      const [w, h] = (dimensionPreset as string).split('x').map(Number)
      width = w
      height = h
    }

    // by now name is almost certainly ready — await it (usually instant)
    const suggestedName = await namePromise

    const outputName = await p.text({
      message: 'Filename (without extension)',
      placeholder: suggestedName,
      defaultValue: suggestedName,
      initialValue: suggestedName,
    })

    if (p.isCancel(outputName)) { p.cancel('Cancelled.'); process.exit(0) }

    console.log()

    const spinner = ora({ text: `Generating tape with ${PROVIDERS[provider].label} (${model})...`, color: 'cyan' }).start()

    let tapeContent: string
    try {
      tapeContent = await generateTape(apiKey, {
        description: description as string,
        outputName: (outputName as string) || suggestedName,
        formats: formats as Array<'gif' | 'mp4' | 'webm'>,
        theme: theme.name,
        font: font.vhsName,
        width,
        height,
        provider,
        model,
      })
      spinner.succeed(pc.green('Tape generated!'))
    } catch (err) {
      spinner.fail(pc.red('Failed to generate tape'))
      console.log(pc.red(String(err)))
      process.exit(1)
    }

    const tapePath = `${(outputName as string) || suggestedName}.tape`
    writeFileSync(tapePath, tapeContent, 'utf-8')
    printTape(tapeContent)
    console.log(pc.gray(`  Tape saved: ${pc.white(tapePath)}`))

    if (!checkVHSInstalled()) {
      printVHSInstallInstructions()
      p.outro(pc.yellow(`Install VHS to record it: termreel run ${tapePath}`))
      return
    }

    console.log()
    await recordAndRefineLoop(tapePath, apiKey, provider, model)
  })
