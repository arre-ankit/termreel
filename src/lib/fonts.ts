import search from '@inquirer/search'

export interface Font {
  name: string
  vhsName: string
  hint: string
}

export const FONTS: Font[] = [
  { name: 'Monaspace Neon', vhsName: 'Monaspace Neon', hint: 'GitHub · textured, modern' },
  { name: 'Monaspace Argon', vhsName: 'Monaspace Argon', hint: 'GitHub · humanist' },
  { name: 'Monaspace Krypton', vhsName: 'Monaspace Krypton', hint: 'GitHub · mechanical' },
  { name: 'Monaspace Xenon', vhsName: 'Monaspace Xenon', hint: 'GitHub · slab serif' },
  { name: 'Monaspace Radon', vhsName: 'Monaspace Radon', hint: 'GitHub · handwriting' },
  { name: 'JetBrains Mono', vhsName: 'JetBrains Mono', hint: 'JetBrains · ligatures, popular' },
  { name: 'Fira Code', vhsName: 'Fira Code', hint: 'Mozilla · ligatures, classic' },
  { name: 'Cascadia Code', vhsName: 'Cascadia Code', hint: 'Microsoft · ligatures, Windows Terminal' },
  { name: 'Cascadia Mono', vhsName: 'Cascadia Mono', hint: 'Microsoft · no ligatures' },
  { name: 'Geist Mono', vhsName: 'Geist Mono', hint: 'Vercel · clean, minimal' },
  { name: 'Commit Mono', vhsName: 'Commit Mono', hint: 'Open source · neutral, readable' },
  { name: 'Maple Mono', vhsName: 'Maple Mono', hint: 'Open source · ligatures, rounded' },
  { name: 'Victor Mono', vhsName: 'Victor Mono', hint: 'Italic cursive, ligatures' },
  { name: 'Iosevka', vhsName: 'Iosevka', hint: 'Narrow, highly customizable' },
  { name: 'Iosevka Term', vhsName: 'Iosevka Term', hint: 'Iosevka · terminal variant' },
  { name: 'Hack', vhsName: 'Hack', hint: 'Open source · designed for code' },
  { name: 'Source Code Pro', vhsName: 'Source Code Pro', hint: 'Adobe · clean, professional' },
  { name: 'IBM Plex Mono', vhsName: 'IBM Plex Mono', hint: 'IBM · geometric, modern' },
  { name: 'Roboto Mono', vhsName: 'Roboto Mono', hint: 'Google · familiar, clean' },
  { name: 'Inconsolata', vhsName: 'Inconsolata', hint: 'Humanist, compact' },
  { name: 'Anonymous Pro', vhsName: 'Anonymous Pro', hint: 'Classic terminal look' },
  { name: 'Ubuntu Mono', vhsName: 'Ubuntu Mono', hint: 'Ubuntu · friendly, round' },
  { name: 'DejaVu Sans Mono', vhsName: 'DejaVu Sans Mono', hint: 'Wide Unicode coverage' },
  { name: 'Noto Sans Mono', vhsName: 'Noto Sans Mono', hint: 'Google · max language support' },
  { name: 'SF Mono', vhsName: 'SF Mono', hint: 'Apple · macOS system font' },
  { name: 'Menlo', vhsName: 'Menlo', hint: 'Apple · macOS default terminal' },
  { name: 'Monaco', vhsName: 'Monaco', hint: 'Apple · classic macOS' },
  { name: 'Consolas', vhsName: 'Consolas', hint: 'Microsoft · Windows default' },
  { name: 'Courier New', vhsName: 'Courier New', hint: 'Classic typewriter, universal' },
  { name: 'Zed Mono', vhsName: 'Zed Mono', hint: 'Zed editor · modern' },
]

export const DEFAULT_FONT = FONTS.find(f => f.name === 'Monaspace Neon')!

export async function selectFont(initialName = 'Monaspace Neon'): Promise<Font | null> {
  try {
    const selected = await search<Font>({
      message: 'Pick a font',
      source: (input: string | undefined) => {
        const q = (input ?? '').toLowerCase().trim()
        const matches = q
          ? FONTS.filter(f => f.name.toLowerCase().includes(q) || f.hint.toLowerCase().includes(q))
          : FONTS
        return matches.map(f => ({
          name: `${f.name.padEnd(22)} ${f.hint}`,
          value: f,
          short: f.name,
        }))
      },
      pageSize: 12,
    })
    return selected
  } catch {
    return null
  }
}
