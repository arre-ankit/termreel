import { Command } from 'commander'
import * as p from '@clack/prompts'
import pc from 'picocolors'
import { getApiKey, getProvider, saveApiKey, saveProvider, getConfigPath } from '../lib/config.js'
import { PROVIDERS, type Provider } from '../lib/ai.js'

export const configCommand = new Command('config')
  .description('View and update API keys and provider settings')
  .action(async () => {
    p.intro(pc.bold('termreel config'))

    const currentProvider = getProvider()
    const anthropicKey = getApiKey('anthropic')
    const openaiKey = getApiKey('openai')

    console.log()
    console.log(pc.gray('  Current config: ') + pc.white(getConfigPath()))
    console.log()
    console.log(`  ${pc.gray('provider')}    ${currentProvider ? pc.cyan(currentProvider) : pc.gray('not set')}`)
    console.log(`  ${pc.gray('anthropic')}   ${anthropicKey ? pc.green('sk-ant-***' + anthropicKey.slice(-4)) : pc.gray('not set')}`)
    console.log(`  ${pc.gray('openai')}      ${openaiKey ? pc.green('sk-***' + openaiKey.slice(-4)) : pc.gray('not set')}`)
    console.log()

    const action = await p.select({
      message: 'What would you like to do?',
      options: [
        { value: 'anthropic', label: 'Set Anthropic API key' },
        { value: 'openai', label: 'Set OpenAI API key' },
        { value: 'provider', label: 'Change default provider' },
        { value: 'done', label: 'Nothing, just viewing' },
      ],
    })

    if (p.isCancel(action) || action === 'done') {
      p.outro(pc.gray('Done.'))
      return
    }

    if (action === 'provider') {
      const provider = await p.select({
        message: 'Default provider',
        options: Object.entries(PROVIDERS).map(([value, meta]) => ({
          value,
          label: meta.label,
          hint: meta.defaultModel,
        })),
        initialValue: currentProvider ?? 'anthropic',
      }) as Provider

      if (p.isCancel(provider)) { p.outro(pc.gray('Cancelled.')); return }
      saveProvider(provider)
      p.outro(pc.green(`Default provider set to ${PROVIDERS[provider].label}`))
      return
    }

    const provider = action as Provider
    const meta = PROVIDERS[provider]
    const existing = getApiKey(provider)

    if (existing) {
      console.log()
      console.log(pc.gray(`  Current: sk-***${existing.slice(-4)}`))
      console.log()
    }

    const key = await p.text({
      message: `Enter new ${meta.label} API key`,
      placeholder: meta.keyHint,
      validate: (v) => {
        if (!v.startsWith(meta.keyPrefix)) return `Key must start with ${meta.keyPrefix}`
        if (v.length < 20) return 'API key looks too short'
      },
    })

    if (p.isCancel(key)) { p.outro(pc.gray('Cancelled.')); return }

    saveApiKey(provider, key as string)
    p.outro(pc.green(`${meta.label} API key updated`))
  })
