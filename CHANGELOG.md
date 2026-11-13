# sops-env

## 1.0.1

### Patch Changes

- 4e97028: Explain that dotenv files are not supported when the `env` section is missing or is not a mapping.
- 977571d: Reject variable names that are not ASCII shell identifiers, such as `A=B`, which were printed as ambiguous lines.
- 88391cc: Shorten the error for an unknown option to its name and the usage line.

## 1.0.0

### Major Changes

- d7aeab0: Initial release.
