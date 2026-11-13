/** Error that the CLI reports to the user as a message without a stack trace. */
export class SopsEnvError extends Error {
  constructor(
    message: string,
    /** Exit code of the CLI. */
    readonly exitCode = 1,
  ) {
    super(message)
    this.name = "SopsEnvError"
  }
}
