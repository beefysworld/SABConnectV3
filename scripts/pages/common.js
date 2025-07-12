var profiles = new ProfileManager();

// Simple Store class replacement using chrome.storage
class SimpleStore {
    constructor(namespace, defaults, something, callback) {
        this.namespace = namespace;
        this.defaults = defaults || {};
        this.initializeDefaults().then(() => {
            if (callback) callback();
        });
    }
    
    async initializeDefaults() {
        try {
            const existing = await chrome.storage.local.get(Object.keys(this.defaults));
            const toSet = {};
            
            for (const [key, defaultValue] of Object.entries(this.defaults)) {
                if (!(key in existing)) {
                    toSet[key] = defaultValue;
                }
            }
            
            if (Object.keys(toSet).length > 0) {
                await chrome.storage.local.set(toSet);
            }
        } catch (error) {
            console.error('Error initializing store defaults:', error);
        }
    }
    
    get(key) {
        // Try to use window.store as fallback if available but avoid recursion
        if (window.store && window.store._cache && window.store !== this) {
            // Use the cache directly to avoid recursion
            const cache = window.store._cache || {};
            if (key === 'profiles') {
                return cache.profiles || {};
            }
            if (key === 'active_profile') {
                return cache.active_profile || 'default';
            }
            return cache[key];
        }
        
        // This is synchronous in the original, but chrome.storage is async
        // We'll need to handle this differently in the calling code
        console.warn('get() called synchronously on SimpleStore, returning null. Use getAsync() instead.');
        return null;
    }
    
    async getAsync(key) {
        try {
            const result = await chrome.storage.local.get([key]);
            return result[key];
        } catch (error) {
            console.error('Error getting storage value:', error);
            return null;
        }
    }
    
    async set(key, value) {
        try {
            await chrome.storage.local.set({[key]: value});
        } catch (error) {
            console.error('Error setting storage value:', error);
        }
    }
}

var StoreClass = SimpleStore;

// Service worker messaging functions to replace background page access
function background() {
    // Return object with functions that send messages to service worker
    return {
        testConnection: function(profileValues, callback) {
            chrome.runtime.sendMessage({
                action: 'test_connection',
                profile: profileValues
            }, callback);
        },
        resetSettings: function() {
            chrome.runtime.sendMessage({action: 'reset_settings'});
        },
        restartTimer: function() {
            chrome.runtime.sendMessage({action: 'restart_timer'});
        },
        SetupContextMenu: function() {
            chrome.runtime.sendMessage({action: 'setup_context_menu'});
        },
        refresh: function() {
            chrome.runtime.sendMessage({action: 'refresh_data'});
        },
        fetchInfo: function(quickUpdate, callback) {
            chrome.runtime.sendMessage({
                action: 'fetch_info',
                quickUpdate: quickUpdate
            }, callback);
        },
        setMaxSpeed: function(speed, successCallback, errorCallback) {
            chrome.runtime.sendMessage({
                action: 'set_speed_limit',
                speed: speed
            }, function(response) {
                if (response && response.success) {
                    if (successCallback) successCallback();
                } else {
                    if (errorCallback) errorCallback();
                }
            });
        },
        getMaxSpeed: function(callback) {
            chrome.storage.local.get(['speedlimit']).then(result => {
                if (callback) callback(result);
            });
        }
    };
}

function activeProfile()
{
    return profiles.getActiveProfile().values;
}

function setPref(key, value) {
    // Use chrome.storage instead of localStorage
    chrome.storage.local.set({[key]: value});
    
    if (key == 'refresh_rate') {
        background().restartTimer();
    }
}

function getPref(key) {
    // This function needs to be updated to use chrome.storage
    // For now, maintain compatibility with StoreClass
    return store ? store.get(key) : null;
}

function checkEndSlash(input) {
	if (input.charAt(input.length-1) == '/') {
		return input;
	} else {
		var output = input+'/';
		return output;
	}
}

function constructApiUrl( profileValues ) {
	var profile = profileValues || activeProfile();
	return checkEndSlash( profile.url ) + 'api';
}

function constructApiPost( profileValues ) {
	var profile = profileValues || activeProfile();
	var data = {};
	
	var apikey = profile.api_key;
	if( apikey ) {
		data.apikey = apikey;
	}

	var username = profile.username;
	if( username ) {
		data.ma_username = username;
	}

	var password = profile.password;
	if( password ) {
		data.ma_password = password;
	}
	
	return data;
}

function getRefreshRate()
{
	return parseInt( background().store.get( 'config_refresh_rate' ) ) * 1000;
}

/// Used to merge two associative arrays.
function combine( dst, src )
{
	for( var property in src ) {
		if( src.hasOwnProperty( property ) ) {
			dst[property] = src[property];
		}
	}
	
	return dst;
}