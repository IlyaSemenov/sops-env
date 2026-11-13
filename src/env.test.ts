import { describe, expect, it } from "bun:test"

import { formatEnv } from "./env"

describe("formatEnv", () => {
  it("prints values as KEY=VALUE lines in file order", () => {
    const document = {
      env: { TEXT: 'space $HOME "quotes" = value', NUMBER: "3000", FLAG: true, EMPTY: "" },
    }
    expect(formatEnv(document)).toBe(
      ['TEXT=space $HOME "quotes" = value', "NUMBER=3000", "FLAG=true", "EMPTY="].join("\n"),
    )
  })

  it("prints nothing for an empty env section", () => {
    expect(formatEnv({ env: {} })).toBe("")
  })

  it("rejects multi-line values and names their keys", () => {
    const document = { env: { ONE: "a\nb", PLAIN: "c", TWO: "d\n" } }
    expect(() => formatEnv(document)).toThrow("Multi-line values are not supported: ONE, TWO")
  })

  it("encodes values in base64, including multi-line ones", () => {
    const document = { env: { NUMBER: "3000", MULTILINE: "строка 1\nстрока 2", EMPTY: "" } }
    expect(formatEnv(document, { base64: true })).toBe(
      ["NUMBER=MzAwMA==", "MULTILINE=0YHRgtGA0L7QutCwIDEK0YHRgtGA0L7QutCwIDI=", "EMPTY="].join(
        "\n",
      ),
    )
  })

  it("rejects a missing or non-mapping env section", () => {
    expect(() => formatEnv({})).toThrow("The env section is missing or is not a mapping.")
    expect(() => formatEnv({ env: ["A=1"] })).toThrow(
      "The env section is missing or is not a mapping.",
    )
  })

  it("rejects null and collection values", () => {
    expect(() => formatEnv({ env: { EMPTY: null } })).toThrow("Unsupported value of EMPTY")
    expect(() => formatEnv({ env: { LIST: [1] } })).toThrow("Unsupported value of LIST")
  })
})
