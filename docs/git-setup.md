# Git & GitHub setup

## Remote

Primary remote (`origin`):

```bash
git remote add origin https://github.com/roosevelt-jpg/nextgen-move-rules.git
git push -u origin master
```

Repo: https://github.com/roosevelt-jpg/nextgen-move-rules  
Default working branch: `master` (the earlier v0 scaffold lives on `main`).

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
```
