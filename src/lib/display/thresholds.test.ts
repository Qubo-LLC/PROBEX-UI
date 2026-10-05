// Guard for remediation phase 2 §12: the survival brain's min_edge_threshold is
// a floor, not "the" entry threshold (the detector's own is not reported). This
// scans the component sources for the phrasings that presented it otherwise,
// so a later copy edit cannot quietly bring them back.
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { DETECTOR_THRESHOLD_UNREPORTED, SURVIVAL_FLOOR_LABEL } from './thresholds'

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sources(path)
    return /\.tsx?$/.test(name) && !/\.test\./.test(name) ? [path] : []
  })
}

const MISLEADING = [
  'label="Edge threshold"',
  'label="Edge required"',
  'the survival brain currently requires',
  'the brain currently requires',
  'survival brain&rsquo;s current edge threshold',
  "'survival brain threshold'",
]

describe('edge-requirement wording', () => {
  it('no component presents the survival floor as the entry threshold', () => {
    const offenders: string[] = []
    for (const file of sources(join(process.cwd(), 'src/components'))) {
      const text = readFileSync(file, 'utf8')
      for (const phrase of MISLEADING) if (text.includes(phrase)) offenders.push(`${file}: ${phrase}`)
    }
    expect(offenders).toEqual([])
  })

  it('names the floor and says the detector threshold is not reported', () => {
    expect(SURVIVAL_FLOOR_LABEL).toBe('Survival floor')
    expect(DETECTOR_THRESHOLD_UNREPORTED).toMatch(/not reported/)
  })
})
