import { SopsEnvError } from "./error"

/** Options of `formatEnv`. */
export interface FormatEnvOptions {
  /** Encode each value in base64. */
  base64?: boolean
}

/**
 * Formats the `env` section of a decrypted document as `KEY=VALUE` lines.
 *
 * Names are written as is and must be shell identifiers, so that no name makes a line ambiguous.
 * Without `base64`, values are written as is, without quoting, so multi-line values are rejected.
 */
export function formatEnv(document: unknown, { base64 = false }: FormatEnvOptions = {}) {
  const env = isRecord(document) ? document.env : undefined
  if (!isRecord(env)) {
    // sops decrypts a dotenv file to a flat mapping, which has no nested env mapping.
    throw new SopsEnvError(
      "The env section is missing or is not a mapping. " +
        "Put the variables under the env key of a YAML or JSON file; dotenv files are not supported.",
    )
  }
  const invalidNames = Object.keys(env).filter(key => !isValidName(key))
  if (invalidNames.length) {
    throw new SopsEnvError(
      `Unsupported variable names: ${invalidNames.map(quoteName).join(", ")}. ` +
        "A name must consist of ASCII letters, digits, and _, and must not start with a digit.",
    )
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

/**
 * Checks that a variable name is a shell identifier: ASCII letters, digits, and `_`, not starting with a digit.
 *
 * Shells and Dokku accept only such names, and they cannot make a `KEY=VALUE` line ambiguous,
 * unlike names with `=`, line breaks, whitespace, or a leading `#`.
 */
export function isValidName(name: string) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)
}

/**
 * Quotes a variable name for an error message.
 *
 * Escapes non-space whitespace, control characters, and format characters left literal by `JSON.stringify`,
 * as `\uXXXX` per UTF-16 code unit, so that a character beyond U+FFFF becomes a surrogate pair.
 */
function quoteName(name: string) {
  return JSON.stringify(name).replace(/[^\S ]|[\p{Cc}\p{Cf}]/gu, char =>
    char
      .split("")
      .map(unit => `\\u${unit.charCodeAt(0).toString(16).padStart(4, "0")}`)
      .join(""),
  )
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
