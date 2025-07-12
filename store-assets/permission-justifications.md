# Chrome Web Store Permission Justifications for SABconnectV3

## Required Permissions and Justifications

### 1. **"tabs"** Permission
**Justification:** Required to open the SABnzbd web interface in a new tab when users click "Open SABnzbd" in the extension popup. This allows users to quickly access their SABnzbd server's full web interface for advanced configuration and monitoring.

### 2. **"notifications"** Permission  
**Justification:** Used to display system notifications to users about download completion, errors, or important status changes from their SABnzbd server. This provides essential feedback when the browser is not in focus.

### 3. **"contextMenus"** Permission
**Justification:** Creates right-click context menu options on supported NZB websites, allowing users to quickly send NZB files to their SABnzbd server without navigating through multiple pages.

### 4. **"storage"** Permission
**Justification:** Essential for storing user configuration data including SABnzbd server settings (URL, API key, credentials), user preferences, download categories, and cached queue data. All data is stored locally and never transmitted to external servers.

### 5. **"scripting"** Permission
**Justification:** Required to inject content scripts into supported NZB websites to add "Send to SABnzbd" download buttons and integrate the extension functionality seamlessly into the user's browsing experience.

### 6. **"activeTab"** Permission
**Justification:** Allows the extension to access the currently active tab when users explicitly interact with the extension (click the popup or context menu). This enables the extension to determine the current NZB site and provide appropriate download functionality.

## Host Permissions Justifications

### **NZB Website Host Permissions**
The extension requests host permissions for the following NZB indexing websites:

- `*://*.nzbclub.com/*`
- `*://*.bintube.com/*` 
- `*://*.binsearch.info/*` / `*://*.binsearch.net/*` / `*://*.binsearch.co.uk/*` / `*://*.binsear.ch/*`
- `*://*.nzbindex.com/*` / `*://*.nzbindex.nl/*`
- `*://*.fanzub.com/*`
- `*://*.animezb.com/*` / `*://animenzb.com/*`
- `*://*.dognzb.cr/*`
- `*://*.yubse.com/*`
- `*://*.omgwtfnzbs.org/*`
- `*://*.nzb-rss.com/*`
- `*://*.usenet4ever.info/*`

**Justification:** These permissions are necessary to inject content scripts that add "Download with SABnzbd" buttons to NZB search results on these popular Usenet indexing websites. The extension only modifies the visual presentation by adding download buttons and does not collect, modify, or transmit any user data from these sites. This is the core functionality that allows users to seamlessly download NZB files to their SABnzbd server directly from search results.

## Content Scripts Justification

**Purpose:** Content scripts are injected into supported NZB websites to:
1. Detect NZB download links on the page
2. Add "Send to SABnzbd" buttons next to download links
3. Handle the download process when users click these buttons
4. Provide visual feedback (success/error states) for download operations

**Data Access:** The content scripts only read NZB file URLs and metadata (file names, sizes) that are already publicly visible on these websites. No private user information is accessed or transmitted.

## Privacy and Security

- **No data collection:** The extension does not collect, store, or transmit any personal user data to external servers
- **Local storage only:** All configuration and cache data is stored locally in the user's browser
- **Direct communication:** The extension only communicates with the user's configured SABnzbd server
- **No tracking:** No analytics, advertising, or user behavior tracking is implemented

## Single Purpose Statement

This extension serves the single purpose of integrating Chrome with SABnzbd download managers, allowing users to send NZB files from supported indexing websites directly to their SABnzbd server and monitor download progress through a browser popup interface.
