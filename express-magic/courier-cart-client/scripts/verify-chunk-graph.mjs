import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const clientDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const assetsDir = path.join(clientDir, 'dist', 'assets')
const chunkNames = readdirSync(assetsDir).filter((name) => name.endsWith('.js'))
const chunkSet = new Set(chunkNames)
const graph = new Map()

for (const chunkName of chunkNames) {
  const source = readFileSync(path.join(assetsDir, chunkName), 'utf8')
  const imports = new Set()
  const importPattern = /\b(?:import|export)(?:[^'";]*?\bfrom)?\s*['"]\.\/([^'"]+\.js)['"]/g
  let match

  while ((match = importPattern.exec(source))) {
    if (chunkSet.has(match[1])) imports.add(match[1])
  }

  graph.set(chunkName, imports)
}

const state = new Map()
const stack = []

const visit = (chunkName) => {
  const currentState = state.get(chunkName)
  if (currentState === 'visited') return
  if (currentState === 'visiting') {
    const cycleStart = stack.indexOf(chunkName)
    const cycle = [...stack.slice(cycleStart), chunkName]
    throw new Error(`Circular production chunk imports: ${cycle.join(' -> ')}`)
  }

  state.set(chunkName, 'visiting')
  stack.push(chunkName)
  for (const dependency of graph.get(chunkName) || []) visit(dependency)
  stack.pop()
  state.set(chunkName, 'visited')
}

for (const chunkName of chunkNames) visit(chunkName)

console.log(`Verified ${chunkNames.length} production chunks: no circular static imports.`)
