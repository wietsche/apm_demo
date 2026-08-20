# apm-demo

A barebones [APM](https://microsoft.github.io/apm/) marketplace — one Git repo hosting **multiple packages**. Each folder under `packages/` is an independently installable bundle of agent **skills**. Packages in this repo are versioned together — see [Versioning](#versioning). Consumers install a package by referencing this repo.

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
apm install wietsche/apm_demo/packages/hello#v1.1.0
```

```bash
apm install wietsche/apm_demo/packages/hello --skill hello-world
```

Or declare it in your own `apm.yml`, then run `apm install`:

```yaml
dependencies:
  apm:
    - wietsche/apm_demo/packages/hello#v1.1.0    # omit #tag to track main
```

## Add a package

1. Copy a folder under `packages/` to `packages/<your-package>/`.
2. Give it a unique `name` in its `apm.yml`, and the same `version` as the other packages (see [Versioning](#versioning)).
3. Put skills under `.apm/skills/<skill>/SKILL.md`. In each `SKILL.md`, `name` must equal the skill folder name and `description` must start with "Use when".
4. Commit, then release with a version bump (below).

## Versioning

APM has no registry — **versions are git tags**, and a tag names a commit of the *whole repo*. In `packages/hello#v1.1.0`, the `#ref` resolves against the repository; the path is then extracted as a subdirectory of that commit. The `version:` inside a package's `apm.yml` is metadata — it is not what gets resolved.

This repo uses the **lockstep** strategy: every package carries the same `version`, and one repo tag releases them all. That keeps the number in `apm.yml` and the number you pin identical. To publish:

```bash
git tag v1.2.0 && git push --tags
```

APM names three strategies, set as `marketplace.versioning.strategy`:

| strategy | tags you cut | use when |
| --- | --- | --- |
| `lockstep` | one `v1.2.0` for the repo | packages release together — **this repo** |
| `tag_pattern` | `hello-v1.2.0`, `echo-v2.0.1` | packages release on different cadences |
| `per_package` | no convention enforced | the gate only checks each package declares a `version:` |

`tag_pattern` needs a root `apm.yml` with a `marketplace:` block setting `build.tagPattern: "{name}-v{version}"`, overridable per plugin. Even then the tag still points at a whole-repo commit — only the named subdirectory is extracted. For a tag that snapshots one package and nothing else, give that package its own repo.

Avoid slashes in tag names (`hello/v1.2.0`): they are valid git, but the ref is whatever follows `#` in a string that already uses `/` as a path separator.

### Tag history

`v1.0.0` predates the `packages/` layout — that commit has no `packages/` directory, so nothing installable resolves from it. It is kept for history. Releases start at `v1.1.0`.
