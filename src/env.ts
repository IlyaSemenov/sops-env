import { SopsEnvError } from "./error"

/** Options of `formatEnv`. */
export interface FormatEnvOptions {
  /** Encode each value in base64. */
  base64?: boolean
}

/**
 * Formats the `env` section of a decrypted document as `KEY=VALUE` lines.
 *
 * Without `base64`, values are written as is, without quoting, so multi-line values are rejected.
 */
export function formatEnv(document: unknown, { base64 = false }: FormatEnvOptions = {}) {
  const env = isRecord(document) ? document.env : undefined
  if (!isRecord(env)) {
    throw new SopsEnvError("The env section is missing or is not a mapping.")
  }
  const entries = Object.entries(env).map(([key, value]) => [key, toEnvValue(key, value)] as const)
  if (!base64) {
    const multiline = entries.filter(([, value]) => value.includes("\n")).map(([key]) => key)
    if (multiline.length) {
      throw new SopsEnvError(`Multi-line values are not supported: ${multiline.join(", ")}`)
    }
  }
  return entries
    .map(([key, value]) => `${key}=${base64 ? Buffer.from(value).toString("base64") : value}`)
    .join("\n")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** Converts a scalar value to its string form; rejects null and collections. */
function toEnvValue(key: string, value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  throw new SopsEnvError(`Unsupported value of ${key}: expected a string, number, or boolean.`)
}
