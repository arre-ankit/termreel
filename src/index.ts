import { Command, Option } from 'commander'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { printBanner } from './utils/banner.js'
import { newCommand } from './commands/new.js'
import { runCommand } from './commands/run.js'
import { themesCommand } from './commands/themes.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8'),
) as { version: string }

const program = new Command()

program
  .name('termreel')
  .description('AI-powered terminal demo recorder')
  .version(pkg.version, '-v, --version')
  .helpOption('-h, --help')
  .addOption(new Option('--local').hideHelp())

program.addHelpText('beforeAll', () => {
  printBanner()
  return ''
})

program.hook('preAction', () => {
  printBanner()
})

program.addCommand(newCommand)
program.addCommand(runCommand)
program.addCommand(themesCommand)

program.parse()
