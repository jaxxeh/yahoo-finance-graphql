import glob from 'glob'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const typeDefs = []

glob.sync('**/*.type.graphql', { cwd: __dirname }).forEach((filename) => {
  const filePath = path.join(__dirname, filename)
  const fileContents = fs.readFileSync(filePath, { encoding: 'utf8' })
  typeDefs.push(fileContents)
})

export default typeDefs
