# Chrome Web Store Permission Justifications (Short Form)

## For Copy-Paste into Chrome Web Store Form:

### tabs
Required to open SABnzbd web interface in new tabs when users click "Open SABnzbd" button.

### notifications  
Display download completion and error notifications to users when browser is not in focus.

### contextMenus
Add right-click context menu options on NZB sites for quick downloads to SABnzbd.

### storage
Store user settings (SABnzbd server URL, API key, preferences) and cache download queue data locally.

### scripting
Inject content scripts into NZB websites to add "Send to SABnzbd" download buttons.

### activeTab
Access current tab when user interacts with extension to determine NZB site context.

### Host Permissions (NZB Sites)
Access NZB indexing websites (nzbclub.com, binsearch.info, nzbindex.com, etc.) to inject download buttons and enable seamless NZB file downloading to user's SABnzbd server. Only reads publicly visible NZB URLs and file metadata. No personal data collected or transmitted.
