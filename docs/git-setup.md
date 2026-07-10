# Git & GitHub setup

## Remote

```bash
git remote add origin https://github.com/roosevelt-jpg/nextgenmove.git
git push -u origin master
```

Create the empty repo on GitHub first (no README if you already have local commits), or use GitHub CLI below.

## Daily workflow

```bash
git add -A
git status   # confirm .env.local is NOT listed
git commit -m "describe your change"
git push origin main
```

## Install GitHub CLI (optional)

```powershell
winget install GitHub.cli
gh auth login
gh repo create nextgenmove --private --source=. --remote=origin --push
```
