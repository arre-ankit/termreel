import figlet from 'figlet'
import pc from 'picocolors'

export function printBanner(): void {
  const width = process.stdout.columns ?? 80

  const font: figlet.Fonts = width >= 80 ? 'ANSI Shadow' : 'Small'

  const text = figlet.textSync('termreel', {
    font,
    horizontalLayout: 'default',
  })

  const lines = text.split('\n')
  const colored = lines
    .map((line) => pc.white(line))
    .join('\n')

  console.log()
  console.log(colored)
  console.log(
    pc.gray('  AI-powered terminal demo recorder — describe it, record it.'),
  )
  console.log()
}
