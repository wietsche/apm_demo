# apm-demo

A barebones [APM](https://microsoft.github.io/apm/) marketplace — one Git repo hosting **multiple packages**. Each folder under `packages/` is an independently installable, independently versioned bundle of agent **skills**. Consumers install a package by referencing this repo.

## Layout

```
packages/
  <package>/
    apm.yml                        # package manifest (name, version)
    .apm/skills/<skill>/SKILL.md   # one folder per skill
README.md
```

Packages: `hello` (skill `hello-world`), `echo` (skill `echo`).

## Use it

Install the APM CLI once:

```bash
curl -sSL https://aka.ms/apm-unix | sh    # Windows: irm https://aka.ms/apm-windows | iex
```

Install a package from this repo into your project:

```bash
apm install wietsche/apm_demo/packages/hello
```

Pin a version (a repo git tag), or pull just one skill from a package:

```bash
apm install wietsche/apm_demo/packages/hello#v1.0.0
apm install wietsche/apm_demo/packages/hello --skill hello-world
```

Or declare it in your own `apm.yml`, then run `apm install`:

```yaml
dependencies:
  apm:
    - wietsche/apm_demo/packages/hello#v1.0.0    # omit #tag to track main
```

## Add a package

1. Copy a folder under `packages/` to `packages/<your-package>/`.
2. Give it a unique `name` and a `version` in its `apm.yml`.
3. Put skills under `.apm/skills/<skill>/SKILL.md`. In each `SKILL.md`, `name` must equal the skill folder name and `description` must start with "Use when".
4. Commit, tag, and push:

   ```bash
   git add . && git commit -m "Add <your-package>" && git tag v1.1.0 && git push --tags
   ```

## Versioning

Each package sets its own `version` in `apm.yml`. Consumers pin against the **repo's git tags** (`#v1.2.3`), so cut a tag whenever you publish. To version a package fully independently of the others, give it its own repo.
