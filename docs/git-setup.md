# Git & GitHub setup

## Remote

Primary remote (`origin`):

```bash
git remote add origin https://github.com/roosevelt-jpg/nextgenmove.git
git push -u origin master
```

Repo: https://github.com/roosevelt-jpg/nextgenmove  
Default working branch: `master` (older v0 scaffold remains on `main` with a separate history).

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
