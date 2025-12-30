# Surf

Zero-setup browser automation. Install the extension, run commands.

```bash
surf go "https://example.com"
surf read
surf click e5
surf snap
```

## Features

- **CLI-first**: `surf` command for terminal-based browser control
- **Zero config**: Just install the extension and go
- **50+ commands**: Navigation, tabs, input, screenshots, cookies, and more
- **Element refs**: Stable identifiers from accessibility tree (`e1`, `e2`, `e3`...)
- **CDP-based**: Bypasses CSP restrictions, works on any page
- **Socket API**: JSON protocol for agent integration

## Installation

```bash
npm install
npm run build
```

### Load Extension in Chrome

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `dist/` folder

### Setup Native Host

```bash
npm run install:native <extension-id>
node native/host.cjs
```

The host creates a socket at `/tmp/surf.sock`.

## CLI Usage

```bash
surf <command> [args] [options]
surf --help                    # Basic help
surf --help-full               # All commands
surf <command> --help          # Command details
surf --find <query>            # Search commands
```

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
surf tab.name "dashboard"           # Name current tab
surf tab.switch "dashboard"         # Switch by name
```

### Cookies

```bash
surf cookie.list
surf cookie.get --name "session"
surf cookie.set --name "foo" --value "bar"
surf cookie.clear --all
```

### Other

```bash
surf zoom 1.5                       # Set zoom to 150%
surf resize --width 1280 --height 720
surf wait 2                         # Wait 2 seconds
surf js "return document.title"     # Execute JavaScript
surf search "login"                 # Find text in page
```

### Waiting

```bash
surf wait 2                         # Wait 2 seconds
surf wait.element ".loaded"         # Wait for element
surf wait.network                   # Wait for network idle
surf wait.url "/dashboard"          # Wait for URL pattern
```

## Socket API

Send JSON to `/tmp/surf.sock`:

```bash
echo '{"type":"tool_request","method":"execute_tool","params":{"tool":"tab.list","args":{}},"id":"1"}' | nc -U /tmp/surf.sock
```

## Command Groups

| Group | Commands |
|-------|----------|
| `tab.*` | `list`, `new`, `switch`, `close`, `name`, `unname`, `named`, `group`, `ungroup`, `groups`, `reload` |
| `scroll.*` | `top`, `bottom`, `to`, `info` |
| `page.*` | `read`, `text`, `state` |
| `wait.*` | `element`, `network`, `url`, `dom`, `load` |
| `cookie.*` | `list`, `get`, `set`, `clear` |
| `bookmark.*` | `add`, `remove`, `list` |
| `history.*` | `list`, `search` |
| `dialog.*` | `accept`, `dismiss`, `info` |

## Aliases

| Alias | Command |
|-------|---------|
| `snap` | `screenshot` (auto-saves to /tmp) |
| `read` | `page.read` |
| `find` | `search` |
| `go` | `navigate` |

## Architecture

```
CLI (surf) → Unix Socket (/tmp/surf.sock) → Native Host → Chrome Extension → CDP
```

## Limitations

- Cannot automate `chrome://` pages or other extensions
- First CDP operation on a new tab takes ~5s (debugger attachment)

## Development

```bash
npm run dev       # Watch mode
npm run build     # Production build
```

After changes:
- **Extension** (`src/`): Reload at `chrome://extensions`
- **Host** (`native/`): Restart `node native/host.cjs`
