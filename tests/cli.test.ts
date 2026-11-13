import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

const cliPath = join(import.meta.dir, "../src/cli.ts")

let dir: string
let env: Record<string, string>

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "sops-env-"))
  const keyFile = join(dir, "age-key")
  run(["age-keygen", "-o", keyFile])
  const recipient = run(["age-keygen", "-y", keyFile]).stdout.trim()
  await writeFile(join(dir, ".sops.yaml"), `creation_rules:\n  - age: ${recipient}\n`)
  env = { ...process.env, SOPS_AGE_KEY_FILE: keyFile } as Record<string, string>
})

afterAll(async () => {
  await rm(dir, { recursive: true, force: true })
})

function run(cmd: string[], options: { env?: Record<string, string> } = {}) {
  const result = Bun.spawnSync(cmd, { cwd: dir, env: options.env })
  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  }
}

/** Encrypts YAML content into a new SOPS file and returns its path. */
async function encrypt(name: string, yaml: string) {
  const plainPath = join(dir, `${name}.yaml`)
  await writeFile(plainPath, yaml)
  const encrypted = run(["sops", "encrypt", plainPath], { env })
  expect(encrypted.exitCode).toBe(0)
  const path = join(dir, `${name}.sops.yaml`)
  await writeFile(path, encrypted.stdout)
  return path
}

function runSopsEnv(...args: string[]) {
  return run([process.execPath, cliPath, ...args], { env })
}

/** Runs the CLI with `PATH` limited to one directory, to control which `sops` it finds. */
function runSopsEnvWithPath(path: string, ...args: string[]) {
  return run([process.execPath, cliPath, ...args], { env: { ...env, PATH: path } })
}

describe("plain values", () => {
  let path: string

  beforeAll(async () => {
    path = await encrypt(
      "plain",
      `env:\n  TEXT: 'пробел $HOME "кавычки" = значение'\n  NUMBER: 3000\n  BIG: 1234567890123456789\n  EMPTY: ''\nother: ignored\n`,
    )
  })

  it("prints the env section", () => {
    expect(runSopsEnv(path)).toEqual({
      exitCode: 0,
      stdout:
        'TEXT=пробел $HOME "кавычки" = значение\nNUMBER=3000\nBIG=1234567890123456789\nEMPTY=\n',
      stderr: "",
    })
  })

  it("prints base64-encoded values with --base64", () => {
    expect(runSopsEnv("--base64", path).stdout.split("\n")[1]).toBe("NUMBER=MzAwMA==")
  })
})

describe("multi-line values", () => {
  let path: string

  beforeAll(async () => {
    path = await encrypt("multiline", "env:\n  MULTILINE: |-\n    строка 1\n    строка 2\n")
  })

  it("are rejected without --base64", () => {
    expect(runSopsEnv(path)).toEqual({
      exitCode: 1,
      stdout: "",
      stderr: "Multi-line values are not supported: MULTILINE\n",
    })
  })

  it("are encoded with --base64", () => {
    expect(runSopsEnv("--base64", path).stdout).toBe(
      `MULTILINE=${Buffer.from("строка 1\nстрока 2").toString("base64")}\n`,
    )
  })
})

describe("sops failures", () => {
  it("stop with the exit code of sops and write nothing to stdout", async () => {
    const path = join(dir, "broken.sops.yaml")
    await writeFile(path, "not encrypted\n")
    const result = runSopsEnv("--base64", path)
    expect(result.exitCode).toBe(run(["sops", "decrypt", path], { env }).exitCode)
    expect(result.exitCode).not.toBe(0)
    expect(result.stdout).toBe("")
    expect(result.stderr).not.toBe("")
  })

  it("stop with code 127 when sops is missing", () => {
    expect(runSopsEnvWithPath(join(dir, "missing"), "env.sops.yaml")).toEqual({
      exitCode: 127,
      stdout: "",
      stderr: "sops is not installed or not in PATH.\n",
    })
  })

  it("stop with code 128 plus the signal number when a signal kills sops", async () => {
    const binDir = join(dir, "killed-bin")
    await mkdir(binDir)
    await writeFile(join(binDir, "sops"), "#!/bin/sh\nkill -TERM $$\n", { mode: 0o755 })
    expect(runSopsEnvWithPath(binDir, "env.sops.yaml")).toEqual({
      exitCode: 143,
      stdout: "",
      stderr: "",
    })
  })
})

it("prints usage without a file argument", () => {
  expect(runSopsEnv()).toEqual({
    exitCode: 1,
    stdout: "",
    stderr: "Usage: sops-env [--base64] <environment.sops.yaml>\n",
  })
})
