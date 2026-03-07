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
  if (provider === 'anthropic') {
    return process.env.ANTHROPIC_API_KEY ?? readConfig().anthropicApiKey ?? null
  }
  if (provider === 'openai') {
    return process.env.OPENAI_API_KEY ?? readConfig().openaiApiKey ?? null
  }
  return null
}

export function saveApiKey(provider: Provider, key: string): void {
  const config = readConfig()
  if (provider === 'anthropic') {
    config.anthropicApiKey = key
  } else {
    config.openaiApiKey = key
  }
  writeConfig(config)
}

export function getConfigPath(): string {
  return CONFIG_PATH
}
