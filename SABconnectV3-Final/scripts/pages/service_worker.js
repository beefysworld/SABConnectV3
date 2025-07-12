// Service Worker for SABconnect++ (Manifest V3)
// Combines functionality from background.js, context_menu.js, and newznab-check.js

// Note: importScripts with external dependencies can cause issues in service workers
// We'll include essential functions directly here for now

console.log('SABconnect++ service worker starting...');

// Essential utility functions
function checkEndSlash(url) {
    if (!url) return '';
    return url.endsWith('/') ? url : url + '/';
}

function constructApiUrl(profileValues) {
    const profile = profileValues || { url: 'http://localhost:8080/' };
    return checkEndSlash(profile.url) + 'api';
}

function constructApiPost(profileValues) {
    const profile = profileValues || {};
    const data = {};
    
    if (profile.api_key) {
        data.apikey = profile.api_key;
    }
    
    if (profile.username) {
        data.ma_username = profile.username;
    }
    
    if (profile.password) {
        data.ma_password = profile.password;
    }
    
    return new URLSearchParams(data).toString();
}

// File size formatting function
function fileSizes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// List of sites that send the X-DNZB-Category HTTP header
var category_header_sites = [];

var defaultSettings = {
    sabnzbd_url: 'http://localhost:8080/',
    sabnzbd_api_key: '',
    sabnzbd_username: '',
    provider_binsearch: true,
    provider_bintube: true,
    provider_dognzb: true,
    provider_fanzub: true,
    provider_animezb: true,
    provider_animenzb: true,
    provider_nzbclub: true,
    provider_nzbindex: true,
    provider_yubse: true,
    provider_omgwtfnzbs: true,
    provider_nzbrss: true,
    provider_newznab: 'your_newznab.com, some_other_newznab.com',
    provider_usenet4ever: true,
    use_name_binsearch: true,
    use_name_nzbindex: true,
    use_name_yubse: true,
    config_refresh_rate: 15,
    config_enable_graph: true,
    config_enable_context_menu: true,
    config_enable_notifications: true,
    config_notification_timeout: 10,
    config_ignore_categories: false,
    config_use_user_categories: false,
    config_use_category_header: false,
    config_hard_coded_category: '',
    config_default_category: '',
    config_enable_automatic_authentication: true,
    config_enable_automatic_detection: true,
    profiles: {},
    first_profile_initialized: false,
    active_category: '*',
    settings_synced: false
};

var notification_container = [];
var refreshTimer;

// Initialize on service worker startup
chrome.runtime.onStartup.addListener(initialize);
chrome.runtime.onInstalled.addListener(initialize);

function initialize() {
    console.log('SABconnect++ service worker starting...');
    initializeSettings();
    // Don't start timer immediately - wait for user interaction
    // startTimer();
    initializeBackgroundPage();
    setupContextMenus();
}

// Simple connectivity test
async function testBasicConnectivity() {
    try {
        // Test if we can make a basic fetch request
        const response = await fetch('http://localhost:8080/', {
            method: 'GET',
            mode: 'no-cors' // This prevents CORS errors for testing
        });
        console.log('Basic connectivity test completed');
        return true;
    } catch (error) {
        console.log('Basic connectivity test failed:', error.message);
        return false;
    }
}

// Initialize settings using chrome.storage instead of localStorage
async function initializeSettings() {
    try {
        const result = await chrome.storage.local.get(Object.keys(defaultSettings));
        
        // Set defaults for any missing settings
        const settingsToSet = {};
        for (const [key, defaultValue] of Object.entries(defaultSettings)) {
            if (!(key in result)) {
                settingsToSet[key] = defaultValue;
            }
        }
        
        if (Object.keys(settingsToSet).length > 0) {
            await chrome.storage.local.set(settingsToSet);
        }
        
        console.log('Settings initialized');
    } catch (error) {
        console.error('Error initializing settings:', error);
    }
}

// Timer management
function startTimer() {
    stopTimer();
    
    chrome.storage.local.get(['config_refresh_rate']).then(result => {
        const refreshRate = result.config_refresh_rate || 15;
        refreshTimer = setInterval(() => {
            fetchInfo(false);
        }, refreshRate * 1000);
    });
}

function stopTimer() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
}

// Background page initialization
function initializeBackgroundPage() {
    console.log('Background page initialized');
    
    // Set up tab update listener for newznab detection
    chrome.tabs.onUpdated.addListener(handleTabUpdate);
    
    // Set up notification button click handler
    chrome.notifications.onButtonClicked.addListener(handleNotificationClick);
    
    // Initial data fetch
    fetchInfo(false);
}

// Handle tab updates for newznab detection
async function handleTabUpdate(tabId, changeInfo, tab) {
    if (changeInfo.status !== 'complete' || !tab.url?.startsWith('http')) {
        return;
    }
    
    try {
        const settings = await chrome.storage.local.get([
            'provider_newznab',
            'config_enable_automatic_detection'
        ]);
        
        const newznabUrls = settings.provider_newznab;
        if (!newznabUrls) return;
        
        const urlList = newznabUrls.split(',');
        const parsedUrl = new URL(tab.url);
        const host = parsedUrl.hostname.match(/([^.]+)\.\w{2,3}(?:\.\w{2})?$/)?.[0];
        
        let foundNab = false;
        
        // Check if this is a configured newznab site
        for (const newznabUrl of urlList) {
            const trimmedUrl = newznabUrl.trim();
            if (trimmedUrl.length > 0 && tab.url.includes(trimmedUrl)) {
                await injectNewznabScripts(tabId);
                foundNab = true;
                break;
            }
        }
        
        // Handle automatic detection for non-configured sites
        if (!foundNab && settings.config_enable_automatic_detection) {
            const ignored = await chrome.storage.local.get([`nabignore.${host}`]);
            if (!ignored[`nabignore.${host}`]) {
                await injectAutoDetectionScripts(tabId);
            }
        }
        
    } catch (error) {
        console.error('Error in tab update handler:', error);
    }
}

// Inject scripts for newznab sites
async function injectNewznabScripts(tabId) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            files: [
                'third_party/jquery/jquery-1.12.4.min.js',
                'scripts/content/common.js',
                'third_party/webtoolkit/webtoolkit.base64.js',
                'scripts/content/newznab.js'
            ]
        });
        
        await chrome.scripting.insertCSS({
            target: { tabId },
            files: ['css/newznab.css']
        });
    } catch (error) {
        console.error('Error injecting newznab scripts:', error);
    }
}

// Inject scripts for auto-detection
async function injectAutoDetectionScripts(tabId) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            files: [
                'third_party/jquery/jquery-1.12.4.min.js',
                'third_party/jquery/jquery.notify.js',
                'scripts/content/common.js',
                'scripts/pages/newznab-autoadd.js'
            ]
        });
        
        await chrome.scripting.insertCSS({
            target: { tabId },
            files: ['css/nabnotify.css']
        });
    } catch (error) {
        console.error('Error injecting auto-detection scripts:', error);
    }
}

// Context menus setup
async function setupContextMenus() {
    try {
        const settings = await chrome.storage.local.get(['config_enable_context_menu']);
        
        if (settings.config_enable_context_menu) {
            chrome.contextMenus.create({
                id: 'sabconnect-send-to-sab',
                title: 'Send to SABnzbd',
                contexts: ['link']
            });
        }
    } catch (error) {
        console.error('Error setting up context menus:', error);
    }
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'sabconnect-send-to-sab') {
        try {
            const profile = await getActiveProfile();
            if (profile && info.linkUrl) {
                await sendToSabnzbd(info.linkUrl, profile);
            }
        } catch (error) {
            console.error('Error handling context menu click:', error);
        }
    }
});

// Get active profile from storage
async function getActiveProfile() {
    try {
        const result = await chrome.storage.local.get(['profiles', 'active_profile', 'sabnzbd_url', 'sabnzbd_api_key', 'sabnzbd_username']);
        
        // Check if we have a profiles system set up
        const profiles = result.profiles || {};
        const activeProfileName = result.active_profile || Object.keys(profiles)[0];
        
        if (activeProfileName && profiles[activeProfileName]) {
            return profiles[activeProfileName];
        }
        
        // Fallback to legacy settings or defaults
        return {
            url: result.sabnzbd_url || 'http://localhost:8080/',
            api_key: result.sabnzbd_api_key || '',
            username: result.sabnzbd_username || '',
            password: ''
        };
    } catch (error) {
        console.error('Error getting active profile:', error);
        return {
            url: 'http://localhost:8080/',
            api_key: '',
            username: '',
            password: ''
        };
    }
}

// Test connection function  
async function testConnection(profileValues, callback) {
    try {
        await fetchInfo(true, callback, profileValues);
    } catch (error) {
        console.error('Test connection failed:', error);
        if (callback) callback();
    }
}

// Reset settings function
async function resetSettings() {
    try {
        await chrome.storage.local.clear();
        await initializeSettings();
        console.log('Settings reset complete');
    } catch (error) {
        console.error('Error resetting settings:', error);
    }
}

// Send URL to SABnzbd
async function sendToSabnzbd(url, profile) {
    try {
        const apiUrl = constructApiUrl(profile);
        const postData = constructApiPost(profile);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `${postData}&name=${encodeURIComponent(url)}&mode=addurl`
        });
        
        if (response.ok) {
            console.log('Successfully sent to SABnzbd:', url);
        } else {
            console.error('Failed to send to SABnzbd:', response.status);
        }
    } catch (error) {
        console.error('Error sending to SABnzbd:', error);
    }
}

// Notification handling
function handleNotificationClick(notificationId, buttonIndex) {
    chrome.storage.local.get([notificationId]).then(result => {
        const entry = result[notificationId];
        if (entry && entry.storage) {
            // Note: file:// URLs are restricted in MV3, need alternative approach
            console.log('Would open:', entry.storage);
        }
    });
}

// Fetch SABnzbd info
async function fetchInfo(quickUpdate, callback, profileValues) {
    try {
        const profile = profileValues || await getActiveProfile();
        if (!profile) {
            console.error('No active profile found');
            await chrome.storage.local.set({ 
                error: 'No active profile configured. Please check extension settings.' 
            });
            if (callback) callback();
            return;
        }
        
        const apiUrl = constructApiUrl(profile);
        const postData = constructApiPost(profile);
        const requestBody = `${postData}&mode=queue&output=json`;
        
        console.log('=== SABnzbd Connection Attempt ===');
        console.log('Profile:', profile);
        console.log('API URL:', apiUrl);
        console.log('Request body:', requestBody);
        
        // First test basic connectivity
        const canConnect = await testBasicConnectivity();
        console.log('Basic connectivity test result:', canConnect);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: requestBody,
            mode: 'cors' // Explicitly set CORS mode
        });
        
        console.log('SABnzbd API Response status:', response.status);
        console.log('Response headers:', [...response.headers.entries()]);
        
        if (response.ok) {
            const data = await response.json();
            console.log('SABnzbd response data:', data);
            await fetchInfoSuccess(data, quickUpdate, callback);
        } else {
            const errorText = await response.text();
            console.error('HTTP Error:', response.status, response.statusText, errorText);
            await fetchInfoError(response, 'HTTP Error', `${response.status}: ${response.statusText}`, callback);
        }
    } catch (error) {
        console.error('Error fetching SABnzbd info:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        // Provide helpful error messages based on error type
        let userMessage = 'Connection failed: ';
        if (error.message.includes('Failed to fetch')) {
            userMessage += 'Cannot connect to SABnzbd. Please check:\n' +
                         '1. SABnzbd is running\n' +
                         '2. URL is correct (default: http://localhost:8080/)\n' +
                         '3. No firewall blocking connection';
        } else if (error.message.includes('CORS')) {
            userMessage += 'CORS error. SABnzbd may need CORS configuration.';
        } else {
            userMessage += error.message;
        }
        
        await chrome.storage.local.set({ 
            error: userMessage
        });
        if (callback) callback();
    }
}

async function fetchInfoSuccess(data, quickUpdate, callback) {
    if (!data || data.error) {
        await chrome.storage.local.set({ 
            error: data ? data.error : 'Success with no data?' 
        });
        
        if (callback) callback();
        return;
    }
    
    console.log('Processing SABnzbd data:', data);
    
    // Extract queue information
    const queue = data.queue || {};
    
    // Determine status based on SABnzbd state
    let status = 'idle';
    if (queue.paused) {
        status = 'paused';
    } else if (queue.slots && queue.slots.length > 0) {
        status = 'downloading';
    }
    
    // Store all the data that popup.js expects
    const storageData = {
        error: '',
        status: status,
        paused: queue.paused || false,
        timeleft: queue.timeleft || '0',
        speed: queue.speed ? `${queue.speed}B/s` : '-',
        sizeleft: queue.mbleft > 0 ? fileSizes(queue.mbleft * 1048576) : '',
        paused_jobs: queue.pause_int || 0,
        pause_int: queue.pause_int || 0,
        queue: JSON.stringify(queue.slots || [])
    };
    
    // Also store in the old format for compatibility
    if (queue.slots) {
        storageData.queue = JSON.stringify(queue.slots);
        // Store individual values as well for getPref compatibility
        for (const [key, value] of Object.entries(storageData)) {
            if (key !== 'queue') {
                storageData[key] = value;
            }
        }
    }
    
    console.log('Storing data:', storageData);
    
    await chrome.storage.local.set(storageData);
    
    // Update speed log if not a quick update
    if (!quickUpdate) {
        updateSpeedLog(data);
    }
    
    // Handle completed downloads notifications
    if (queue.slots) {
        await checkForCompletedDownloads(queue.slots);
    }
    
    if (callback) callback();
}

async function fetchInfoError(response, textStatus, errorThrown, callback) {
    console.error('SABnzbd fetch error:', textStatus, errorThrown);
    await chrome.storage.local.set({ 
        error: `Connection failed: ${textStatus}` 
    });
    
    if (callback) callback();
}

// Check for completed downloads and show notifications
async function checkForCompletedDownloads(slots) {
    const settings = await chrome.storage.local.get(['config_enable_notifications']);
    if (!settings.config_enable_notifications) return;
    
    // This would need to be implemented based on the original logic
    // from the background.js file for tracking completed downloads
}

// Update speed log
async function updateSpeedLog(data) {
    // Implementation for speed graph data logging
    // This would store speed history for the popup graph
}

// Get list of profiles
function getProfileList() {
    try {
        if (store && store.get) {
            const profiles = store.get('profiles');
            if (profiles && typeof profiles === 'object') {
                const profileNames = Object.keys(profiles);
                return profileNames.length > 0 ? profileNames : ['Default'];
            }
        }
        // Fallback to chrome.storage
        return new Promise(resolve => {
            chrome.storage.local.get(['profiles']).then(result => {
                const profiles = result.profiles;
                if (profiles && typeof profiles === 'object') {
                    const profileNames = Object.keys(profiles);
                    resolve(profileNames.length > 0 ? profileNames : ['Default']);
                } else {
                    resolve(['Default']);
                }
            }).catch(() => resolve(['Default']));
        });
    } catch (error) {
        console.error('Error getting profile list:', error);
        return ['Default'];
    }
}

// Message handling from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'addToSABnzbd':
            handleAddToSABnzbd(request).then(result => sendResponse(result));
            return true;
            
        case 'get_setting':
            chrome.storage.local.get([request.setting]).then(result => {
                sendResponse({ value: result[request.setting] });
            });
            return true;
            
        case 'refresh_data':
        case 'fetch_info':
            fetchInfo(request.quickUpdate || true, () => sendResponse({ success: true }));
            return true; // Keep message channel open for async response
            
        case 'test_basic_connection':
            testBasicConnectivity().then(result => {
                sendResponse({ success: result });
            });
            return true;
            
        case 'pause_download':
            pauseDownload(request.nzo_id).then(result => sendResponse(result));
            return true;
            
        case 'resume_download':
            resumeDownload(request.nzo_id).then(result => sendResponse(result));
            return true;
            
        case 'remove_download':
            removeDownload(request.nzo_id).then(result => sendResponse(result));
            return true;
            
        case 'set_speed_limit':
            setSpeedLimit(request.speed).then(result => sendResponse(result));
            return true;
            
        case 'pause_queue':
            pauseQueue(request.duration).then(result => sendResponse(result));
            return true;
            
        case 'resume_queue':
            console.log('=== RESUME_QUEUE message received ===');
            resumeQueue().then(result => {
                console.log('resumeQueue result:', result);
                sendResponse(result);
            });
            return true;
            
        case 'test_connection':
            testConnection(request.profile, () => sendResponse({ success: true }));
            return true;
            
        case 'reset_settings':
            resetSettings().then(() => sendResponse({ success: true }));
            return true;
            
        case 'restart_timer':
            startTimer();
            sendResponse({ success: true });
            return false;
            
        case 'setup_context_menu':
            setupContextMenus().then(() => sendResponse({ success: true }));
            return true;
            
        case 'get_profiles':
            try {
                const profiles = getProfileList();
                if (profiles instanceof Promise) {
                    profiles.then(result => sendResponse({ profiles: result }));
                    return true; // Keep message channel open for async response
                } else {
                    sendResponse({ profiles: profiles });
                    return false;
                }
            } catch (error) {
                console.error('Error getting profiles:', error);
                sendResponse({ error: error.message });
                return false;
            }
            
        case 'get_categories':
            try {
                // Use store to get categories or provide defaults
                chrome.storage.local.get(['user_categories']).then(result => {
                    let categories = result.user_categories;
                    if (!categories || !Array.isArray(categories)) {
                        categories = ['Default', 'Movies', 'TV', 'Music', 'Books', 'Software'];
                    }
                    sendResponse({ categories: categories });
                });
            } catch (error) {
                console.error('Error getting categories:', error);
                sendResponse({ error: error.message, categories: ['Default'] });
            }
            return true;
            
        default:
            sendResponse({ error: 'Unknown action' });
    }
});

// Handle add to SABnzbd requests from content scripts
async function handleAddToSABnzbd(request) {
    try {
        const profile = await getActiveProfile();
        if (!profile) {
            return { ret: 'error', data: { error: 'No active profile configured' } };
        }
        
        const apiUrl = constructApiUrl(profile);
        const postData = constructApiPost(profile);
        
        let requestBody = `${postData}&mode=addurl&name=${encodeURIComponent(request.nzburl)}`;
        
        if (request.nzbname) {
            requestBody += `&nzbname=${encodeURIComponent(request.nzbname)}`;
        }
        
        if (request.category) {
            requestBody += `&cat=${encodeURIComponent(request.category)}`;
        }
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: requestBody
        });
        
        if (response.ok) {
            const data = await response.json();
            return { ret: 'success', data: data };
        } else {
            return { ret: 'error', data: { error: `HTTP ${response.status}: ${response.statusText}` } };
        }
    } catch (error) {
        console.error('Error adding to SABnzbd:', error);
        return { ret: 'error', data: { error: error.message } };
    }
}

// Additional service worker functions
async function testConnection(profileValues, callback) {
    try {
        await fetchInfo(true, callback, profileValues);
    } catch (error) {
        console.error('Connection test failed:', error);
        if (callback) callback();
    }
}

async function resetSettings() {
    try {
        await chrome.storage.local.clear();
        await initializeSettings();
        console.log('Settings reset successfully');
    } catch (error) {
        console.error('Error resetting settings:', error);
    }
}

// SABnzbd control functions
async function pauseDownload(nzoId) {
    try {
        const profile = await getActiveProfile();
        const apiUrl = constructApiUrl(profile);
        const postData = constructApiPost(profile);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `${postData}&mode=queue&name=pause&value=${nzoId}`
        });
        
        return { success: response.ok };
    } catch (error) {
        console.error('Error pausing download:', error);
        return { success: false, error: error.message };
    }
}

async function resumeDownload(nzoId) {
    try {
        const profile = await getActiveProfile();
        const apiUrl = constructApiUrl(profile);
        const postData = constructApiPost(profile);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `${postData}&mode=queue&name=resume&value=${nzoId}`
        });
        
        return { success: response.ok };
    } catch (error) {
        console.error('Error resuming download:', error);
        return { success: false, error: error.message };
    }
}

async function removeDownload(nzoId) {
    try {
        const profile = await getActiveProfile();
        const apiUrl = constructApiUrl(profile);
        const postData = constructApiPost(profile);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `${postData}&mode=queue&name=delete&value=${nzoId}`
        });
        
        return { success: response.ok };
    } catch (error) {
        console.error('Error removing download:', error);
        return { success: false, error: error.message };
    }
}

async function setSpeedLimit(speed) {
    try {
        const profile = await getActiveProfile();
        const apiUrl = constructApiUrl(profile);
        const postData = constructApiPost(profile);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `${postData}&mode=config&name=speedlimit&value=${speed}`
        });
        
        return { success: response.ok };
    } catch (error) {
        console.error('Error setting speed limit:', error);
        return { success: false, error: error.message };
    }
}

// Pause/Resume queue functions
async function pauseQueue(duration) {
    try {
        const profile = await getActiveProfile();
        if (!profile) {
            return { success: false, error: 'No active profile' };
        }
        
        const apiUrl = constructApiUrl(profile);
        const postData = constructApiPost(profile);
        
        let requestBody;
        if (duration && typeof duration === "number") {
            // Pause for specific duration
            requestBody = `${postData}&mode=config&name=set_pause&value=${duration}`;
        } else {
            // Pause indefinitely
            requestBody = `${postData}&mode=pause`;
        }
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: requestBody
        });
        
        if (response.ok) {
            console.log('Queue paused successfully');
            // Update stored state
            await chrome.storage.local.set({ paused: true });
            // Refresh data to get updated state
            fetchInfo(true);
            return { success: true };
        } else {
            console.error('Failed to pause queue:', response.status);
            return { success: false, error: `HTTP ${response.status}` };
        }
    } catch (error) {
        console.error('Error pausing queue:', error);
        return { success: false, error: error.message };
    }
}

async function resumeQueue() {
    console.log('resumeQueue called');
    try {
        const profile = await getActiveProfile();
        if (!profile) {
            console.error('No active profile for resume');
            return { success: false, error: 'No active profile' };
        }
        
        console.log('Resume profile:', profile);
        
        const apiUrl = constructApiUrl(profile);
        const postData = constructApiPost(profile);
        const requestBody = `${postData}&mode=resume`;
        
        console.log('Resume API URL:', apiUrl);
        console.log('Resume request body:', requestBody);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: requestBody
        });
        
        console.log('Resume response status:', response.status);
        
        if (response.ok) {
            console.log('Queue resumed successfully');
            // Update stored state
            await chrome.storage.local.set({ paused: false });
            // Refresh data to get updated state
            fetchInfo(true);
            return { success: true };
        } else {
            const errorText = await response.text();
            console.error('Failed to resume queue:', response.status, errorText);
            return { success: false, error: `HTTP ${response.status}: ${errorText}` };
        }
    } catch (error) {
        console.error('Error resuming queue:', error);
        return { success: false, error: error.message };
    }
}

console.log('SABconnect++ service worker loaded');
