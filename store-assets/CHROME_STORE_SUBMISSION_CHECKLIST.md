# Chrome Web Store Submission Checklist

## ✅ Pre-Submission Requirements (COMPLETED)

### Technical Migration
- [x] **Manifest V3**: Updated from V2 to V3
- [x] **Service Worker**: Replaced background scripts
- [x] **Permissions**: Updated to use `host_permissions`
- [x] **CSP**: Content Security Policy updated
- [x] **No Remote Code**: All scripts are bundled locally

### Store Compliance
- [x] **Package Size**: ~0.1MB (well under 128MB limit)
- [x] **Host Permissions**: Removed localhost and overly broad permissions
- [x] **Privacy Compliant**: No data collection or external transmissions
- [x] **Content Scripts**: Only inject on supported NZB sites

### Required Files
- [x] **manifest.json**: V3 compliant, version 0.8
- [x] **Extension Package**: `SABconnectV3-ChromeStore-FINAL.zip`
- [x] **Icons**: 48px and 128px icons included
- [x] **Privacy Policy**: HTML version created (`docs/privacy-policy.html`)

---

## 🚀 Chrome Web Store Submission Steps

### Step 1: Host Privacy Policy
**You need to do this first:**

1. **Upload privacy policy to GitHub Pages** (recommended):
   - Create a new repository or use existing one
   - Upload `docs/privacy-policy.html`
   - Enable GitHub Pages in repository settings
   - Get URL like: `https://yourusername.github.io/repo/privacy-policy.html`

2. **Alternative**: Use Netlify, GitHub Gist, or your own website

### Step 2: Developer Dashboard Setup
1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Pay $5 registration fee (one-time)
3. Click "Add a new item"

### Step 3: Upload Extension
1. Upload `SABconnectV3-ChromeStore-FINAL.zip`
2. Wait for package analysis (should pass all checks)

### Step 4: Store Listing Tab

#### Basic Information
- **Name**: `SABconnectV3`
- **Summary**: `Connect to and control your SABnzbd server with this modern Manifest V3 extension`
- **Description**: (Use content from `store-assets/store-description.md`)

#### Category & Visibility
- **Category**: `Productivity`
- **Visibility**: `Public`

#### Media
Required promotional images (you'll need to create these):
- **Small promotional tile**: 440x280 pixels
- **Large promotional tile**: 920x680 pixels  
- **Marquee promotional tile**: 1400x560 pixels
- **Screenshots**: At least 1, up to 5 (1280x800 or 640x400)

#### Additional Info
- **Official website**: Your GitHub repository URL
- **Support URL**: Your GitHub issues page

### Step 5: Privacy Practices Tab
**Critical - this is where most submissions fail:**

#### Privacy Policy
- **Privacy policy URL**: Enter your hosted privacy policy URL

#### Data Usage
Select for each data type what applies:
- **Personally Identifiable Information**: `Does not collect`
- **Financial Information**: `Does not collect`
- **Authentication Information**: `Collects` → `For app functionality` → `Not transmitted off device`
- **Personal Communications**: `Does not collect`
- **Location Data**: `Does not collect`
- **Web History**: `Does not collect`
- **User Activity**: `Does not collect`
- **Website Content**: `Accesses` → `For app functionality` → `Not transmitted off device`

#### Certification
Check all the boxes to certify compliance with Google's policies.

### Step 6: Permissions Tab

#### Permission Justifications
**Copy-paste these exact justifications from `store-assets/permission-justifications-short.md`:**

- **tabs**: Required to open SABnzbd web interface in new tabs when users click "Open SABnzbd" button.
- **notifications**: Display download completion and error notifications to users when browser is not in focus.
- **contextMenus**: Add right-click context menu options on NZB sites for quick downloads to SABnzbd.
- **storage**: Store user settings (SABnzbd server URL, API key, preferences) and cache download queue data locally.
- **scripting**: Inject content scripts into NZB websites to add "Send to SABnzbd" download buttons.
- **activeTab**: Access current tab when user interacts with extension to determine NZB site context.

#### Host Permissions
**Single justification for all NZB sites:**
Access NZB indexing websites (nzbclub.com, binsearch.info, nzbindex.com, etc.) to inject download buttons and enable seamless NZB file downloading to user's SABnzbd server. Only reads publicly visible NZB URLs and file metadata. No personal data collected or transmitted.

### Step 7: Submit for Review
1. Click "Submit for review"
2. Review can take 1-7 days
3. You'll receive email updates on status

---

## 📋 Common Rejection Reasons & How We've Avoided Them

| Issue | How We Fixed It |
|-------|----------------|
| Manifest V2 | ✅ Migrated to V3 |
| Remote code execution | ✅ All scripts bundled locally |
| Overly broad permissions | ✅ Removed localhost, limited to specific NZB sites |
| Missing privacy policy | ✅ Created comprehensive policy |
| Vague permission justifications | ✅ Specific, detailed explanations |
| Data collection without disclosure | ✅ Only local storage, clearly documented |

---

## 🔧 Files Ready for Submission

1. **Extension Package**: `SABconnectV3-ChromeStore-FINAL.zip` (106KB)
2. **Privacy Policy**: `docs/privacy-policy.html` (needs hosting)
3. **Descriptions**: `store-assets/store-description.md`
4. **Permission Justifications**: `store-assets/permission-justifications-short.md`

---

## 🎯 What You Need to Do

1. **Host privacy policy** using instructions in `store-assets/HOSTING_PRIVACY_POLICY.md`
2. **Create promotional images** (use Canva, Figma, or similar)
3. **Follow submission steps** above
4. **Wait for approval** (usually 1-3 days for compliant extensions)

The extension is technically ready and should pass all automated checks!
