// Helper function for chrome.storage access
async function getStorageValue(key) {
    try {
        const result = await chrome.storage.local.get([key]);
        return result[key];
    } catch (error) {
        console.error(`Error getting storage value for ${key}:`, error);
        return null;
    }
}

// Use chrome.storage instead of direct background page access
var store;
var isInitializing = false; // Prevent recursive initialization
var isStoreReady = false;
var isUIInitialized = false; // Prevent duplicate UI initialization

function storeReady_popup() {
    console.log('storeReady_popup called, current state - isInitializing:', isInitializing, 'isStoreReady:', isStoreReady);
    
    if (isInitializing || isStoreReady) {
        console.warn('storeReady_popup already running or completed, preventing recursion');
        return;
    }
    
    // Set flags immediately to prevent any re-entry
    isInitializing = true;
    
    console.log('Store ready callback called');
    
    // Ensure store is available
    if (typeof store === 'undefined' || !store) {
        console.error('Store not available, using fallback');
        // Use window.store as fallback
        if (window.store) {
            store = window.store;
        } else {
            console.error('No store available at all');
            isInitializing = false;
            return;
        }
    }
    
    try {
        var nowtime = new Date();
        chrome.storage.local.get(['lastOpened']).then(async result => {
            try {
                var lastOpened = parseInt(result.lastOpened || 0);
                var closeWindow = false;
                if (lastOpened > 0) {
                    if (nowtime.getTime() - lastOpened < 700) { 
                        // Get SABnzbd URL from storage instead of activeProfile()
                        const settings = await chrome.storage.local.get(['sabnzbd_url']);
                        const url = settings.sabnzbd_url || 'http://localhost:8080/';
                        chrome.tabs.create({url: url});
                        closeWindow = true;
                        window.close();
                        return;
                    }
                }
                if (!closeWindow) {
                    chrome.storage.local.set({lastOpened: nowtime.getTime()});
                    
                    // Initialize the popup UI if document is ready
                    if (document.readyState === 'complete' || document.readyState === 'interactive') {
                        initializePopupUI();
                    }
                    
                    await SetupTogglePause();
                    refresh(); // Get fresh data from SABnzbd
                    reDrawPopup(); // This is now async but doesn't need await here
                }
            } catch (error) {
                console.error('Error in popup initialization:', error);
            } finally {
                isInitializing = false;
                isStoreReady = true;
            }
        }).catch(error => {
            console.error('Error getting lastOpened:', error);
            isInitializing = false;
            isStoreReady = true;
        });
    } catch (error) {
        console.error('Error in storeReady_popup:', error);
        isInitializing = false;
        isStoreReady = true;
    }
}

// Initialize store safely
try {
    // Try to create the StoreClass, but don't let it cause recursion
    if (typeof StoreClass === 'function') {
        store = new StoreClass('settings', {}, undefined, storeReady_popup);
    } else {
        throw new Error('StoreClass not available');
    }
} catch (error) {
    console.error('Error creating store:', error);
    // Fallback to window.store if available
    if (window.store) {
        store = window.store;
        console.log('Using window.store as fallback');
        // Don't call storeReady_popup immediately, wait for DOM ready
        setTimeout(() => {
            if (!isInitializing && !isStoreReady) {
                console.log('Calling storeReady_popup from fallback timeout');
                storeReady_popup();
            }
        }, 200);
    } else {
        console.error('No store available at all');
        // Create a minimal store to prevent errors
        store = {
            get: function(key) { 
                console.warn('Using minimal store fallback for get:', key);
                return null; 
            },
            set: function(key, value) { 
                console.warn('Using minimal store fallback for set:', key, value);
                chrome.storage.local.set({[key]: value}).catch(console.error);
            }
        };
    }
}

// Set up event handlers and initialize popup when ready
$(document).ready(function() {
    console.log('Document ready, setting up popup...');
    
    // If store is already ready, initialize immediately
    if (isStoreReady && !isInitializing) {
        console.log('Store already ready, initializing UI...');
        initializePopupUI();
    }
});

function initializePopupUI() {
    if (isUIInitialized) {
        console.log('UI already initialized, skipping...');
        return;
    }
    
    console.log('Initializing popup UI...');
    isUIInitialized = true;
    
    $('#open_sabnzbd').click( async function() {
        try {
            // Get the SABnzbd URL from storage
            const result = await chrome.storage.local.get(['sabnzbd_url']);
            const url = result.sabnzbd_url || 'http://localhost:8080/';
            chrome.tabs.create({ url: url });
        } catch (error) {
            console.error('Error opening SABnzbd:', error);
            // Fallback to default URL
            chrome.tabs.create({ url: 'http://localhost:8080/' });
        }
    });

    $('#extension_settings').click( function() {
        chrome.tabs.create({url: 'simple-settings.html'});
    });

    $('#refresh').click( function() {
        refresh();
    });

    $('#set-speed').click( function() {
        setMaxSpeed( $('#speed-input').val() );
    });

	$('#speed-input').keydown( function( event ) {
		var code = event.keyCode || event.which;
		if( code == 13 ) { // Enter pressed
			setMaxSpeed( $('#speed-input').val() );
		}
	});

	try {
		populateProfileList();

		// Get active profile using async storage instead of ProfileManager
		chrome.storage.local.get(['active_profile']).then(result => {
			const activeProfileName = result.active_profile || 'default';
			if (activeProfileName) {
				$('#profiles').val(activeProfileName);
			}
		}).catch(profileError => {
			console.warn('Could not get active profile:', profileError);
		});
		
		$('#profiles').change( OnProfileChanged );

		// Check if user categories are enabled using async storage
		chrome.storage.local.get(['config_use_user_categories']).then(result => {
			if (result.config_use_user_categories) {
				$('#user_category').css("display", "block");
				try {
					populateAndSetCategoryList();
				} catch (error) {
					console.error('Error populating category list:', error);
					// Hide the category section if it fails
					$('#user_category').css("display", "none");
				}
			}
		}).catch(error => {
			console.warn('Error checking user categories setting:', error);
		});
	} catch (error) {
		console.error('Error in popup initialization:', error);
	}

	setMaxSpeedText();
}

function refresh()
{
    console.log('=== refresh() called ===');
    // Send message to service worker instead of calling background page directly
    chrome.runtime.sendMessage({action: 'refresh_data'}, function(response) {
        console.log('Refresh response:', response);
        if (response && response.success) {
            console.log('Refresh successful, calling reDrawPopup');
            reDrawPopup(); // Call async function
        } else {
            console.error('Failed to refresh data');
            reDrawPopup(); // Still try to redraw with cached data
        }
    });
}

function setMaxSpeedText()
{
    getMaxSpeed( function( data ) {
        $('#speed-input').val( data ? data.speedlimit : '' );
    });
}

/// @param speed Maximum speed in KBps
function setMaxSpeed( speed )
{
    chrome.runtime.sendMessage({
        action: 'set_speed_limit', 
        speed: speed
    }, function(response) {
        if (response && response.success) {
            setMaxSpeedText();
        } else {
            alert( 'Failed to set max speed.' );
        }
    });
}

function getMaxSpeed( success_callback )
{
    // Get from storage instead of background page
    chrome.storage.local.get(['speedlimit']).then(result => {
        if (success_callback) {
            success_callback(result.speedlimit || '');
        }
    });
}

function moveQueueItem(nzoid, pos)
{
	var sabApiUrl = constructApiUrl();
	var data = constructApiPost();
	data.mode = 'switch';
	data.value = nzoid;
	data.value2 = pos;

	$.ajax({
		type: "POST",
		url: sabApiUrl,
		data: data,
		username: activeProfile().username,
		password: activeProfile().password,
		success: function(data) { refresh() },
		error: function() {
			$('#error').html('Failed to move item, please check your connection to SABnzbd');
		}
	});
}

function queueItemAction(action, nzoid, callback)
{
    if (action === 'pause') {
        chrome.runtime.sendMessage({
            action: 'pause_download',
            nzo_id: nzoid
        }, function(response) {
            if (response && response.success) {
                refresh();
            } else {
                $('#error').html('Failed to pause item, please check your connection to SABnzbd');
            }
            if (callback) callback(response);
        });
    } else if (action === 'resume') {
        chrome.runtime.sendMessage({
            action: 'resume_download',
            nzo_id: nzoid
        }, function(response) {
            if (response && response.success) {
                refresh();
            } else {
                $('#error').html('Failed to resume item, please check your connection to SABnzbd');
            }
            if (callback) callback(response);
        });
    } else if (action === 'delete') {
        chrome.runtime.sendMessage({
            action: 'remove_download', 
            nzo_id: nzoid
        }, function(response) {
            if (response && response.success) {
                refresh();
            } else {
                $('#error').html('Failed to remove item, please check your connection to SABnzbd');
            }
            if (callback) callback(response);
        });
    } else {
        // Fall back to direct API call for other actions
        var sabApiUrl = constructApiUrl();
        var data = constructApiPost();
        data.mode = 'queue';
        data.name = action;
        data.value = nzoid;	

        $.ajax({
            type: "POST",
            url: sabApiUrl,
            data: data,
            username: activeProfile().username,
            password: activeProfile().password,
            success: function(data) { 
                refresh();
                if (callback) callback({success: true});
            },
            error: function() {
                $('#error').html('Failed to perform action, please check your connection to SABnzbd');
                if (callback) callback({success: false});
            }
        });
    }
}

var paused = false;
var oldPos = -1;

function durationPause(e) {
	var val = parseInt($(this).val());
	if(isNaN(val)) {
		val = parseInt(window.prompt("Duration (minutes)"));
	}
	if(val > 0) {
		togglePause(val); // This is now async but we don't need to await here
	} else {
		$(this).val(0);
	}
}

async function togglePause(duration) {	
    console.log('=== togglePause called with duration:', duration);
    
    // Get current paused state from storage
    const currentPaused = await getStorageValue('paused');
    console.log('Raw paused value from storage:', currentPaused, 'type:', typeof currentPaused);
    
    const wasPaused = currentPaused === true || currentPaused === 'true' || currentPaused === 1;
    const mode = wasPaused ? 'resume' : 'pause';
    const action = mode + '_queue';
    
    console.log('Toggle pause - current state:', wasPaused, 'action:', action, 'duration:', duration);
    
    // Send message to service worker to handle pause/resume
    chrome.runtime.sendMessage({
        action: action,
        duration: duration
    }, function(response) {
        console.log('Toggle response:', response);
        if (chrome.runtime.lastError) {
            console.error('Chrome runtime error:', chrome.runtime.lastError);
        }
        
        if (response && response.success) {
            console.log('Queue action successful, refreshing data');
            
            // Refresh the pause button immediately to show new state
            setTimeout(async () => {
                await refreshPauseButton();
                refresh(); // Also refresh the data
            }, 100);
        } else {
            console.error('Failed to toggle pause:', response);
        }
    });
}

// Initialize pause state tracking
function initializePauseStateTracking() {
    if (typeof window.lastKnownPausedState === 'undefined') {
        getStorageValue('paused').then(initialPaused => {
            window.lastKnownPausedState = initialPaused === true || initialPaused === 'true' || initialPaused === 1;
            console.log('Initialized pause state tracking:', window.lastKnownPausedState);
        });
    }
}

async function refreshPauseButton() {
    console.log('Refreshing pause button...');
    
    // Get current paused state from storage
    const currentPaused = await getStorageValue('paused');
    const isPaused = currentPaused === true || currentPaused === 'true' || currentPaused === 1;
    
    console.log('Current paused state for button:', isPaused);
    
    // Update global paused variable
    paused = isPaused;
    
    // Determine button message and image
    let msg, imgSrc;
    if (isPaused) {
        imgSrc = chrome.runtime.getURL('images/control_play.png');
        msg = 'Resume Queue';
    } else {
        imgSrc = chrome.runtime.getURL('images/control_pause.png');
        msg = 'Pause Queue';
    }
    
    // Remove existing pause button and rebuild
    $('#togglePause').remove();
    
    // Rebuild pause section
    const newPauseDiv = buildPauseDiv(msg, isPaused);
    
    // Find the hr element before the pause section and add after it
    const hrElements = $(".menu hr");
    if (hrElements.length > 0) {
        $(hrElements[0]).after(newPauseDiv);
    } else {
        $(".menu").prepend("<hr>", newPauseDiv);
    }
    
    // Re-attach click handler
    $(".menu").off("click", "#togglePause").on("click", "#togglePause", function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const duration = paused ? 0 : (parseInt($("#pause-duration").val()) || 0);
        console.log('Queue toggle clicked, duration:', duration, 'current paused state:', paused);
        
        togglePause(duration);
    });
    
    console.log('Pause button refreshed to:', msg);
}

async function SetupTogglePause() {
    // Get current paused state from storage
    const result = await chrome.storage.local.get(['paused']);
    paused = result.paused || false;

    if (paused) {
        var playImg = chrome.runtime.getURL('images/control_play.png');
        var img = '<img src="' + playImg +'" />';
        var msg = 'Resume Queue';
    } else {
        var pauseImg = chrome.runtime.getURL('images/control_pause.png');
        var img = '<img src="' + pauseImg +'" />';
        var msg = 'Pause Queue';
    }
    
    $(".menu").prepend("<hr>", buildPauseDiv(msg));
    
    $(".menu").on("click", "select", function(e) { e.stopPropagation(); });
    $(".menu").on("change", "#pause-duration", durationPause);
    $(".menu").on("click", "#togglePause", function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // For resume, duration is not needed (or should be 0)
        // For pause, get duration from dropdown if available
        const duration = paused ? 0 : (parseInt($("#pause-duration").val()) || 0);
        console.log('Queue toggle clicked, duration:', duration, 'current paused state:', paused);
        
        togglePause(duration);
    });
}

function buildPauseDiv(msg, overridePaused) {
	var pauseState = overridePaused;
	if(typeof pauseState == "undefined") {
		pauseState = paused; // Use the global paused variable instead of getPref
	}
	var $div = $("<div id='togglePause'><span style='float:none;'>"+ msg +" </span></div>");
	
	// Only show duration dropdown when we're about to PAUSE (not resume)
	// pauseState = true means currently paused, so we're showing "Resume" - no dropdown
	// pauseState = false means currently running, so we're showing "Pause" - show dropdown
	if(!pauseState) {
		var selectDuration = $("<select id='pause-duration'></select>");
		var durations = {
			0:		"&#8734;",
			5:		"5 minutes",
			15:		"15 minutes",
			30:		"30 minutes",
			60: 	"1 hour",
			180:	"3 hours",
			360:	"6 hours",
			NaN:	"Other..."
		}
		for(var minutes in durations) {
			var intMinutes = parseInt(minutes);
			selectDuration.append($("<option value='"+ intMinutes +"'>"+durations[minutes]+"</option>"));
		}
		
		$div.append(selectDuration);
	}
	
	return $div;
}

function getSortItemPos(id) {
	var list = $('ul#sab-queue').sortable('toArray');
	var pos = -1;
	
	$.each(list, function(i, item) {
		if(item == id) {
			pos = i;
		}
	});
	
	return pos;
}

async function reDrawPopup() {
    console.log('=== reDrawPopup called ===');
    
    // Initialize pause state tracking if not already done
    initializePauseStateTracking();
    
    // If we do not want to redraw (such as in the middle of a drag and drop event, then skip
    const skipRedraw = await getStorageValue('skip_redraw');
    if(skipRedraw == '1') {
        console.log('Skipping redraw due to skip_redraw flag');
        return;
    }

    const error = await getStorageValue('error');
    console.log('Error from storage:', error);
    if(error) {
        $('#sab-errors').html('<div id="errors-container">' + error + '</div>');
    } else {
        // No errors, remove anything that could have been here
        // If the refresh rate is too low, will cause no errors to be ever seen
        $('#sab-errors').html('');
    }

    // Make sure the current queue is clear
    $('ul#sab-queue').html('');

    const paused = await getStorageValue('paused');
    console.log('Paused from storage:', paused);

    const fields = ['status', 'paused', 'timeleft', 'speed', 'sizeleft', 'paused_jobs'];
    
    for (const field of fields) {
        const value = await getStorageValue(field);
        console.log(`Storage value for ${field}:`, value);
        $('#sab-' + field).html(value || '');
    }
    
    const status = await getStorageValue('status');
    console.log('Status from storage:', status);
    $('#sab-status').removeClass().addClass(status || '');
    
    if(paused) {
        const remaining = await getStorageValue("pause_int");
        if(remaining == 0) { //"0"
			$("#sab-timeleft").html("&#8734;");
		} else {
			$("#sab-timeleft").html(remaining);
		}
	}
	
	// Check if pause button needs to be updated
	const currentButtonPaused = paused === true || paused === 'true' || paused === 1;
	if (window.lastKnownPausedState !== currentButtonPaused) {
	    console.log('Pause state changed, refreshing button. Old:', window.lastKnownPausedState, 'New:', currentButtonPaused);
	    window.lastKnownPausedState = currentButtonPaused;
	    await refreshPauseButton();
	}
	
	var data = {
		'playImg':chrome.runtime.getURL('images/control_play.png'),
		'pauseImg':chrome.runtime.getURL('images/control_pause.png'),
		'deleteImg':chrome.runtime.getURL('images/control_cancel.png')
	};
	
	// Grab a list of jobs (array of slot objects from the json API)
	const queueData = await getStorageValue("queue");
	var jobs = [];
	if (queueData) {
		try {
			jobs = JSON.parse(queueData);
		} catch (e) {
			console.error('Error parsing queue data:', e);
			jobs = [];
		}
	}
	
	console.log('Queue jobs:', jobs);
	
	$.each(jobs, function(i, slot) {
	    // Replaced jqote, which doesn't work in Chrome extensions, when using manifest v2.
		var el = '<li id="' + slot.nzo_id + '" class="item">'
		    + '<div class="file-' + slot.status + ' filename">' + slot.filename + '</div>'
		    + '<div class="controls">';
		if ( slot.status == "Paused" ) {
		    el += '<a class="resumeItem lowOpacity" href=""><img src="' + data.playImg + '" /></a>';
	    } else {
		    el += '<a class="pauseItem lowOpacity" href=""><img src="' + data.pauseImg + '" /></a>';
	    }
	    el += '<a class="deleteItem lowOpacity" href=""><img src="' + data.deleteImg + '" /></a>'
        	+ '</div>'
        	+ '<div class="float-fix"></div>';
        if (slot.percentage != "0") {
            el += '<div class="progressBarContainer"><div class="progressBarInner" style="width:' + slot.percentage + '%"></div></div>';
        }
        el += '</li>';

		$(el).appendTo($('#sab-queue'));
	});
	
	// The controls are low transparency until the user hovers over the parent item
	$(".item").hover(
		function () {
			// Restore opacity to full
			$(this).find('.lowOpacity').addClass('fullOpacity').removeClass('lowOpacity');
		}, 
		function () {
			// Set opacity to 20%
			$(this).find('.fullOpacity').addClass('lowOpacity').removeClass('fullOpacity');
		}
	);
	/*
	// The controls are low transparency until the user hovers over the parent item
	$(".filename").hover(
		function () {
			// Restore opacity to full
			$(this).closest('li').addClass('highlight')
		}, 
		function () {
			// Set opacity to 20%
			$(this).closest('li').removeClass('highlight')
		}
	);   */ 
	// The controls are low transparency until the user hovers over the parent item
	$(".item").hover(
		function () {
			// Restore opacity to full
			$(this).addClass('highlight');
		}, 
		function () {
			// Set opacity to 20%
			$(this).removeClass('highlight');
		}
	);
	
	// Make the ul sortable (only in the y axis)
	$("ul#sab-queue").sortable({ axis: 'y' });
	$("ul#sab-queue").disableSelection();
	
	// Cache the position when we start sorting
	$('ul#sab-queue').bind('sortstart', function(event, ui) {
		// Skip queue redrawing for the duration of the sort
		chrome.storage.local.set({'skip_redraw': '1'});
		var id = $(ui.item).attr('id');
		oldPos = getSortItemPos(id);
	});
	
	// When the sorting has finished, do a SABnzbd api call
	$('ul#sab-queue').bind('sortstop', function(event, ui) {
		chrome.storage.local.set({'skip_redraw': '0'});
		var id = $(ui.item).attr('id');
		var pos = getSortItemPos(id);
		// Make sure it has actually moved position
		if(pos == oldPos) return;
		// Position has moved, send off a SABnzbd api call
		moveQueueItem(id, pos);
	});
	
	// Do these need to be .live()?
	$('.resumeItem').click(function() {
		var id = $(this).closest('li.item').attr('id');
		queueItemAction('resume', id, reDrawPopup);
		
		return false;
	});
	
	$('.pauseItem').click(function() {
		var id = $(this).closest('li.item').attr('id');
		queueItemAction('pause', id, reDrawPopup);
		
		return false;
	});	
	
	$('.deleteItem').click(function() {
		var li = $(this).closest('li.item');
		var id = li.attr('id');
		// Delete the li element (mainly for user feedback). If they choose to open the popup again
		// before the delete and redraw have taken place the item will show. Really needs removing from 'queue' object (preference)
		li.remove();
		queueItemAction('delete', id, reDrawPopup);
		
		return false;
	});
	
	// Hide graph by default and only show if explicitly enabled
	$('#graph').hide();
	
	// Check graph setting asynchronously
	chrome.storage.local.get(['config_enable_graph', 'speedlog']).then(result => {
		if( result.config_enable_graph == '1' ) {
			var speedlog = result.speedlog;
			var line1 = [0];
			if(typeof speedlog != "undefined" && speedlog) {
				try {
					line1 = JSON.parse(speedlog);
				} catch (e) {
					console.warn('Error parsing speedlog:', e);
					line1 = [0];
				}
			}
			if (line1.sum() == 0 || status == 'Idle') {
			    $('#graph').hide();
			} else {
			    $('#graph').html('');
			    $('#graph').show();
			    $('body').css({height: 'none'});
			    $('html').css({height: 'none'});
    		var plot1 = $.jqplot('graph', [line1], {
    		    seriesColors: ['#696'],
                axes: {yaxis: {min: 0}, xaxis: {min: 1, max: 10, numberTicks: 5, tickOptions: {showLabel: false}}},
                seriesDefaults: { 
                    fill: true,
                    fillAndStroke: true,
                    fillColor: '#ADA',
                    showMarker: false,
                    pointLabels: { show: false } 
                },
                grid: {
                    drawGridLines: false,
                    gridLineColor: '#FFF',
                    shadow: false,
                    background: '#FFF',
                    borderWidth: 0.2
                }
            });
		}
	}
	}).catch(error => {
		console.warn('Error checking graph setting:', error);
	});
	
    var newHeight = $('#sabInfo').height() + $('.menu').height() + 28;
    $('body').css({height: newHeight+'px'});
    $('html').css({height: newHeight+'px'});
}

Array.prototype.sum = function() {
    return this.reduce(function(a,b){return a+b;});
}

function OnProfileChanged( event )
{
	var profileName = event.target.value;
	profiles.setActiveProfile( profileName );
	
	var tabs = chrome.runtime.getViews( {type: 'tab'} );
	for( var t in tabs ) {
		var tab = tabs[t];
		if( tab.is_sabconnect_settings ) {
			tab.changeActiveProfile( profileName );
		}
	}
	
	setMaxSpeedText();
	refresh();
}

function populateProfileList()
{
	// Use async storage access
	chrome.storage.local.get(['profiles']).then(result => {
		const profiles = result.profiles || {};
		for( var p in profiles ) {
			$('#profiles').append(
	            $('<option>').attr({
	    			value: p,
	    			text: p
	    		}).html(p)
			);
		}
	}).catch(error => {
		console.warn('Error loading profiles:', error);
	});
}

function OnCategoryChanged(event)
{
    var categoryName = event.target.value;
    // Use async storage instead of store.set
    chrome.storage.local.set({'active_category': categoryName}).catch(error => {
        console.warn('Error saving active category:', error);
    });

    setMaxSpeedText();
    refresh();
}

function populateAndSetCategoryList()
{
    // Prevent infinite recursion
    if (populateAndSetCategoryList._running) {
        console.warn('populateAndSetCategoryList already running, skipping');
        return;
    }
    populateAndSetCategoryList._running = true;
    
    try {
        var params = {
            action: 'get_categories'
        }
        chrome.runtime.sendMessage(params, function(data) {
            try {
                if (data && data.categories && Array.isArray(data.categories)) {
                    // Clear existing options first
                    $('#userCategory').empty();
                    $('#userCategory').append('<option value="">Select Category</option>');
                    
                    for (i = 0; i < data.categories.length; i++) {
                        var cat = '<option value="' + data.categories[i] + '">' + data.categories[i] + '</option>';
                        $('#userCategory').append(cat);
                    }
                    // Set active category using async storage
                    chrome.storage.local.get(['active_category']).then(result => {
                        if (result.active_category) {
                            $('#userCategory').val(result.active_category);
                        }
                    }).catch(error => {
                        console.warn('Error getting active category:', error);
                    });
                    $('#userCategory').change(OnCategoryChanged);
                } else {
                    console.warn('Invalid categories data received:', data);
                }
            } catch (error) {
                console.error('Error processing categories:', error);
            } finally {
                populateAndSetCategoryList._running = false;
            }
        });
    } catch (error) {
        console.error('Error sending categories message:', error);
        populateAndSetCategoryList._running = false;
    }
}
