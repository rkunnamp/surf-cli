/**
 * Executor for surf `do` workflow commands
 * 
 * Executes steps sequentially with auto-waits and streaming progress output.
 * Follows the same socket communication pattern as --script mode in cli.cjs.
 */

const net = require("net");

const SOCKET_PATH = "/tmp/surf.sock";

// Commands that trigger auto-wait after execution
// Note: 'type' is intentionally excluded - typing doesn't trigger navigation or DOM changes
const AUTO_WAIT_COMMANDS = [
  'go', 'navigate', 'click', 'key', 'form.fill', 'submit',
  'tab.switch', 'tab.new', 'back', 'forward'
];

// Auto-wait strategies per command type
const AUTO_WAIT_MAP = {
  'navigate': 'wait.load',
  'go': 'wait.load',
  'click': 'wait.dom',
  'key': 'wait.dom',
  'form.fill': 'wait.dom',
  'submit': 'wait.load',  // Form submission typically triggers navigation
  'tab.switch': 'wait.load',
  'tab.new': 'wait.load',
  'back': 'wait.load',
  'forward': 'wait.load',
};

/**
 * Check if a command should trigger an auto-wait
 * @param {string} cmd - Command name
 * @returns {boolean}
 */
function shouldAutoWait(cmd) {
  return AUTO_WAIT_COMMANDS.some(c => cmd === c || cmd.startsWith(c + '.'));
}

/**
 * Get the appropriate auto-wait command for a given command
 * @param {string} cmd - Command name
 * @returns {string|null} - Wait command to execute, or null
 */
function getAutoWaitCommand(cmd) {
  // Check exact match first
  if (AUTO_WAIT_MAP[cmd] !== undefined) return AUTO_WAIT_MAP[cmd];
  
  // Check prefix match
  for (const [prefix, waitCmd] of Object.entries(AUTO_WAIT_MAP)) {
    if (cmd.startsWith(prefix + '.')) return waitCmd;
  }
  
  return null;
}

/**
 * Send a single tool request over socket
 * @param {string} toolName - Tool/command name
 * @param {object} toolArgs - Tool arguments
 * @param {object} context - Execution context (tabId, windowId)
 * @returns {Promise<object>} - Response from host
 */
function sendDoRequest(toolName, toolArgs, context = {}) {
  return new Promise((resolve, reject) => {
    const sock = net.createConnection(SOCKET_PATH, () => {
      const req = {
        type: "tool_request",
        method: "execute_tool",
        params: { tool: toolName, args: toolArgs },
        id: "do-" + Date.now() + "-" + Math.random(),
      };
      if (context.tabId) req.tabId = context.tabId;
      if (context.windowId) req.windowId = context.windowId;
      sock.write(JSON.stringify(req) + "\n");
    });
    
    let buf = "";
    sock.on("data", (d) => {
      buf += d.toString();
      const lines = buf.split("\n");
      buf = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const resp = JSON.parse(line);
          sock.end();
          resolve(resp);
        } catch {
          sock.end();
          reject(new Error("Invalid JSON response"));
        }
      }
    });
    
    sock.on("error", (e) => {
      if (e.code === "ENOENT") {
        reject(new Error("Socket not found. Is Chrome running with the extension?"));
      } else if (e.code === "ECONNREFUSED") {
        reject(new Error("Connection refused. Native host not running."));
      } else {
        reject(e);
      }
    });
    
    const timeoutId = setTimeout(() => { 
      sock.destroy(); 
      reject(new Error("Request timeout")); 
    }, 30000);
    
    sock.on("close", () => clearTimeout(timeoutId));
  });
}

/**
 * Substitute variables in arguments using %{varname} syntax
 * @param {object} args - Arguments object
 * @param {object} vars - Variables map
 * @returns {object} - Arguments with variables substituted
 */
function substituteVars(args, vars) {
  if (!args || typeof args !== 'object') return args;
  
  const result = {};
  for (const [key, val] of Object.entries(args)) {
    if (typeof val === 'string') {
      result[key] = val.replace(/%\{(\w+)\}/g, (_, name) => vars[name] ?? `%{${name}}`);
    } else {
      result[key] = val;
    }
  }
  return result;
}

/**
 * Execute all workflow steps sequentially
 * @param {Array<{ cmd: string, args: object }>} steps - Steps to execute
 * @param {object} options - Execution options
 * @returns {Promise<object>} - Execution result
 */
async function executeDoSteps(steps, options = {}) {
  const {
    onError = 'stop',
    autoWait = true,
    stepDelay = 100,
    context = {},
    quiet = false,  // For --json mode, suppress streaming output
  } = options;
  
  const results = [];
  const vars = context.vars || {};
  const total = steps.length;
  let failed = 0;
  const startTotal = Date.now();
  
  for (let i = 0; i < total; i++) {
    const step = steps[i];
    const startTime = Date.now();
    const stepNum = `[${i + 1}/${total}]`;
    
    // Build description (matches --script output format)
    const argSummary = Object.entries(step.args || {})
      .map(([k, v]) => typeof v === "string" && v.length > 40 
        ? `${k}="${v.slice(0, 37)}..."` 
        : `${k}=${JSON.stringify(v)}`)
      .join(" ");
    const desc = argSummary ? `${step.cmd} ${argSummary}` : step.cmd;
    
    // Print step prefix (streaming output)
    if (!quiet) {
      process.stdout.write(`${stepNum} ${desc} ... `);
    }
    
    try {
      // Substitute variables in args
      const resolvedArgs = substituteVars(step.args, vars);
      
      const resp = await sendDoRequest(step.cmd, resolvedArgs, context);
      const ms = Date.now() - startTime;
      
      if (resp.error) {
        const errText = resp.error.content?.[0]?.text || JSON.stringify(resp.error);
        
        if (!quiet) {
          console.log(`FAIL`);
          console.log(`     Error: ${errText}`);
        }
        
        results.push({ step: i + 1, cmd: step.cmd, status: 'error', error: errText, ms });
        failed++;
        
        if (onError === 'stop') {
          return { 
            status: 'failed', 
            completedSteps: i, 
            totalSteps: total, 
            results, 
            error: errText,
            totalMs: Date.now() - startTotal
          };
        }
      } else {
        if (!quiet) {
          console.log(`OK (${ms}ms)`);
        }
        
        results.push({ step: i + 1, cmd: step.cmd, status: 'ok', ms });
        
        // Command-specific auto-wait
        if (autoWait) {
          const waitCmd = getAutoWaitCommand(step.cmd);
          if (waitCmd) {
            const waitArgs = waitCmd === 'wait.load' 
              ? { timeout: 10000 } 
              : { stable: 100, timeout: 5000 };
            try {
              await sendDoRequest(waitCmd, waitArgs, context);
            } catch {
              // Ignore auto-wait failures silently
            }
          }
        }
      }
      
      // Fixed delay between steps
      if (stepDelay > 0 && i < total - 1) {
        await new Promise(r => setTimeout(r, stepDelay));
      }
    } catch (err) {
      const ms = Date.now() - startTime;
      
      if (!quiet) {
        console.log(`FAIL`);
        console.log(`     Error: ${err.message}`);
      }
      
      results.push({ step: i + 1, cmd: step.cmd, status: 'error', error: err.message, ms });
      failed++;
      
      if (onError === 'stop') {
        return { 
          status: 'failed', 
          completedSteps: i, 
          totalSteps: total, 
          results, 
          error: err.message,
          totalMs: Date.now() - startTotal
        };
      }
    }
  }
  
  return { 
    status: failed > 0 ? 'partial' : 'completed', 
    completedSteps: total - failed, 
    totalSteps: total, 
    results,
    failed,
    totalMs: Date.now() - startTotal
  };
}

module.exports = { 
  executeDoSteps, 
  sendDoRequest, 
  shouldAutoWait,
  getAutoWaitCommand,
  substituteVars,
  AUTO_WAIT_COMMANDS,
  AUTO_WAIT_MAP
};
