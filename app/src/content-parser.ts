/**
 * Build-time content parser for K8s/Docker markdown modules.
 * Extracts sections, code blocks, labs, checkpoints, objectives, key takeaways.
 * Used by the Vite plugin at build time.
 */
import matter from 'gray-matter'
import MarkdownIt from 'markdown-it'
import type { Section, Lab, LabStep, Checkpoint } from './types'

const md = new MarkdownIt({ html: true, linkify: true, typographer: true })

export interface ParsedModule {
  id: string
  number: number
  title: string
  tier: number
  tierName: string
  slug: string
  objectives: string[]
  sections: Section[]
  labs: Lab[]
  checkpoints: Checkpoint[]
  keyTakeaways: string[]
  rawContent: string
  codeBlocks: ParsedCodeBlock[]
}

export interface ParsedCodeBlock {
  language: string
  code: string
  isAsciiDiagram: boolean
  meta?: string
}

const TIER_MAP: Record<string, { tier: number; tierName: string }> = {
  'Tier-1-Foundations': { tier: 1, tierName: 'Foundations' },
  'Tier-2-Intermediate': { tier: 2, tierName: 'Intermediate' },
  'Tier-3-Advanced': { tier: 3, tierName: 'Advanced' },
  'Tier-4-Master': { tier: 4, tierName: 'Master' },
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function isAsciiDiagram(code: string): boolean {
  const lines = code.split('\n').filter((l) => l.trim().length > 0)
  if (lines.length === 0) return false
  const boxChars = /[┌┐└┘├┤┬┴┼─│╔╗╚╝╠╣╦╩╬═║▲▼◄►●○■□▸▹|+\-]{2,}/
  const matchCount = lines.filter((l) => boxChars.test(l)).length
  return matchCount / lines.length >= 0.35
}

function extractSections(content: string): Section[] {
  const lines = content.split('\n')
  const sections: Section[] = []
  const stack: { level: number; section: Section }[] = []

  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)$/)
    if (!match) continue
    const level = match[1].length
    const title = match[2].trim()
    const section: Section = {
      id: slugify(title),
      title,
      level,
      children: [],
    }

    if (level === 2) {
      sections.push(section)
      stack.length = 0
      stack.push({ level, section })
    } else if (level === 3 && stack.length > 0) {
      const parent = stack[stack.length - 1]
      if (parent.level < level) {
        parent.section.children.push(section)
      }
    }
  }
  return sections
}

function extractObjectives(content: string): string[] {
  const objectivesMatch = content.match(
    /## Learning Objectives\s*\n([\s\S]*?)(?=\n##\s)/
  )
  if (!objectivesMatch) return []
  const block = objectivesMatch[1]
  return block
    .split('\n')
    .filter((l) => /^\d+\./.test(l.trim()))
    .map((l) => l.replace(/^\d+\.\s*/, '').trim())
}

function extractKeyTakeaways(content: string): string[] {
  const match = content.match(/## Key Takeaways\s*\n([\s\S]*?)(?=\n##\s|$)/)
  if (!match) return []
  return match[1]
    .split('\n')
    .filter((l) => /^\d+\./.test(l.trim()))
    .map((l) => l.replace(/^\d+\.\s*/, '').trim().replace(/\*\*/g, ''))
}

function extractCodeBlocks(content: string): ParsedCodeBlock[] {
  const blocks: ParsedCodeBlock[] = []
  const regex = /```(\w*)(.*?)\n([\s\S]*?)```/g
  let match
  while ((match = regex.exec(content)) !== null) {
    const code = match[3].trim()
    blocks.push({
      language: match[1] || 'text',
      code,
      isAsciiDiagram: isAsciiDiagram(code),
      meta: match[2]?.trim() || undefined,
    })
  }
  return blocks
}

function extractCheckpoints(content: string): Checkpoint[] {
  const match = content.match(
    /## Checkpoint.*?\n([\s\S]*?)(?=\n## (?!Checkpoint)|$)/
  )
  if (!match) return []
  const block = match[1]
  const questions: Checkpoint[] = []
  const qRegex = /\d+\.\s+\*\*(\w+)\*\*\s+(.*?)(?=\n\d+\.\s|\n$|$)/gs
  let qMatch
  let idx = 0
  while ((qMatch = qRegex.exec(block)) !== null) {
    questions.push({
      id: `checkpoint-${idx}`,
      question: `${qMatch[1]} ${qMatch[2].trim()}`,
      options: [],
      correctIndex: 0,
      explanation: '',
    })
    idx++
  }
  return questions
}

function extractLabs(content: string, moduleId: string): Lab[] {
  const labs: Lab[] = []
  const labRegex =
    /## \d+\.\s*Hands-On Lab.*?|## Hands-On Lab.*?/g
  const labSections: { start: number; title: string }[] = []

  const lines = content.split('\n')
  lines.forEach((line, idx) => {
    if (/^## .*(?:Hands-On|Lab)/.test(line)) {
      labSections.push({ start: idx, title: line.replace(/^##\s+/, '').replace(/^\d+\.\s*/, '') })
    }
  })

  labSections.forEach((labSection, labIdx) => {
    const endIdx = labIdx < labSections.length - 1
      ? labSections[labIdx + 1].start
      : lines.findIndex((l, i) => i > labSection.start && /^## (?!#)/.test(l) && !/Lab|Hands-On/.test(l))

    const labContent = lines.slice(labSection.start, endIdx > 0 ? endIdx : undefined).join('\n')
    const steps: LabStep[] = []

    // Extract exercises/steps
    const exerciseRegex = /### (?:Exercise|Step|Lab)\s*\d*[:.]\s*(.*)/g
    let exMatch
    let stepIdx = 0
    while ((exMatch = exerciseRegex.exec(labContent)) !== null) {
      steps.push({
        id: `step-${stepIdx}`,
        instruction: exMatch[1].trim(),
        expectedCommands: [],
        hints: [],
      })
      stepIdx++
    }

    if (steps.length === 0) {
      steps.push({
        id: 'step-0',
        instruction: labSection.title,
        expectedCommands: [],
        hints: [],
      })
    }

    labs.push({
      id: `${moduleId}-lab-${labIdx}`,
      title: labSection.title,
      moduleId,
      steps,
    })
  })

  return labs
}

export function parseModule(
  content: string,
  filePath: string
): ParsedModule {
  const { content: rawContent } = matter(content)

  // Extract module number and title from first H1
  const h1Match = rawContent.match(/^#\s+(.+)$/m)
  const fullTitle = h1Match ? h1Match[1].trim() : 'Untitled'
  const numMatch = fullTitle.match(/Module\s+(\d+)[:\s]+(.+)/)
  const number = numMatch ? parseInt(numMatch[1], 10) : 0
  const title = numMatch ? numMatch[2].trim() : fullTitle

  // Determine tier from file path
  const tierDir = Object.keys(TIER_MAP).find((t) => filePath.includes(t))
  const { tier, tierName } = tierDir ? TIER_MAP[tierDir] : { tier: 0, tierName: 'Unknown' }

  const slug = slugify(fullTitle)
  const id = `module-${String(number).padStart(2, '0')}`

  return {
    id,
    number,
    title,
    tier,
    tierName,
    slug,
    objectives: extractObjectives(rawContent),
    sections: extractSections(rawContent),
    labs: extractLabs(rawContent, id),
    checkpoints: extractCheckpoints(rawContent),
    keyTakeaways: extractKeyTakeaways(rawContent),
    rawContent,
    codeBlocks: extractCodeBlocks(rawContent),
  }
}

export function renderMarkdown(content: string): string {
  return md.render(content)
}
