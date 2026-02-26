/**
 * Vite plugin that parses all markdown modules at build time and exposes them
 * as a virtual module `virtual:k8s-modules`.
 */
import type { Plugin } from 'vite'
import fs from 'fs'
import path from 'path'
import { parseModule, renderMarkdown } from './src/content-parser'
import { createHighlighter, type Highlighter } from 'shiki'

const CONTENT_DIRS = [
  'Tier-1-Foundations',
  'Tier-2-Intermediate',
  'Tier-3-Advanced',
  'Tier-4-Master',
]

const VIRTUAL_MODULE_ID = 'virtual:k8s-modules'
const RESOLVED_ID = '\0' + VIRTUAL_MODULE_ID

export default function k8sContentPlugin(): Plugin {
  let highlighter: Highlighter | null = null
  const rootDir = path.resolve(__dirname, '..')

  return {
    name: 'vite-plugin-k8s-content',

    async buildStart() {
      highlighter = await createHighlighter({
        themes: ['github-dark'],
        langs: [
          'bash', 'shell', 'dockerfile', 'yaml', 'json', 'javascript',
          'typescript', 'python', 'go', 'html', 'css', 'sql', 'toml',
          'ini', 'nginx', 'xml', 'plaintext',
        ],
      })
    },

    resolveId(id: string) {
      if (id === VIRTUAL_MODULE_ID) return RESOLVED_ID
    },

    async load(id: string) {
      if (id !== RESOLVED_ID) return

      if (!highlighter) {
        highlighter = await createHighlighter({
          themes: ['github-dark'],
          langs: [
            'bash', 'shell', 'dockerfile', 'yaml', 'json', 'javascript',
            'typescript', 'python', 'go', 'html', 'css', 'sql', 'toml',
            'ini', 'nginx', 'xml', 'plaintext',
          ],
        })
      }

      const modules: any[] = []

      for (const dir of CONTENT_DIRS) {
        const dirPath = path.join(rootDir, dir)
        if (!fs.existsSync(dirPath)) continue

        const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.md')).sort()

        for (const file of files) {
          const filePath = path.join(dirPath, file)
          const content = fs.readFileSync(filePath, 'utf-8')
          const parsed = parseModule(content, filePath)

          // Highlight code blocks with Shiki
          let htmlContent = parsed.rawContent
          for (const block of parsed.codeBlocks) {
            let lang = block.language
            const supportedLangs = highlighter.getLoadedLanguages()
            if (!supportedLangs.includes(lang as any)) {
              lang = 'plaintext'
            }

            const highlighted = highlighter.codeToHtml(block.code, {
              lang,
              theme: 'github-dark',
            })

            const marker = `\`\`\`${block.language}${block.meta ? ' ' + block.meta : ''}\n${block.code}\n\`\`\``
            const wrapper = block.isAsciiDiagram
              ? `<div class="ascii-diagram">${highlighted}</div>`
              : `<div class="code-block" data-language="${block.language}"><div class="code-block-header"><span class="code-lang">${block.language}</span><button class="copy-btn" onclick="navigator.clipboard.writeText(this.closest('.code-block').querySelector('code')?.textContent||'')">Copy</button></div>${highlighted}</div>`

            htmlContent = htmlContent.replace(marker, wrapper)
          }

          // Render remaining markdown to HTML
          htmlContent = renderMarkdown(htmlContent)

          modules.push({
            id: parsed.id,
            number: parsed.number,
            title: parsed.title,
            tier: parsed.tier,
            tierName: parsed.tierName,
            slug: parsed.slug,
            objectives: parsed.objectives,
            sections: parsed.sections,
            labs: parsed.labs,
            checkpoints: parsed.checkpoints,
            keyTakeaways: parsed.keyTakeaways,
            htmlContent,
            codeBlocks: parsed.codeBlocks.map((b) => ({
              language: b.language,
              code: b.code,
              isAsciiDiagram: b.isAsciiDiagram,
              highlightedHtml: '',
            })),
          })
        }
      }

      return `export const modules = ${JSON.stringify(modules)};
export default modules;`
    },

    handleHotUpdate({ file, server }) {
      if (file.endsWith('.md') && CONTENT_DIRS.some((d) => file.includes(d))) {
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID)
        if (mod) {
          server.moduleGraph.invalidateModule(mod)
          server.ws.send({ type: 'full-reload' })
        }
      }
    },
  }
}
