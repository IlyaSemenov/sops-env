#!/usr/bin/env node
import { parseArgs } from "node:util"

import { formatEnv } from "./env"
import { SopsEnvError } from "./error"
import { decryptFile } from "./sops"

const usage = "Usage: sops-env [--base64] <environment.sops.yaml>"

const help = `${usage}

Print the env section of a SOPS-encrypted file as KEY=VALUE lines.
Multi-line values are rejected.

Options:
  --base64    Encode values in base64; allows multi-line values
  -h, --help  Show this help
`

const options = {
  base64: { type: "boolean" },
  help: { type: "boolean", short: "h" },
} as const

function main(args: string[]) {
  let parsed
  try {
    parsed = parseArgs({ args, allowPositionals: true, options })
  } catch (error) {
    // The parseArgs message for an unknown option adds a long hint about `--` and varies between Node.js and Bun.
    const message =
      (error as NodeJS.ErrnoException).code === "ERR_PARSE_ARGS_UNKNOWN_OPTION"
        ? `Unknown option '${findUnknownOption(args)}'.`
        : (error as Error).message
    throw new SopsEnvError(`${message}\n${usage}`)
  }
  const { values, positionals } = parsed
  if (values.help) {
    process.stdout.write(help)
    return
  }
  if (positionals.length !== 1) {
    throw new SopsEnvError(usage)
  }
  const output = formatEnv(decryptFile(positionals[0]!), { base64: values.base64 })
  if (output) {
    process.stdout.write(`${output}\n`)
  }
}

/** Returns the first option in `args` that the CLI does not define, as the user wrote it. */
function findUnknownOption(args: string[]) {
  const { tokens } = parseArgs({
    args,
    allowPositionals: true,
    options,
    strict: false,
    tokens: true,
  })
  for (const token of tokens) {
    if (token.kind === "option" && !Object.hasOwn(options, token.name)) {
      return token.rawName
    }
  }
}

try {
  main(process.argv.slice(2))
} catch (error) {
  if (!(error instanceof SopsEnvError)) {
    throw error
  }
  if (error.message) {
    process.stderr.write(`${error.message}\n`)
  }
  process.exitCode = error.exitCode
}
