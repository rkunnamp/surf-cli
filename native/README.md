# Surf Native Messaging Host

Native messaging host that bridges pi-coding-agent to the Chrome extension via Unix socket.

## Architecture

```
Pi-Agent → Unix Socket (/tmp/surf.sock) → Native Host (host.cjs) → Chrome Native Messaging → Extension
```

## Files

| File | Purpose |
|------|---------|
| `host.cjs` | Main native host with socket server and tool request handling |
| `cli.cjs` | CLI tool for direct browser automation |
| `protocol.cjs` | Chrome native messaging protocol helpers |
| `host-wrapper.py` | Python wrapper for native host execution |
| `host.sh` | Shell script to start the host |

## Setup

1. Install the native host manifest:
```bash
mkdir -p ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts
cat > ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/com.anthropic.pi_chrome.json << EOF
{
  "name": "com.anthropic.pi_chrome",
  "description": "Surf Extension Native Host",
  "path": "$PWD/host-wrapper.py",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://YOUR_EXTENSION_ID/"]
}
EOF
```

2. Start the native host:
```bash
node host.cjs
```

The host creates a Unix socket at `/tmp/surf.sock`.

## CLI Usage

```bash
surf <command> [args] [options]
```

### Common Commands

| Command | Description |
|---------|-------------|
| `navigate <url>` | Go to URL (alias: `go`) |
| `click <ref>` | Click element by ref or coordinates |
| `type <text>` | Type text at cursor or into element |
| `screenshot` | Capture screenshot (alias: `snap`) |
| `page.read` | Get page accessibility tree (alias: `read`) |
| `search <term>` | Search for text in page (alias: `find`) |

### Navigation

```bash
surf go "https://example.com"
surf back
surf forward
surf tab.reload --hard
```

### Page Interaction

```bash
surf read                           # Get interactive elements
surf click e5                       # Click by element ref
surf click --selector ".btn"        # Click by CSS selector
surf click 100 200                  # Click by coordinates
surf type "hello" --submit          # Type and press Enter
surf key Escape                     # Press key
```

### Screenshots

```bash
surf screenshot --output /tmp/shot.png
surf screenshot --annotate --output /tmp/labeled.png
surf screenshot --fullpage --output /tmp/full.png
surf snap                           # Auto-saves to /tmp
```

### Tabs

```bash
surf tab.list
surf tab.new "https://example.com"
surf tab.switch 123
surf tab.close 123
surf tab.group --name "Work" --color blue
```

### Cookies

```bash
surf cookie.list
surf cookie.get --name "session"
surf cookie.set --name "foo" --value "bar"
surf cookie.clear --all
```

### Bookmarks & History

```bash
surf bookmark.add
surf bookmark.list --limit 20
surf history.list --limit 10
surf history.search "github"
```

### Other

```bash
surf zoom 1.5                       # Set zoom to 150%
surf resize --width 1280 --height 720
surf wait 2                         # Wait 2 seconds
surf js "return document.title"     # Execute JavaScript
```

### Help

```bash
surf --help                         # Basic help
surf --help-full                    # All commands
surf <command> --help               # Command details
surf --find <query>                 # Search commands
surf --about refs                   # Topic guide
```

## Protocol

### Tool Request

```json
{
  "type": "tool_request",
  "method": "execute_tool",
  "params": {
    "tool": "TOOL_NAME",
    "args": { ... },
    "tabId": 123
  },
  "id": "unique-request-id"
}
```

### Tool Response (Success)

```json
{
  "type": "tool_response",
  "id": "unique-request-id",
  "result": {
    "content": [
      { "type": "text", "text": "Result message" }
    ]
  }
}
```

### Tool Response (With Image)

```json
{
  "type": "tool_response",
  "id": "unique-request-id",
  "result": {
    "content": [
      { "type": "text", "text": "Screenshot captured" },
      { "type": "image", "data": "base64...", "mimeType": "image/png" }
    ]
  }
}
```

### Tool Response (Error)

```json
{
  "type": "tool_response",
  "id": "unique-request-id",
  "error": {
    "content": [{ "type": "text", "text": "Error message" }]
  }
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Socket not found | Ensure `node host.cjs` is running |
| No response | Check extension is loaded in Chrome |
| "Content script not loaded" | Navigate to page first |
| Slow first operation | Normal - CDP debugger attachment takes ~5s |
