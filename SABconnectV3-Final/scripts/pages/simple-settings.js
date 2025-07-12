// Simple settings page for SABconnectV3

// Load current settings when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Settings page loaded');
    loadSettings();
    
    // Add event listeners to buttons
    const testBtn = document.getElementById('test-connection-btn');
    const saveBtn = document.getElementById('save-settings-btn');
    
    if (testBtn && saveBtn) {
        testBtn.addEventListener('click', testConnection);
        saveBtn.addEventListener('click', saveSettings);
        console.log('Event listeners attached successfully');
    } else {
        console.error('Could not find buttons:', { testBtn, saveBtn });
    }
});

async function loadSettings() {
    try {
        const settings = await chrome.storage.local.get([
            'sabnzbd_url',
            'sabnzbd_api_key', 
            'sabnzbd_username'
        ]);
        
        document.getElementById('sabnzbd-url').value = settings.sabnzbd_url || 'http://localhost:8080/';
        document.getElementById('api-key').value = settings.sabnzbd_api_key || '';
        document.getElementById('username').value = settings.sabnzbd_username || '';
        // Don't pre-fill password for security
        
        console.log('Settings loaded:', settings);
    } catch (error) {
        console.error('Error loading settings:', error);
        showResult('Error loading settings: ' + error.message, 'error');
    }
}

async function saveSettings() {
    try {
        const settings = {
            sabnzbd_url: document.getElementById('sabnzbd-url').value,
            sabnzbd_api_key: document.getElementById('api-key').value,
            sabnzbd_username: document.getElementById('username').value,
        };
        
        // Only save password if provided
        const password = document.getElementById('password').value;
        if (password) {
            settings.sabnzbd_password = password;
        }
        
        await chrome.storage.local.set(settings);
        
        console.log('Settings saved:', settings);
        showResult('Settings saved successfully!', 'success');
        
        // Also create a simple profile for compatibility
        const profile = {
            url: settings.sabnzbd_url,
            api_key: settings.sabnzbd_api_key,
            username: settings.sabnzbd_username,
            password: password || ''
        };
        
        await chrome.storage.local.set({
            profiles: { 'default': profile },
            active_profile: 'default'
        });
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showResult('Error saving settings: ' + error.message, 'error');
    }
}

async function testConnection() {
    showResult('Testing connection...', 'info');
    
    try {
        // Get current form values
        const url = document.getElementById('sabnzbd-url').value;
        const apiKey = document.getElementById('api-key').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (!url) {
            showResult('Please enter a SABnzbd URL', 'error');
            return;
        }
        
        // Create test profile
        const testProfile = {
            url: url,
            api_key: apiKey,
            username: username,
            password: password
        };
        
        // Try to connect
        const apiUrl = constructApiUrl(testProfile);
        const postData = constructApiPost(testProfile);
        
        console.log('Testing connection to:', apiUrl);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `${postData}&mode=version&output=json`,
            mode: 'cors'
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Connection test response:', data);
            
            if (data.version) {
                showResult(`✅ Connection successful! SABnzbd version: ${data.version}`, 'success');
            } else {
                showResult('✅ Connection successful, but unexpected response format', 'success');
            }
        } else {
            showResult(`❌ Connection failed: HTTP ${response.status} ${response.statusText}`, 'error');
        }
        
    } catch (error) {
        console.error('Connection test error:', error);
        
        let message = '❌ Connection failed: ';
        if (error.message.includes('Failed to fetch')) {
            message += 'Cannot connect to SABnzbd. Make sure it\'s running and the URL is correct.';
        } else {
            message += error.message;
        }
        
        showResult(message, 'error');
    }
}

function showResult(message, type) {
    const resultDiv = document.getElementById('test-result');
    resultDiv.textContent = message;
    resultDiv.className = `test-result ${type}`;
    resultDiv.style.display = 'block';
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            resultDiv.style.display = 'none';
        }, 5000);
    }
}

// Helper functions (copied from service worker)
function checkEndSlash(url) {
    if (!url) return '';
    return url.endsWith('/') ? url : url + '/';
}

function constructApiUrl(profile) {
    return checkEndSlash(profile.url) + 'api';
}

function constructApiPost(profile) {
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
