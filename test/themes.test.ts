import { describe, it, expect } from 'vitest'
import { loadThemes, findTheme, renderThemePreview, themeToVHSString } from '../src/lib/themes.js'

describe('loadThemes', () => {
  it('loads all themes', () => {
    const themes = loadThemes()
    expect(themes.length).toBeGreaterThan(200)
  })

  it('returns themes with required fields', () => {
    const themes = loadThemes()
    const theme = themes[0]
    expect(theme).toHaveProperty('name')
    expect(theme).toHaveProperty('background')
    expect(theme).toHaveProperty('foreground')
    expect(theme).toHaveProperty('black')
    expect(theme).toHaveProperty('red')
    expect(theme).toHaveProperty('green')
  })

  it('returns same reference on second call', () => {
    const a = loadThemes()
    const b = loadThemes()
    expect(a).toBe(b)
  })
})

describe('findTheme', () => {
  it('finds a theme by exact name', () => {
    const theme = findTheme('Dracula')
    expect(theme).toBeDefined()
    expect(theme?.name).toBe('Dracula')
  })

  it('is case-insensitive', () => {
    const theme = findTheme('dracula')
    expect(theme).toBeDefined()
    expect(theme?.name).toBe('Dracula')
  })

  it('returns undefined for unknown theme', () => {
    const theme = findTheme('NonExistentTheme12345')
    expect(theme).toBeUndefined()
  })

  it('finds Catppuccin Mocha', () => {
    const theme = findTheme('Catppuccin Mocha')
    expect(theme).toBeDefined()
  })
})

describe('renderThemePreview', () => {
  it('returns a non-empty string', () => {
    const themes = loadThemes()
    const preview = renderThemePreview(themes[0])
    expect(typeof preview).toBe('string')
    expect(preview.length).toBeGreaterThan(0)
  })

  it('includes background and foreground hex', () => {
    const theme = findTheme('Dracula')!
    const preview = renderThemePreview(theme)
    expect(preview).toContain(theme.background)
    expect(preview).toContain(theme.foreground)
  })
})

describe('themeToVHSString', () => {
  it('returns valid JSON', () => {
    const theme = findTheme('Dracula')!
    const json = themeToVHSString(theme)
    expect(() => JSON.parse(json)).not.toThrow()
  })

  it('includes all required VHS theme fields', () => {
    const theme = findTheme('Dracula')!
    const parsed = JSON.parse(themeToVHSString(theme))
    expect(parsed).toHaveProperty('background')
    expect(parsed).toHaveProperty('foreground')
    expect(parsed).toHaveProperty('cursor')
    expect(parsed).toHaveProperty('black')
    expect(parsed).toHaveProperty('brightWhite')
  })
})
