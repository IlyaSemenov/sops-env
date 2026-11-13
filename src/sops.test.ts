import { expect, it } from "bun:test"

import { parseJson } from "./sops"

it("parseJson keeps the source text of numbers", () => {
  expect(parseJson('{"env":{"BIG":1234567890123456789,"FLOAT":1.5,"TEXT":"1"}}')).toEqual({
    env: { BIG: "1234567890123456789", FLOAT: "1.5", TEXT: "1" },
  })
})
