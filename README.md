# Pi Chrome Extension

Browser automation via Chrome extension with CLI and socket API.

## Features

- **CLI**: `pi-chrome` command for terminal-based browser control
- **Socket API**: JSON protocol via Unix socket for agent integration
- **50+ Tools**: Tabs, scrolling, input, screenshots, JavaScript execution
- **Page Understanding**: Accessibility tree extraction with element refs
- **CDP-based**: Bypasses CSP restrictions, works on any page
- **Named Tabs**: Register tabs with aliases for easy switching
- **Config Files**: Project-specific settings via `pi-chrome.json`
- **Smoke Tests**: Multi-URL testing with screenshot capture
- **Script Mode**: Run command sequences from JSON files
- **DevTools Streaming**: Real-time console and network monitoring

## Installation

```bash
npm install
npm run build
npm link              # Makes 'pi-chrome' CLI available globally
```

### Load Extension in Chrome

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `dist/` folder

### Setup Native Host

```bash
cd native
./install.sh          # Install native messaging manifest
```

The extension auto-starts the socket server at `/tmp/pi-chrome.sock`.

## CLI Usage

```bash
pi-chrome <tool> [args] [options]
pi-chrome --help                    # Main help
pi-chrome <group>                   # Group help (tab, scroll, page, wait)
pi-chrome <tool> --help             # Tool help
pi-chrome --list                    # List all 50+ tools
```

### Global Options

```bash
--tab-id <id>         Target specific tab
--json                Output raw JSON response
--auto-capture        On error: capture screenshot + console to /tmp
```

### Tabs

```bash
pi-chrome tab.list
pi-chrome tab.new "https://google.com"
pi-chrome tab.switch 12345
pi-chrome tab.close 12345
```

### Named Tab Aliases

Register tabs with names for easy reference:

```bash
pi-chrome tab.name myapp            # Name current tab "myapp"
pi-chrome tab.named                 # List all named tabs
pi-chrome tab.switch myapp          # Switch by name
pi-chrome tab.close myapp           # Close by name
pi-chrome tab.unname myapp          # Remove the alias
```

### Navigation & Screenshots

```bash
pi-chrome navigate "https://example.com"
pi-chrome screenshot --output /tmp/shot.png
```

### Scrolling

```bash
pi-chrome scroll.top
pi-chrome scroll.bottom
pi-chrome scroll.info
pi-chrome scroll.to --ref "section_1"
```

### Input

```bash
pi-chrome click --ref "btn_1"
pi-chrome click --x 100 --y 200
pi-chrome type --text "hello"
pi-chrome smart_type --selector "#input" --text "hello" --submit
pi-chrome key Enter
pi-chrome key "cmd+a"
pi-chrome hover --x 100 --y 200

# Method flag: switch between CDP (real events) and JS (DOM manipulation)
pi-chrome type --text "hello" --selector "#input" --method js   # Uses smart_type
pi-chrome click --selector ".btn" --method js                   # Uses JS click()
```

### Page Inspection

```bash
pi-chrome page.read                 # Accessibility tree
pi-chrome page.text                 # Extract all text
pi-chrome page.state                # Modals, loading state
```

### Waiting

```bash
pi-chrome wait 2                    # Wait 2 seconds
pi-chrome wait.element --selector ".loaded"
pi-chrome wait.network              # Wait for network idle
pi-chrome wait.url --pattern "*/success*"
```

### JavaScript

```bash
pi-chrome js "return document.title"
pi-chrome js "return document.querySelector('#btn').textContent"
```

### Health Checks

Wait for URL or element with retry:

```bash
pi-chrome health --url "http://localhost:3000"              # Wait for 200
pi-chrome health --url "http://localhost:3000" --expect 201 # Expect specific status
pi-chrome health --selector ".app-ready"                    # Wait for element
pi-chrome health --url "..." --timeout 60000                # Custom timeout
```

### Smoke Tests

Test multiple URLs, capture screenshots, check for console errors:

```bash
pi-chrome smoke --urls "http://localhost:3000" "http://localhost:3000/about"
pi-chrome smoke --urls "..." --screenshot /tmp/smoke        # Save screenshots
pi-chrome smoke --urls "..." --fail-fast                    # Stop on first failure
pi-chrome smoke --urls "..." --json                         # JSON output
```

Output:
```
[PASS] http://localhost:3000 (1234ms) [/tmp/smoke/localhost.png]
[FAIL] http://localhost:3000/broken (2345ms)
  - [error] TypeError: Cannot read property 'foo' of undefined

Summary: 1 passed, 1 failed, 2 total
```

### DevTools Streaming

Real-time console and network monitoring (Ctrl+C to stop):

```bash
pi-chrome console --stream                    # All console output
pi-chrome console --stream --level error      # Errors only
pi-chrome network --stream                    # All network requests
pi-chrome network --stream --filter "api/"    # Filter by URL pattern
```

Output:
```
[console] [error] 12:34:56.789 TypeError: Cannot read property 'foo' of undefined
[network] GET https://api.example.com/users 200 (123ms)
```

### Config File

Create project-specific settings:

```bash
pi-chrome config --init             # Create pi-chrome.json in current directory
pi-chrome config                    # Show current config
pi-chrome config --path             # Show config file location
```

Config file (`pi-chrome.json`):
```json
{
  "routes": {
    "main": ["http://localhost:3000"]
  },
  "selectors": {
    "chatgpt": {
      "input": "#prompt-textarea"
    }
  }
}
```

### Script Mode

Run command sequences from JSON files:

```bash
pi-chrome --script workflow.json
pi-chrome --script workflow.json --dry-run        # Preview without executing
pi-chrome --script workflow.json --stop-on-error  # Stop on first failure
```

Script format:
```json
{
  "name": "My Workflow",
  "steps": [
    { "tool": "navigate", "args": { "url": "https://example.com" } },
    { "tool": "wait", "args": { "duration": 2 } },
    { "tool": "screenshot", "args": { "savePath": "/tmp/shot.png" } }
  ]
}
```

### Auto-Capture on Error

Automatically capture diagnostics when a command fails:

```bash
pi-chrome wait.element --auto-capture --selector ".missing" --timeout 2000
```

Output on failure:
```
Error: Timeout waiting for ".missing" to be visible
Auto-captured: /tmp/pi-chrome-error-1234567890.png
Console errors: [error] TypeError: ...
```

## Socket API

Send JSON to `/tmp/pi-chrome.sock`:

```bash
echo '{"type":"tool_request","method":"execute_tool","params":{"tool":"tab.list","args":{}},"id":"1"}' | nc -U /tmp/pi-chrome.sock
```

Response:
```json
{"type":"tool_response","id":"1","result":{"content":[{"type":"text","text":"..."}]}}
```

## Available Tools

### Dot-notation (preferred)

| Group | Tools |
|-------|-------|
| `tab.*` | `list`, `new`, `switch`, `close`, `name`, `unname`, `named` |
| `scroll.*` | `top`, `bottom`, `to`, `info` |
| `page.*` | `read`, `text`, `state` |
| `wait.*` | `element`, `network`, `url` |

### Core Tools

| Tool | Description |
|------|-------------|
| `screenshot` | Capture screenshot |
| `navigate` | Go to URL |
| `js` | Execute JavaScript (use `return` for values) |
| `click` | Click by ref or coordinates |
| `type` | Type text |
| `smart_type` | Type into selector with contenteditable support |
| `key` | Press key (Enter, Escape, cmd+a) |
| `hover` | Hover over element |
| `drag` | Drag between points |
| `wait` | Wait N seconds |
| `health` | Health check URL or element |
| `smoke` | Multi-URL smoke tests |
| `console` | Read/stream console messages |
| `network` | Read/stream network requests |

### Legacy Tools (still supported)

| Tool | Description |
|------|-------------|
| `list_tabs`, `new_tab`, `switch_tab`, `close_tab` | Tab management |
| `scroll_to_position`, `get_scroll_info` | Scrolling |
| `read_page`, `get_page_text`, `page_state` | Page inspection |
| `wait_for_element`, `wait_for_network_idle`, `wait_for_url` | Waiting |
| `javascript_tool` | JS execution (alias: `js`) |
| `computer` | Anthropic computer-use format wrapper |
| `read_console_messages`, `read_network_requests` | Dev tools |

Run `pi-chrome --list` for all 50+ tools.

## Architecture

```
CLI (pi-chrome) ─────► Socket (/tmp/pi-chrome.sock) ─────► host.cjs ─────► Extension ─────► CDP
```

## Limitations

- Cannot automate `chrome://` pages, Web Store, or other extensions
- First CDP operation on a new tab takes ~5-8s (debugger attachment)
- Shows "Chrome is being controlled" banner when CDP active

## Development

```bash
npm run dev       # Watch mode
npm run build     # Production build
npm run check     # Type check
```

### After code changes

- **Extension changes** (`src/`): Reload extension in `chrome://extensions`
- **Host changes** (`native/host.cjs`): Kill existing process or reload extension
  ```bash
  pkill -f host.cjs
  ```

### Debugging

Service worker logs: `chrome://extensions` > Pi Agent > "Inspect views: service worker"
