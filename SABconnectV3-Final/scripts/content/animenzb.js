function addToSABnzbdFromAnimenzb() {
	var addLink = this;
	
	// Set the image to an in-progress image
	var img = chrome.runtime.getURL('images/content_icon_fetching.png');
	var nzburl = this.href;

	var category = null;
	try {
		category = this.parent().parent().find('td > a > img').first().attr('alt').toLowerCase();
	} catch (ex) { }
        $(this).find('img').first().attr('src', img);
	addToSABnzbd(addLink, nzburl, "addurl", null, category);

	return false;
}


function handleAllDownloadLinks() {
        // Find all Table Rows - $('td.file > a[type="application/x-nzb"]').parent().parent()
        // Find all Download links - $('td.file > a[type="application/x-nzb"]')
	$('td.file > a[type="application/x-nzb"]').each(function() {
		var img = chrome.runtime.getURL('/images/content_icon.png');
		var href = $(this).attr('href');
		var link = '<a class="addSABnzbd" href="' + href + '"><img title="Send to SABnzbd" src="' + img + '" /></a>&nbsp;';
		$(this).before(link);
		$(this).parent().find('a[class="addSABnzbd"]').first().click(addToSABnzbdFromAnimenzb);
	});
}

Initialize( 'animenzb', null, function() {
	handleAllDownloadLinks();
});
