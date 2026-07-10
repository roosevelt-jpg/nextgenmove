# Git & GitHub setup

## Remotes

| Remote | URL | Role |
|---|---|---|
| `origin` | https://github.com/roosevelt-jpg/nextgenmove.git | Primary app (push here) |
| `rules` | https://github.com/roosevelt-jpg/nextgen-move-rules.git | Phase 0 / v0 rules reference (fetch only) |

```bash
git remote add origin https://github.com/roosevelt-jpg/nextgenmove.git
git remote add rules https://github.com/roosevelt-jpg/nextgen-move-rules.git
git push -u origin master
```

This app is the build target. The `rules` remote is the earlier scaffold; do not overwrite live `src/app` with its stubs. Fetch updates with `git fetch rules`.

## Daily workflow

```bash
git add -A
git status   # confirm .env.local is NOT listed
git commit -m "describe your change"
git push origin master
```

## Install GitHub CLI (optional)

```powershell
winget install GitHub.cli
gh auth login
gh repo create nextgenmove --private --source=. --remote=origin --push
```
