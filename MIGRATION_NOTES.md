# SABconnect++ Manifest V3 Migration

## Migration Status: COMPLETED

### Key Changes Made:

1. **Manifest V3 Conversion**
   - Updated `manifest_version` from 2 to 3
   - Replaced `browser_action` with `action`
   - Converted background scripts to service worker
   - Split permissions into `permissions` and `host_permissions`
   - Added `scripting` permission for content script injection

2. **Service Worker Implementation**
   - Created `scripts/pages/service_worker.js` combining functionality from:
     - `background.js`
     - `context_menu.js` 
     - `newznab-check.js`
   - Uses `chrome.storage.local` instead of localStorage
   - Implements message passing for communication with popup/content scripts

3. **API Updates**
   - Replaced `chrome.tabs.executeScript()` with `chrome.scripting.executeScript()`
   - Replaced `chrome.tabs.insertCSS()` with `chrome.scripting.insertCSS()`
   - Updated extension communication to use `chrome.runtime.sendMessage()`

4. **Content Security Policy**
   - Added strict CSP to prevent eval() usage
   - Moved inline scripts to external files

5. **Storage Migration**
   - Updated popup.js and common.js to use chrome.storage instead of localStorage
   - Maintained compatibility with existing StoreClass system

6. **HTML Updates**
   - Removed inline script templates from popup.html
   - Created external template file for popup templates

### Host Permissions
Replaced broad `*://*/*` permission with specific host permissions for:
- NZB indexing sites (nzbclub, binsearch, nzbindex, etc.)
- Local SABnzbd instances (localhost)

### Testing Recommendations:

1. **Load Extension**: Load the extension in Chrome Developer Mode
2. **Test Core Features**:
   - Popup interface and SABnzbd connection
   - One-click NZB downloads on supported sites
   - Context menu functionality
   - Settings page functionality
3. **Check Console**: Monitor for any JavaScript errors
4. **Verify Permissions**: Ensure extension only requests minimal necessary permissions

### Known Limitations:
- File protocol URLs (`file://`) are restricted in MV3 - notifications that would open local files now log to console instead
- Some jQuery functionality may be limited by strict CSP

### Next Steps:
1. Test extension functionality thoroughly
2. Update version number if ready for release
3. Consider updating jQuery to a more recent CSP-compliant version if needed
