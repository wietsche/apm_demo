# apm-demo

A barebones [APM](https://microsoft.github.io/apm/) marketplace — a Git repo that hosts reusable agent **skills**. Consumers install skills by referencing this GitHub repo.

## Layout

```
apm.yml                              # marketplace manifest
.apm/skills/<name>/SKILL.md          # one folder per skill
```

Currently ships one skill: `hello-world`.

## Use it

Install the APM CLI (once):

```bash
curl -sSL https://aka.ms/apm-unix | sh    # Windows: irm https://aka.ms/apm-windows | iex
```

Install a single skill from this repo into your project:

```bash
apm install wietsche/apm_demo --skill hello-world
```

Or install every skill in the marketplace:

```bash
apm install wietsche/apm_demo
```

Or pin it as a dependency in your own `apm.yml`, then run `apm install`:

```yaml
dependencies:
  apm:
    - wietsche/apm_demo#v1.0.0    # omit #tag to track main
```

## Contribute a skill

1. Create `.apm/skills/<your-skill>/SKILL.md`.
2. Add YAML frontmatter — `name` must equal the folder name; `description` must start with "Use when" and state the trigger:

   ```markdown
   ---
   name: your-skill
   description: Use when <trigger>. <What it does.>
   ---

   # Your Skill

   Instructions the agent follows when this skill is invoked.
   ```

3. Keep `SKILL.md` under 500 lines. Optional `scripts/`, `references/`, `assets/`, `examples/` folders sit alongside it.
4. Bump `version` in `apm.yml`, then commit, tag, and push:

   ```bash
   git add . && git commit -m "Add your-skill" && git tag v1.1.0 && git push --tags
   ```
