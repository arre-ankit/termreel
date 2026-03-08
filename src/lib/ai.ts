import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { findTheme, themeToVHSString } from './themes.js'
import { VHS_SYSTEM_PROMPT, NAME_SYSTEM_PROMPT, REFINE_SYSTEM_PROMPT, FIX_SYSTEM_PROMPT } from './prompt.js'

export type Provider = 'anthropic' | 'openai'

export const PROVIDERS: Record<Provider, {
  label: string
  models: string[]
  defaultModel: string
  keyPrefix: string
  keyHint: string
  docsUrl: string
}> = {
  anthropic: {
    label: 'Anthropic (Claude)',
    models: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5'],
    defaultModel: 'claude-sonnet-4-5',
    keyPrefix: 'sk-ant-',
    keyHint: 'sk-ant-...',
    docsUrl: 'https://console.anthropic.com',
  },
  openai: {
    label: 'OpenAI (GPT)',
    models: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4o', 'o4-mini'],
    defaultModel: 'gpt-4.1',
    keyPrefix: 'sk-',
    keyHint: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
}

export interface GenerateTapeParams {
  description: string
  outputName: string
  formats: Array<'gif' | 'mp4' | 'webm'>
  theme: string
  width: number
  height: number
  marginFill?: string
  provider: Provider
  model?: string
}

export interface RefineTapeParams {
  currentTape: string
  refinement: string
  provider: Provider
  model?: string
}

export interface GenerateNameParams {
  description: string
  provider: Provider
  apiKey: string
  model?: string
}

function buildTapeUserMessage(params: GenerateTapeParams): string {
  const outputLines = params.formats
    .map((f) => `Output ${params.outputName}.${f}`)
    .join('\n')

  return `Generate a VHS tape file for the following terminal demo:

${params.description}

Use these exact configuration values:
- Output lines: ${outputLines}
- Width: ${params.width}
- Height: ${params.height}
- MarginFill: "${params.marginFill ?? '#1E1E3F'}"
- Theme line: Set Theme THEME_PLACEHOLDER (write this exactly, do not change it)

Make the demo polished, professional, and engaging. Show realistic commands with proper timing that tells a clear story.`
}

function injectThemeJson(tape: string, themeName: string): string {
  const theme = findTheme(themeName)
  const themeValue = theme ? themeToVHSString(theme) : `"${themeName}"`
  return tape.replace(/^Set Theme .+$/m, `Set Theme ${themeValue}`)
}

function stripCodeFences(text: string): string {
  return text.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim()
}

async function callAnthropic(apiKey: string, model: string, system: string, user: string, maxTokens = 2048): Promise<string> {
  const client = new Anthropic({ apiKey })
  const message = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  })
  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Anthropic API')
  return content.text.trim()
}

async function callOpenAI(apiKey: string, model: string, system: string, user: string, maxTokens = 2048): Promise<string> {
  const client = new OpenAI({ apiKey })
  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  })
  const text = response.choices[0]?.message?.content
  if (!text) throw new Error('Empty response from OpenAI API')
  return text.trim()
}

async function callProvider(provider: Provider, apiKey: string, model: string, system: string, user: string, maxTokens?: number): Promise<string> {
  switch (provider) {
    case 'anthropic': return callAnthropic(apiKey, model, system, user, maxTokens)
    case 'openai': return callOpenAI(apiKey, model, system, user, maxTokens)
    default: throw new Error(`Unknown provider: ${provider}`)
  }
}

export async function generateTape(apiKey: string, params: GenerateTapeParams): Promise<string> {
  const model = params.model ?? PROVIDERS[params.provider].defaultModel
  let tape = await callProvider(params.provider, apiKey, model, VHS_SYSTEM_PROMPT, buildTapeUserMessage(params))
  tape = stripCodeFences(tape)
  tape = injectThemeJson(tape, params.theme)
  return tape
}

export async function generateName(params: GenerateNameParams): Promise<string> {
  const model = params.model ?? PROVIDERS[params.provider].defaultModel
  try {
    const result = await callProvider(
      params.provider,
      params.apiKey,
      model,
      NAME_SYSTEM_PROMPT,
      `Generate a filename for this terminal demo: ${params.description}`,
      64,
    )
    return result
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'demo'
  } catch {
    return 'demo'
  }
}

export interface FixTapeParams {
  currentTape: string
  error: string
  provider: Provider
  model?: string
}

export async function fixTape(apiKey: string, params: FixTapeParams): Promise<string> {
  const model = params.model ?? PROVIDERS[params.provider].defaultModel
  let tape = await callProvider(
    params.provider,
    apiKey,
    model,
    FIX_SYSTEM_PROMPT,
    `The following VHS tape file failed to render with this error:\n\nERROR:\n${params.error}\n\nTAPE FILE:\n${params.currentTape}\n\nPlease fix the tape file so it renders successfully.`,
  )
  tape = stripCodeFences(tape)
  const themeMatch = params.currentTape.match(/^Set Theme (.+)$/m)
  if (themeMatch) {
    tape = tape.replace(/^Set Theme .+$/m, `Set Theme ${themeMatch[1]}`)
  }
  return tape
}

export async function refineTape(apiKey: string, params: RefineTapeParams): Promise<string> {
  const model = params.model ?? PROVIDERS[params.provider].defaultModel
  let tape = await callProvider(
    params.provider,
    apiKey,
    model,
    REFINE_SYSTEM_PROMPT,
    `Here is the current tape file:\n\n${params.currentTape}\n\nPlease make this change: ${params.refinement}`,
  )
  tape = stripCodeFences(tape)
  const themeMatch = params.currentTape.match(/^Set Theme (.+)$/m)
  if (themeMatch) {
    tape = tape.replace(/^Set Theme .+$/m, `Set Theme ${themeMatch[1]}`)
  }
  return tape
}
