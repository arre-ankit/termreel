import { describe, it, expect } from 'vitest'
import { injectThemeIntoTape } from '../src/lib/vhs.js'

describe('injectThemeIntoTape', () => {
  const themeJson = '{"background":"#1e1e2e","foreground":"#cdd6f4"}'

  it('replaces existing Set Theme line', () => {
    const tape = `Output demo.gif\nSet Theme "Dracula"\nType "hello"`
    const result = injectThemeIntoTape(tape, themeJson)
    expect(result).toContain(`Set Theme ${themeJson}`)
    expect(result).not.toContain('Set Theme "Dracula"')
  })

  it('inserts after Output line when no Set Theme exists', () => {
    const tape = `Output demo.gif\nType "hello"`
    const result = injectThemeIntoTape(tape, themeJson)
    expect(result).toContain(`Set Theme ${themeJson}`)
  })

  it('prepends when no Output line exists', () => {
    const tape = `Type "hello"`
    const result = injectThemeIntoTape(tape, themeJson)
    expect(result.startsWith(`Set Theme ${themeJson}`)).toBe(true)
  })

  it('preserves other content', () => {
    const tape = `Output demo.gif\nSet Theme "Nord"\nType "ls -la"\nEnter`
    const result = injectThemeIntoTape(tape, themeJson)
    expect(result).toContain('Type "ls -la"')
    expect(result).toContain('Enter')
    expect(result).toContain('Output demo.gif')
  })
})
