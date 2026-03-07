import themesJson from '../data/themes.json' with { type: 'json' }
import search from '@inquirer/search'
import pc from 'picocolors'

export interface Theme {
  name: string
  background: string
  foreground: string
  cursor: string
  cursorAccent?: string
  selection?: string
  black: string
  red: string
  green: string
  yellow: string
  blue: string
  magenta: string
  cyan: string
  white: string
  brightBlack: string
  brightRed: string
  brightGreen: string
  brightYellow: string
  brightBlue: string
  brightMagenta: string
  brightCyan: string
  brightWhite: string
}

export function loadThemes(): Theme[] {
  return themesJson as Theme[]
}

export function findTheme(name: string): Theme | undefined {
  const themes = loadThemes()
  return themes.find((t) => t.name.toLowerCase() === name.toLowerCase())
}

export function searchThemes(query: string): Theme[] {
  const themes = loadThemes()
  const q = query.toLowerCase()
  return themes.filter((t) => t.name.toLowerCase().includes(q))
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  return [r, g, b]
}

function colorBlock(hex: string): string {
  try {
    const [r, g, b] = hexToRgb(hex)
    return `\x1b[48;2;${r};${g};${b}m  \x1b[0m`
  } catch {
    return '  '
  }
}

export function renderThemePreview(theme: Theme): string {
  const colors = [
    theme.black,
    theme.red,
    theme.green,
    theme.yellow,
    theme.blue,
    theme.magenta,
    theme.cyan,
    theme.white,
  ]
  const blocks = colors.map(colorBlock).join('')
  return `${blocks}  bg:${theme.background} fg:${theme.foreground}`
}

export async function selectTheme(initialValue = 'Catppuccin Mocha'): Promise<Theme | null> {
  const allThemes = loadThemes()

  try {
    const selected = await search<Theme>({
      message: 'Pick a theme',
      source: (input) => {
        const q = (input ?? '').toLowerCase().trim()
        const matches = q
          ? allThemes.filter((t) => t.name.toLowerCase().includes(q))
          : allThemes
        return matches.map((t) => ({
          name: `${t.name}  ${renderThemePreview(t)}`,
          value: t,
          short: t.name,
        }))
      },
      pageSize: 12,
    })
    return selected
  } catch {
    return null
  }
}

export function themeToVHSString(theme: Theme): string {
  return JSON.stringify({
    background: theme.background,
    foreground: theme.foreground,
    cursor: theme.cursor,
    cursorAccent: theme.cursorAccent ?? theme.background,
    selection: theme.selection ?? theme.brightBlack,
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
}
