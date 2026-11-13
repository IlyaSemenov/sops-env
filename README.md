# sops-env

Print the `env` section of a [SOPS](https://github.com/getsops/sops)-encrypted file as `KEY=VALUE` lines.

## Requirements

- Node.js 22 or later, or Bun
- [`sops`](https://github.com/getsops/sops) in `PATH`, with access to the decryption key

## Usage

Keep the environment variables under the `env` key of a SOPS file; other keys are ignored.
Name the variables with ASCII letters, digits, and `_`, and do not start a name with a digit.
An encrypted file `environment.sops.yaml` looks like this:

```yaml
env:
  NODE_ENV: ENC[AES256_GCM,data:66pExK+Z2weH0g==,iv:…,tag:…,type:str]
  PORT: ENC[AES256_GCM,data:8hoeUQ==,iv:…,tag:…,type:int]
  SECRET_KEY: ENC[AES256_GCM,data:4+CiTc2C,iv:…,tag:…,type:str]
sops:
  # Encrypted data keys and metadata
```

Print the decrypted variables as lines of an environment file:

```sh
npx sops-env environment.sops.yaml
```

```sh
NODE_ENV=production
PORT=3000
SECRET_KEY=s3cr3t
```

Values are printed as is, without quoting or escaping, so the command fails when a value spans several lines.

### Set variables in Dokku

Pass `--base64` to print every value base64-encoded, as `dokku config:set --encoded` expects; multi-line values are allowed:

```sh
ssh dokku@example.com config:set --encoded my-app $(npx sops-env --base64 environment.sops.yaml)
```

The unquoted substitution splits the output into one argument per variable.
A failed command inside it does not stop the script, so in a script assign the output to a variable first and stop on failure, instead of running `config:set` without variables:

```sh
config=$(npx sops-env --base64 environment.sops.yaml) || exit
ssh dokku@example.com config:set --encoded my-app $config
```

### Values

- Strings, numbers, and booleans are printed as text, such as `PORT=3000` and `DEBUG=true`.
- sops normalizes numbers, such as `1.50` to `1.5`; quote a value to keep its exact text.
- `null`, lists, and maps are rejected: quote a value, such as `EMPTY: ''`, to print it as text.
