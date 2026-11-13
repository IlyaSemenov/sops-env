import { spawnSync } from "node:child_process"
import { constants } from "node:os"

import { SopsEnvError } from "./error"

/**
 * Decrypts a SOPS file with the `sops` CLI and returns the parsed document.
 *
 * Numbers are returned as their JSON source text, so that integers beyond the double precision keep every digit.
 * Throws a `SopsEnvError` with the exit code that a shell would report for sops:
 * its own exit code, 128 plus the signal number when a signal kills it, or 127 when it is missing.
 * Only a missing sops gets a message; stderr of sops is inherited.
 */
export function decryptFile(path: string): unknown {
  const result = spawnSync("sops", ["decrypt", "--output-type", "json", path], {
    encoding: "utf8",
    maxBuffer: Number.POSITIVE_INFINITY,
    stdio: ["ignore", "pipe", "inherit"],
  })
  if (result.error) {
    if ((result.error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new SopsEnvError("sops is not installed or not in PATH.", 127)
    }
    throw result.error
  }
  if (result.signal) {
    throw new SopsEnvError("", 128 + constants.signals[result.signal])
  }
  if (result.status !== 0) {
    throw new SopsEnvError("", result.status ?? 1)
  }
  return parseJson(result.stdout)
}

/** Parses JSON, returning numbers as their source text. */
export function parseJson(text: string): unknown {
  // The reviver context is not in the TypeScript lib yet; Node.js 22+ and Bun provide it.
  return JSON.parse(text, (_key, value, context?: { source?: string }) =>
    typeof value === "number" && context?.source !== undefined ? context.source : value,
  )
}
