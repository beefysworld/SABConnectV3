# SABnzbd CORS Configuration for Chrome Extension

Since Chrome Web Store extensions cannot request localhost permissions, you need to configure SABnzbd to allow CORS requests from browser extensions.

## SABnzbd Configuration

1. **Open SABnzbd Web Interface**
2. **Go to Config → General**
3. **Find the "CORS" or "Cross-Origin Resource Sharing" section**
4. **Add the following to allowed origins:**
   ```
   chrome-extension://*
   ```

## Alternative: Enable SABnzbd+ API Access

If CORS doesn't work, you can also:

1. **Go to Config → General → Security**
2. **Set "External internet access" to "Full access"**
3. **Ensure "Enable API" is checked**
4. **Note your API key**

## For Local Development

If you're running this extension locally (not from Chrome Web Store):
1. Load as unpacked extension
2. The extension can access localhost directly
3. No additional configuration needed

## Troubleshooting

If you still can't connect:
1. Check SABnzbd is running
2. Verify the URL in extension settings
3. Ensure SABnzbd API is enabled
4. Check firewall settings
5. Try accessing SABnzbd web interface directly first
