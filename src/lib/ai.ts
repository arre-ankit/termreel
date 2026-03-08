import { generateText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createMistral } from '@ai-sdk/mistral'
import type { LanguageModel } from 'ai'
import { findTheme, themeToVHSString } from './themes.js'
import { VHS_SYSTEM_PROMPT, NAME_SYSTEM_PROMPT, REFINE_SYSTEM_PROMPT, FIX_SYSTEM_PROMPT } from './prompt.js'

export type Provider = 'anthropic' | 'openai' | 'google' | 'mistral'

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
    models: [
      'claude-opus-4-6',
      'claude-sonnet-4-6',
      'claude-opus-4-5',
      'claude-sonnet-4-5',
      'claude-haiku-4-5',
    ],
    defaultModel: 'claude-sonnet-4-6',
    keyPrefix: 'sk-ant-',
    keyHint: 'sk-ant-...',
    docsUrl: 'https://console.anthropic.com',
  },
  openai: {
    label: 'OpenAI (GPT)',
    models: [
      'gpt-5.4',
      'gpt-5.4-pro',
      'gpt-5.3-chat-latest',
      'gpt-5.2',
      'gpt-5',
      'gpt-5-mini',
    ],
    defaultModel: 'gpt-5.4',
    keyPrefix: 'sk-',
    keyHint: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  google: {
    label: 'Google (Gemini)',
    models: [
      'gemini-3.1-pro-preview',
      'gemini-3-flash-preview',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
    ],
    defaultModel: 'gemini-2.5-flash',
    keyPrefix: 'AIza',
    keyHint: 'AIzaSy...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
  },
  mistral: {
    label: 'Mistral AI',
    models: [
      'mistral-large-3',
      'mistral-medium-3',
      'magistral-medium',
      'mistral-small-3.1',
    ],
    defaultModel: 'mistral-large-3',
    keyPrefix: '',
    keyHint: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    docsUrl: 'https://console.mistral.ai/api-keys',
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

Use these exact configuration values in the settings block:
${outputLines}
Set Width ${params.width}
Set Height ${params.height}
Set Margin 20
Set MarginFill "${params.marginFill ?? '#1E1E3F'}"
Set Theme THEME_PLACEHOLDER

IMPORTANT: You MUST include the line "Set Theme THEME_PLACEHOLDER" exactly as shown above. Do not replace it with a theme name or JSON. It will be replaced with the correct theme (${params.theme}) automatically.

Make the demo polished, professional, and engaging. Show realistic commands with proper timing that tells a clear story.`
}

function injectThemeJson(tape: string, themeName: string): string {
  const theme = findTheme(themeName)
  const themeValue = theme ? themeToVHSString(theme) : `"${themeName}"`
  const themeLine = `Set Theme ${themeValue}`

  // Replace any existing Set Theme line (THEME_PLACEHOLDER or hardcoded)
  if (/^Set Theme .+$/m.test(tape)) {
    return tape.replace(/^Set Theme .+$/m, themeLine)
  }

  // No Set Theme line — insert after the last Set command block
  const lastSetMatch = [...tape.matchAll(/^Set .+$/gm)].at(-1)
  if (lastSetMatch?.index !== undefined) {
    const insertAt = lastSetMatch.index + lastSetMatch[0].length
    return tape.slice(0, insertAt) + '\n' + themeLine + tape.slice(insertAt)
  }

  // Fallback: prepend after Output lines
  return tape.replace(/^((?:Output .+\n)+)/m, `$1${themeLine}\n`)
}

function stripCodeFences(text: string): string {
  return text.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim()
}

function resolveModel(provider: Provider, apiKey: string, modelId: string): LanguageModel {
  switch (provider) {
    case 'anthropic': return createAnthropic({ apiKey })(modelId)
    case 'openai': return createOpenAI({ apiKey })(modelId)
    case 'google': return createGoogleGenerativeAI({ apiKey })(modelId)
    case 'mistral': return createMistral({ apiKey })(modelId)
    default: throw new Error(`Unknown provider: ${provider}`)
  }
}

async function callProvider(provider: Provider, apiKey: string, modelId: string, system: string, user: string, maxTokens = 2048): Promise<string> {
  const model = resolveModel(provider, apiKey, modelId)
  const { text } = await generateText({ model, system, prompt: user, maxOutputTokens: maxTokens })
  return text.trim()
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
