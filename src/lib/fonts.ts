import search from '@inquirer/search'

export interface Font {
  name: string
  vhsName: string
  hint: string
}

// Fonts referenced in the VHS source (vhs.go default fallback chain + README examples)
// VHS accepts any font installed on the system — these are the ones it ships with knowledge of.
export const FONTS: Font[] = [
  // ── VHS built-in defaults (vhs.go fallback chain) ──────────────────────────
  { name: 'JetBrains Mono', vhsName: 'JetBrains Mono', hint: 'VHS default #1 · ligatures' },
  { name: 'DejaVu Sans Mono', vhsName: 'DejaVu Sans Mono', hint: 'VHS default #2 · wide Unicode' },
  { name: 'Menlo', vhsName: 'Menlo', hint: 'VHS default #3 · macOS terminal' },
  { name: 'Bitstream Vera Sans Mono', vhsName: 'Bitstream Vera Sans Mono', hint: 'VHS default #4 · classic' },
  { name: 'Inconsolata', vhsName: 'Inconsolata', hint: 'VHS default #5 · humanist, compact' },
  { name: 'Roboto Mono', vhsName: 'Roboto Mono', hint: 'VHS default #6 · Google, clean' },
  { name: 'Hack', vhsName: 'Hack', hint: 'VHS default #7 · designed for code' },
  { name: 'Consolas', vhsName: 'Consolas', hint: 'VHS default #8 · Windows Terminal' },
  // ── VHS README / examples ───────────────────────────────────────────────────
  { name: 'Monoflow', vhsName: 'Monoflow', hint: 'VHS README example font' },
  // ── Monaspace family (GitHub) ───────────────────────────────────────────────
  { name: 'Monaspace Neon', vhsName: 'Monaspace Neon', hint: 'GitHub · textured, modern' },
  { name: 'Monaspace Argon', vhsName: 'Monaspace Argon', hint: 'GitHub · humanist' },
  { name: 'Monaspace Krypton', vhsName: 'Monaspace Krypton', hint: 'GitHub · mechanical' },
  { name: 'Monaspace Xenon', vhsName: 'Monaspace Xenon', hint: 'GitHub · slab serif' },
  { name: 'Monaspace Radon', vhsName: 'Monaspace Radon', hint: 'GitHub · handwriting' },
  // ── Popular ligature fonts ───────────────────────────────────────────────────
  { name: 'Fira Code', vhsName: 'Fira Code', hint: 'Mozilla · ligatures, classic' },
  { name: 'Cascadia Code', vhsName: 'Cascadia Code', hint: 'Microsoft · ligatures, Windows Terminal' },
  { name: 'Cascadia Mono', vhsName: 'Cascadia Mono', hint: 'Microsoft · no ligatures' },
  { name: 'Victor Mono', vhsName: 'Victor Mono', hint: 'Italic cursive, ligatures' },
  { name: 'Maple Mono', vhsName: 'Maple Mono', hint: 'Open source · ligatures, rounded' },
  // ── Modern picks ────────────────────────────────────────────────────────────
  { name: 'Geist Mono', vhsName: 'Geist Mono', hint: 'Vercel · clean, minimal' },
  { name: 'Commit Mono', vhsName: 'Commit Mono', hint: 'Open source · neutral, readable' },
  { name: 'Zed Mono', vhsName: 'Zed Mono', hint: 'Zed editor · modern' },
  { name: 'Iosevka', vhsName: 'Iosevka', hint: 'Narrow, highly customizable' },
  { name: 'Iosevka Term', vhsName: 'Iosevka Term', hint: 'Iosevka · terminal variant' },
  // ── Professional / editorial ─────────────────────────────────────────────────
  { name: 'Source Code Pro', vhsName: 'Source Code Pro', hint: 'Adobe · clean, professional' },
  { name: 'IBM Plex Mono', vhsName: 'IBM Plex Mono', hint: 'IBM · geometric, modern' },
  { name: 'Anonymous Pro', vhsName: 'Anonymous Pro', hint: 'Classic terminal look' },
  // ── System fonts ─────────────────────────────────────────────────────────────
  { name: 'SF Mono', vhsName: 'SF Mono', hint: 'Apple · macOS system font' },
  { name: 'Monaco', vhsName: 'Monaco', hint: 'Apple · classic macOS' },
  { name: 'Ubuntu Mono', vhsName: 'Ubuntu Mono', hint: 'Ubuntu · friendly, round' },
  { name: 'Noto Sans Mono', vhsName: 'Noto Sans Mono', hint: 'Google · max language support' },
  { name: 'Courier New', vhsName: 'Courier New', hint: 'Classic typewriter, universal' },
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
          name: `${f.name.padEnd(26)} ${f.hint}`,
          value: f,
          short: f.name,
        }))
      },
      pageSize: 14,
    })
    return selected
  } catch {
    return null
  }
}
