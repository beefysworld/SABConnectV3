// Test script for debugging resume queue issue
// Run this in the popup console to test

console.log('=== Testing Resume Queue ===');

// Test function to manually call resume
async function testResumeQueue() {
    console.log('Sending resume_queue message...');
    
    chrome.runtime.sendMessage({
        action: 'resume_queue'
    }, function(response) {
        console.log('Test resume response:', response);
        if (chrome.runtime.lastError) {
            console.error('Chrome runtime error:', chrome.runtime.lastError);
        }
    });
}

// Test function to check current paused state
async function checkPausedState() {
    const result = await chrome.storage.local.get(['paused']);
    console.log('Current paused state in storage:', result.paused);
    
    // Also check what SABnzbd reports
    chrome.runtime.sendMessage({
        action: 'refresh_data'
    }, function(response) {
        console.log('Refresh response:', response);
        setTimeout(async () => {
            const newResult = await chrome.storage.local.get(['paused']);
            console.log('Paused state after refresh:', newResult.paused);
        }, 1000);
    });
}

// Usage:
// testResumeQueue() - directly test resume
// checkPausedState() - check current state

console.log('Test functions loaded. Use testResumeQueue() and checkPausedState()');
