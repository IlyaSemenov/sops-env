import { describe, expect, it } from "bun:test"

import { formatEnv, isValidName } from "./env"

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

  it("rejects invalid names and lists them quoted", () => {
    const document = { env: { "A=B": "1", PLAIN: "2", "": "3", "A B": "4" } }
    expect(() => formatEnv(document, { base64: true })).toThrow(
      'Unsupported variable names: "A=B", "", "A B". ',
    )
  })

  it("escapes invisible and line-breaking characters of invalid names", () => {
    const document = {
      env: {
        "A\u00a0B": "1",
        "C\u2028D": "2",
        "E\u0085F": "3",
        "G\nH": "4",
        "I\u200bJ": "5",
        "K\u202eL": "6",
        "M\u{e0001}N": "7",
      },
    }
    expect(() => formatEnv(document)).toThrow(
      String.raw`Unsupported variable names: "A\u00a0B", "C\u2028D", "E\u0085F", "G\nH", "I\u200bJ", "K\u202eL", "M\udb40\udc01N". `,
    )
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

describe("isValidName", () => {
  it("accepts shell identifiers", () => {
    for (const name of ["PORT", "_private", "a1", "A_B"]) {
      expect(isValidName(name)).toBe(true)
    }
  })

  it("rejects other names", () => {
    for (const name of [
      "",
      "1ST",
      "A=B",
      "#A",
      "A B",
      "A\nB",
      "app.port",
      "my-var",
      "ПЕРЕМЕННАЯ",
    ]) {
      expect(isValidName(name)).toBe(false)
    }
  })
})
