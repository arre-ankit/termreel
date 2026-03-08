import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import type { Provider } from './ai.js'

const CONFIG_DIR = join(homedir(), '.config', 'termreel')
const CONFIG_PATH = join(CONFIG_DIR, 'config.json')

interface Config {
  provider?: Provider
  anthropicApiKey?: string
  openaiApiKey?: string
  googleApiKey?: string
  mistralApiKey?: string
}

function readConfig(): Config {
  if (!existsSync(CONFIG_PATH)) return {}
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as Config
  } catch {
    return {}
  }
}

function writeConfig(config: Config): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true })
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

export function getProvider(): Provider | null {
  const config = readConfig()
  return config.provider ?? null
}

export function saveProvider(provider: Provider): void {
  const config = readConfig()
  config.provider = provider
  writeConfig(config)
}

export function getApiKey(provider: Provider): string | null {
  const config = readConfig()
  switch (provider) {
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY ?? config.anthropicApiKey ?? null
    case 'openai':
      return process.env.OPENAI_API_KEY ?? config.openaiApiKey ?? null
    case 'google':
      return process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? config.googleApiKey ?? null
    case 'mistral':
      return process.env.MISTRAL_API_KEY ?? config.mistralApiKey ?? null
    default:
      return null
  }
}

export function saveApiKey(provider: Provider, key: string): void {
  const config = readConfig()
  switch (provider) {
    case 'anthropic':
      config.anthropicApiKey = key
      break
    case 'openai':
      config.openaiApiKey = key
      break
    case 'google':
      config.googleApiKey = key
      break
    case 'mistral':
      config.mistralApiKey = key
      break
  }
  writeConfig(config)
}

export function getConfigPath(): string {
  return CONFIG_PATH
}
