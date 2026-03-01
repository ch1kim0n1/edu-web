# GitHub Pages Deployment Guide

This project is a static site, so GitHub Pages is enough to keep it online 24/7 without a backend server.

## 1) Push Repository to GitHub
From project root:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<username>/<repo-name>.git
git push -u origin main
```

If your repo already exists, just push latest `main`.

## 2) Enable GitHub Pages
In your GitHub repository:
1. Open `Settings`.
2. Open `Pages`.
3. Under `Build and deployment`:
   - `Source`: `Deploy from a branch`
   - `Branch`: `main`
   - `Folder`: `/ (root)`
4. Click `Save`.

## 3) Wait for Publish
- First deploy usually takes 1-5 minutes.
- Refresh `Settings -> Pages` until you see the published URL.

## 4) Your Public URL
- Standard project repo: `https://<username>.github.io/<repo-name>/`
- User/Org site repo (repo name exactly `<username>.github.io`): `https://<username>.github.io/`

For this repo, if your GitHub username is `ch1kim0n1` and repo is `edu-web`, URL will be:
- `https://ch1kim0n1.github.io/edu-web/`

## 5) Keep It Always Up
- Any push to `main` auto-updates the site.
- The site remains public continuously unless:
  - repository is deleted
  - repository is made private without compatible Pages plan/settings
  - Pages is disabled

## 6) Common Issues
### 404 after enabling Pages
- Confirm source is `main` + `/ (root)`.
- Confirm URL includes repo name for project repos:
  - correct: `https://<username>.github.io/<repo-name>/`
  - wrong: `https://<username>.github.io/` (unless repo is `<username>.github.io`)

### CSS/JS not loading
- This project uses relative paths, so it works on project pages by default.
- Make sure files are committed at repo root (not nested under another folder unexpectedly).

### Changes not visible
- Hard refresh browser (`Ctrl+F5` / `Cmd+Shift+R`).
- Check latest commit is on `main`.
- Check `Actions` tab for failed Pages deployments.

## 7) Optional Custom Domain
1. Add your domain in `Settings -> Pages -> Custom domain`.
2. Add DNS records required by GitHub.
3. Enable `Enforce HTTPS` after DNS propagates.
