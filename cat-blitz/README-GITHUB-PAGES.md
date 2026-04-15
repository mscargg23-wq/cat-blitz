# Cat Blitz on GitHub Pages

This project is already prepared for GitHub Pages with the workflow at:

- `.github/workflows/deploy-cat-blitz.yml`

## What to upload

Upload the whole repository folder structure, including:

- `.github/workflows/deploy-cat-blitz.yml`
- `cat-blitz/index.html`
- `cat-blitz/styles.css`
- `cat-blitz/app.js`

## Recommended setup

1. Create a new GitHub repository.
2. Upload these files to the `main` branch.
3. In GitHub, open `Settings` -> `Pages`.
4. Under `Build and deployment`, choose `GitHub Actions`.
5. Push any change to `main` and GitHub will publish the site automatically.

## Final URL

If your repository is named `my-cat-game`, the site URL will usually be:

- `https://YOUR_GITHUB_USERNAME.github.io/my-cat-game/`

If the repository itself is named `YOUR_GITHUB_USERNAME.github.io`, the site URL will be:

- `https://YOUR_GITHUB_USERNAME.github.io/`

## Notes

- The workflow publishes only the `cat-blitz` folder.
- Asset paths are relative, so the game works on standard project Pages URLs.
- The workflow runs on every push to `main` that changes `cat-blitz` or the deploy workflow itself.
