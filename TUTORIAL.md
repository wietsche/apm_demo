# Build an APM Marketplace

Two hats, alternating:

| | Directory | Role |
|---|---|---|
| 🏪 **SHOP** | `~/toolshed` | you publish packages |
| 👤 **YOU** | `~/myproject` | you consume them |

Every block is one command. Copy, paste, next.

---

## 0 · Setup

Install the CLI:

```bash
curl -sSL https://aka.ms/apm-unix | sh
```

<sub>Windows PowerShell: `irm https://aka.ms/apm-windows | iex`</sub>

Set your GitHub username — **every block below uses it**:

```bash
export GH_USER=your-github-username
```

---

# 🏪 1 · Skeleton + echo skill

```bash
mkdir -p ~/toolshed/packages/echo/.apm/skills/echo
```

```bash
cd ~/toolshed
```

**Marketplace manifest** (the storefront):

```bash
cat > apm.yml <<YAML
name: toolshed
version: 0.1.0
description: My APM marketplace.
license: MIT

marketplace:
  owner:
    name: $GH_USER
    url: https://github.com/$GH_USER
  versioning:
    strategy: lockstep
  outputs:
    claude: {}
  packages:
    - name: echo
      description: Repeats your message back.
      category: examples
      source: ./packages/echo
      version: 0.1.0
YAML
```

**Package manifest** (one per package):

```bash
cat > packages/echo/apm.yml <<'YAML'
name: echo
version: "0.1.0"
description: Repeats your message back.
license: MIT
YAML
```

**The skill itself**:

```bash
cat > packages/echo/.apm/skills/echo/SKILL.md <<'MD'
---
name: echo
description: Use when the user asks you to echo or repeat something back.
---

# Echo

## Instructions

Reply with `echo: ` followed by the user's message, verbatim. Nothing else.
MD
```

**Generate the storefront JSON**:

```bash
apm pack --offline
```

→ writes `.claude-plugin/marketplace.json`. Commit it.

**Publish**:

```bash
git init -b main
```

```bash
git add -A
```

```bash
git commit -m "echo 0.1.0"
```

```bash
git tag v0.1.0
```

```bash
gh repo create $GH_USER/toolshed --public --source=. --remote=origin --push
```

```bash
git push --tags
```

### Rules that bite

- Skill folder name **must equal** `name:` in `SKILL.md`.
- `description:` **must start with** `Use when`.
- The marketplace is called `toolshed` because of `name:` in `apm.yml` — **not** the repo name.
- Consumers only see what is **committed and pushed**.

### Layout so far

```
~/toolshed/
├── apm.yml                            ← storefront
├── .claude-plugin/marketplace.json    ← generated, commit it
└── packages/echo/
    ├── apm.yml                        ← package
    └── .apm/skills/echo/SKILL.md      ← the skill
```

---

# 👤 2 · Install echo in a blank directory

Register the shop once (machine-wide):

```bash
apm marketplace add $GH_USER/toolshed
```

```bash
apm marketplace browse toolshed
```

```bash
mkdir ~/myproject
```

```bash
cd ~/myproject
```

```bash
apm install echo@toolshed --target claude
```

You get:

```
apm.yml                        ← your deps
apm.lock.yaml                  ← exactly what landed
.claude/skills/echo/SKILL.md   ← live skill
```

> ⚠️ `[!] 1 dependency unpinned` — expected. Step 5 fixes it.

---

# 👤 3 · Use the echo skill

```bash
claude
```

Type:

```
echo this back to me: hello world
```

→ `echo: hello world`

---

# 🏪 4 · Ship echo v0.2.0

```bash
cd ~/toolshed
```

Change the behaviour:

```bash
cat > packages/echo/.apm/skills/echo/SKILL.md <<'MD'
---
name: echo
description: Use when the user asks you to echo or repeat something back.
---

# Echo

## Instructions

Reply with `echo: ` followed by the user's message in UPPERCASE. Nothing else.
MD
```

Bump **both** manifests — lockstep means every number matches:

```bash
cat > packages/echo/apm.yml <<'YAML'
name: echo
version: "0.2.0"
description: Repeats your message back.
license: MIT
YAML
```

```bash
cat > apm.yml <<YAML
name: toolshed
version: 0.2.0
description: My APM marketplace.
license: MIT

marketplace:
  owner:
    name: $GH_USER
    url: https://github.com/$GH_USER
  versioning:
    strategy: lockstep
  outputs:
    claude: {}
  packages:
    - name: echo
      description: Repeats your message back.
      category: examples
      source: ./packages/echo
      version: 0.2.0
YAML
```

Check the numbers line up:

```bash
apm pack --offline --check-versions --dry-run
```

→ `[*] Version alignment OK [strategy=lockstep, expected=0.2.0]`

```bash
apm pack --offline
```

```bash
git add -A
```

```bash
git commit -m "echo 0.2.0"
```

```bash
git tag v0.2.0
```

```bash
git push origin main --tags
```

> 💡 **Versions are git tags.** `version:` in `apm.yml` is metadata. `#v0.2.0` is what actually resolves.

---

# 👤 5 · Install the update and lock it

```bash
cd ~/myproject
```

See the drift:

```bash
apm outdated
```

Pin to the tag — one command rewrites `apm.yml`, refetches, and rewrites the lock:

```bash
apm install $GH_USER/toolshed/packages/echo#v0.2.0
```

```bash
grep -E "resolved_ref|resolved_commit|^  version" apm.lock.yaml
```

→
```
resolved_commit: 911aff37...
resolved_ref: v0.2.0
version: 0.2.0
```

Prove the lock is honoured:

```bash
apm install --frozen
```

```bash
apm audit --ci
```

→ `[*] All 10 check(s) passed`

---

# 👤 6 · Show the new version works

```bash
claude
```

Type:

```
echo this back to me: hello world
```

→ `echo: HELLO WORLD`   *(was lowercase in step 3)*

---

# 🏪 7 · Add a trivial MCP server

```bash
cd ~/toolshed
```

```bash
mkdir -p packages/adder/.apm
```

**The server** — zero dependencies, plain stdio JSON-RPC:

```bash
cat > packages/adder/server.js <<'JS'
const TOOL = {
  name: "add",
  description: "Add two numbers.",
  inputSchema: {
    type: "object",
    properties: { a: { type: "number" }, b: { type: "number" } },
    required: ["a", "b"],
  },
};

const send = (m) => process.stdout.write(JSON.stringify({ jsonrpc: "2.0", ...m }) + "\n");

let buf = "";
process.stdin.on("data", (c) => {
  buf += c;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (line) handle(JSON.parse(line));
  }
});

function handle({ id, method, params }) {
  if (method === "initialize")
    send({ id, result: { protocolVersion: "2024-11-05", capabilities: { tools: {} },
                         serverInfo: { name: "adder", version: "1.0.0" } } });
  else if (method === "tools/list") send({ id, result: { tools: [TOOL] } });
  else if (method === "tools/call") {
    const { a, b } = params.arguments;
    send({ id, result: { content: [{ type: "text", text: `${a} + ${b} = ${a + b}` }] } });
  } else if (id !== undefined)
    send({ id, error: { code: -32601, message: `Unknown method: ${method}` } });
}
JS
```

**Package manifest** — an MCP server is a *declaration*, not a file APM copies:

```bash
cat > packages/adder/apm.yml <<YAML
name: adder
version: "0.3.0"
description: MCP server that adds two numbers.
license: MIT

dependencies:
  mcp:
    - name: adder
      registry: false
      transport: stdio
      command: node
      args: ["apm_modules/$GH_USER/toolshed/packages/adder/server.js"]
YAML
```

> ⚠️ `args` is relative to the **consumer's project root**. A git package always lands at `apm_modules/<owner>/<repo>/<path>/`.
> ⚠️ The key is `dependencies.mcp:`. A top-level `mcpServers:` block is silently ignored.

Add it to the storefront and roll everything to 0.3.0:

```bash
cat > apm.yml <<YAML
name: toolshed
version: 0.3.0
description: My APM marketplace.
license: MIT

marketplace:
  owner:
    name: $GH_USER
    url: https://github.com/$GH_USER
  versioning:
    strategy: lockstep
  outputs:
    claude: {}
  packages:
    - name: echo
      description: Repeats your message back.
      category: examples
      source: ./packages/echo
      version: 0.3.0

    - name: adder
      description: MCP server that adds two numbers.
      category: examples
      source: ./packages/adder
      version: 0.3.0
YAML
```

```bash
cat > packages/echo/apm.yml <<'YAML'
name: echo
version: "0.3.0"
description: Repeats your message back.
license: MIT
YAML
```

```bash
apm pack --offline --check-versions --dry-run
```

```bash
apm pack --offline
```

```bash
git add -A
```

```bash
git commit -m "adder 0.3.0"
```

```bash
git tag v0.3.0
```

```bash
git push origin main --tags
```

---

# 👤 8 · Install the MCP and test it

```bash
cd ~/myproject
```

Refresh the local storefront cache:

```bash
apm marketplace update toolshed
```

```bash
apm marketplace browse toolshed
```

```bash
apm install $GH_USER/toolshed/packages/adder#v0.3.0
```

→ `[+] adder -> Claude (configured)`

```bash
cat .mcp.json
```

```bash
claude mcp list
```

→ `adder: node apm_modules/.../server.js - ⏸ Pending approval`

Now use it:

```bash
claude
```

Approve `adder` when Claude Code asks, then type:

```
Use the adder MCP tool to add 2 and 3.
```

→ `2 + 3 = 5`

---

# 🏪 9 · Governance file that blocks MCP

APM finds org policy by reading your project's **git remote** and looking for
`apm-policy.yml` in `<owner>/.github-private`, `.github`, `.apm`, or `_apm` — first hit wins.

```bash
mkdir ~/apm-policy
```

```bash
cd ~/apm-policy
```

```bash
cat > apm-policy.yml <<'YAML'
name: "House rules"
version: "1.0.0"
enforcement: block

mcp:
  deny:
    - "*"
YAML
```

```bash
git init -b main
```

```bash
git add -A
```

```bash
git commit -m "block all MCP servers"
```

```bash
gh repo create $GH_USER/.apm --public --source=. --remote=origin --push
```

`enforcement:` — `off` → `warn` → `block`. Start at `warn` in real life.

---

# 👤 10 · Show MCP is dead

Give the project a git remote — that is how APM knows which org you're in:

```bash
cd ~/myproject
```

```bash
git init -b main
```

```bash
git remote add origin git@github.com:$GH_USER/myproject.git
```

Confirm the policy is found (also refreshes the 1-hour cache):

```bash
apm policy status --no-cache
```

→
```
Outcome          found
Source           org:<you>/.apm
Enforcement      block
Effective rules  1 mcp denies
```

<sub>A `Policy repo <you>/.github-private not found` warning is normal — APM tried it first.</sub>

Drop the config APM already wrote, then reinstall:

```bash
rm .mcp.json
```

```bash
apm install
```

→
```
[x] Policy violation: adder -- denied by pattern: *
[x] MCP server(s) blocked by org policy. APM packages remain installed; MCP configs were NOT written.
[x] Install failed
```

```bash
ls .mcp.json
```

→ `No such file or directory`

```bash
claude mcp list
```

→ `adder` is gone. Ask Claude to add 2 and 3 — it has no tool to call.

> ⚠️ Policy blocks the **write**. It does not delete an existing `.mcp.json` — hence the `rm`.
> Skills still install fine; only MCP is denied.
> Escape hatch (auditable, not silent): `apm install --no-policy`.

---

## Cleanup

```bash
apm marketplace remove toolshed --yes
```

Deleting repos needs an extra scope — grant it once:

```bash
gh auth refresh -h github.com -s delete_repo
```

```bash
gh repo delete $GH_USER/toolshed --yes
```

```bash
gh repo delete $GH_USER/.apm --yes
```

```bash
rm -rf ~/toolshed ~/myproject ~/apm-policy
```

---

## Cheatsheet

| Do | Command |
|---|---|
| Build storefront | `apm pack --offline` |
| Check version alignment | `apm pack --offline --check-versions --dry-run` |
| Register a shop | `apm marketplace add OWNER/REPO` |
| See what's on offer | `apm marketplace browse NAME` |
| Refresh shop cache | `apm marketplace update NAME` |
| Install by name | `apm install PKG@SHOP` |
| Install pinned | `apm install OWNER/REPO/packages/PKG#vX.Y.Z` |
| What drifted? | `apm outdated` |
| Reproduce lockfile exactly | `apm install --frozen` |
| CI gate | `apm audit --ci` |
| Where's my policy? | `apm policy status --no-cache` |
| Test a policy before pushing | `apm audit --ci --policy ./apm-policy.yml` |

### Where things live

| Thing | Path |
|---|---|
| Skill source | `packages/<pkg>/.apm/skills/<skill>/SKILL.md` |
| MCP declaration | `packages/<pkg>/apm.yml` → `dependencies.mcp` |
| Deployed skill | `.claude/skills/<skill>/SKILL.md` |
| Deployed MCP | `.mcp.json` |
| Raw download | `apm_modules/<owner>/<repo>/...` |
| Truth about what landed | `apm.lock.yaml` |
