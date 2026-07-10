# Git & GitHub setup

## Remote

```bash
git remote add origin https://github.com/YOUR_USER/nextgenmove.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USER` with your GitHub username. Create the empty repo on GitHub first (no README if you already have local commits).

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
