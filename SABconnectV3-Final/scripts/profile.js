// Profile Manager for SABconnect++
// Add compatibility shim for store access
function getStore() {
    // Try to use the global store, fallback to a basic implementation
    if (typeof store !== 'undefined' && store.get) {
        return store;
    }
    
    // Fallback store implementation
    return {
        get: function(key) {
            if (key === 'profiles') {
                return {};
            }
            if (key === 'active_profile') {
                return 'default';
            }
            return null;
        },
        set: function(key, value) {
            console.warn('Store.set called but no store available:', key, value);
        }
    };
}

function ProfileManager()
{
}

ProfileManager.prototype.count = function()
{
	const store = getStore();
	const profiles = store.get('profiles');
	return profiles ? Object.keys(profiles).length : 0;
}

ProfileManager.prototype.add = function( profileName, values )
{
	const store = getStore();
	var profiles = store.get( 'profiles' ) || {};
	if(typeof profiles == "object" && profiles.hasOwnProperty( profileName ) ) {
		throw 'already_exists';
	}
	
	profiles[profileName] = values;
	this.saveProfiles(profiles);
}

ProfileManager.prototype.edit = function( profileName, values, newProfileName )
{
	const store = getStore();
	var profiles = store.get( 'profiles' ) || {};
	
	if( !profiles[profileName] ) {
		throw 'profile_missing';
	}
	
	if( profileName != newProfileName ) {
		if( profiles.hasOwnProperty( newProfileName ) ) {
			throw 'renamed_exists';
		}
		
		delete profiles[profileName];
		profileName = newProfileName;
	}
	
	profiles[profileName] = values;
	this.saveProfiles(profiles);
}

ProfileManager.prototype.remove = function( profileName )
{
	const store = getStore();
	var profiles = store.get( 'profiles' ) || {};
	if( !profiles.hasOwnProperty( profileName ) ) {
		throw 'profile_missing';
	}
	
	delete profiles[profileName];
	this.saveProfiles(profiles);
	
	var newActive = first( profiles );
	this.setActiveProfile( newActive );
	return newActive;
}

ProfileManager.prototype.setProfile = function( profileData )
{
	const store = getStore();
	var profiles = store.get( 'profiles' ) || {};
	profiles[profileData.name] = profileData.values;
	this.saveProfiles(profiles);
}

ProfileManager.prototype.getProfile = function( profileName )
{
	if( !profileName ) {
		return null;
	}
	
	const store = getStore();
	var profiles = store.get( 'profiles' ) || {};
	var profile = profiles[profileName];
	
	if( !profile ) {
		return null;
	}
	
	var password = getPref("profile_pass" + profileName);
	if(password === null || password === "null" || typeof password == "undefined") {
		password = "";
	}
	profiles[profileName]["password"] = password;
	
	return {
		'name': profileName,
		'values': profiles[profileName]
	};
}

ProfileManager.prototype.getActiveProfile = function()
{
	var profileName = getPref( 'active_profile' );
	return this.getProfile( profileName );
}

ProfileManager.prototype.getFirstProfile = function()
{
	const store = getStore();
	var profiles = store.get( 'profiles' ) || {};
	var profileName = first( profiles );
	return this.getProfile( profileName );
}

ProfileManager.prototype.setActiveProfile = function( profileName )
{
	setPref( 'active_profile', profileName );
}

ProfileManager.prototype.contains = function( profileName )
{
	const store = getStore();
	var profiles = store.get( 'profiles' ) || {};
	return profiles.hasOwnProperty( profileName );
}

ProfileManager.prototype.saveProfiles = function(profiles) {
	//discard passwords
	for(var profileName in profiles) {
		var profile = profiles[profileName];
		if(profile.hasOwnProperty("password")) {
			setPref("profile_pass" + profileName, profile.password);
			delete profile.password;
		}
	}
	const store = getStore();
	store.set( 'profiles', profiles );
}