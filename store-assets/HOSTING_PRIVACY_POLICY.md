# Hosting Your Privacy Policy

## Option 1: GitHub Pages (Recommended - Free)

1. **Create a new repository** (or use your existing one):
   - Go to GitHub.com
   - Create a new public repository called `sabconnectv3-privacy` (or use your existing repo)

2. **Upload the privacy policy**:
   - Upload the `docs/privacy-policy.html` file to your repository
   - Or create a new file directly on GitHub with the HTML content

3. **Enable GitHub Pages**:
   - Go to your repository Settings
   - Scroll down to "Pages" section
   - Under "Source", select "Deploy from a branch"
   - Choose "main" branch and "/ (root)" folder
   - Click Save

4. **Your privacy policy URL will be**:
   ```
   https://[your-username].github.io/[repository-name]/privacy-policy.html
   ```
   Example: `https://johndoe.github.io/sabconnectv3-privacy/privacy-policy.html`

## Option 2: Alternative Free Hosting

### Netlify (Free)
1. Go to netlify.com
2. Drag and drop the `docs` folder
3. Get instant URL like `https://amazing-name-123456.netlify.app/privacy-policy.html`

### GitHub Gist (Quick option)
1. Go to gist.github.com
2. Create a new gist with filename `privacy-policy.html`
3. Paste the HTML content
4. Save as public gist
5. Use the raw URL provided

## Option 3: Your Own Website
If you have a personal website, simply upload the `privacy-policy.html` file to any folder and use that URL.

---

## Next Steps After Hosting

1. **Test your privacy policy URL** - make sure it loads correctly
2. **Copy the URL** - you'll need it for the Chrome Web Store form
3. **Update manifest.json** if needed (though it's not required to include the privacy policy URL there)

## For Chrome Web Store Submission

Once you have your privacy policy URL, you'll enter it in the Chrome Web Store Developer Dashboard under:
- **Store listing** tab
- **Privacy practices** section
- **Privacy policy** field

Example URL format: `https://yourusername.github.io/repositoryname/privacy-policy.html`
