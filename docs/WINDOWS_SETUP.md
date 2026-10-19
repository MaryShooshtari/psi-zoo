# Windows setup and project commands

Open **PowerShell** (Windows Terminal). Install Git, GitHub CLI, VS Code and
Node.js LTS using winget if missing:

```powershell
winget install --id Git.Git -e
winget install --id GitHub.cli -e
winget install --id Microsoft.VisualStudioCode -e
winget install --id OpenJS.NodeJS.LTS -e
```

Restart terminal, then check `git --version`, `gh --version`, `code --version`,
`node --version`, `npm --version`. Pi requires Node >= 22.19.

Install Pi, if missing:

```powershell
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
pi --version
```

Pi on native Windows uses Git Bash as its Bash tool. Inside Pi type
`!printf 'Bash is working\n'`. Use `/login` to sign in to OpenAI Codex
(if offered by your installed version), then `/model`.

Move `psi-zoo` to `$HOME\Projects\psi-zoo` (or choose your preferred directory).
From project folder in PowerShell:

```powershell
npm install
npm run test
npm run typecheck
npm run build
npm run dev
```

After verifying locally, create private GitHub repository:

```powershell
gh auth login
git init -b main
git add .
git commit -m "chore: scaffold Psi Zoo slice 0"
gh repo create psi-zoo --private --source=. --remote=origin --push
```

For Lean proofs, install official Lean 4 VS Code extension
(`code --install-extension leanprover.lean4`), follow its setup guide, and
ensure `lake` works. In `$HOME\Projects`:

```powershell
lake +leanprover-community/mathlib4:lean-toolchain new PsiZoo math
Rename-Item PsiZoo psi-zoo-proofs
cd psi-zoo-proofs
lake exe cache get
lake build
```

Place the bundle's `proofs-AGENTS.md` in the new proof-repo root under
name `AGENTS.md`, then initialize and publish the second repo separately.
Do not copy the app repo's `node_modules` or the Lean `.lake` cache into Git.
