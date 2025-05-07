    document.addEventListener('DOMContentLoaded', () => {
            const luaKeywords = ["and", "break", "do", "else", "elseif", "end", "false", "for", "function", "if", "in", "local", "nil", "not", "or", "repeat", "return", "then", "true", "until", "while"];
            const luaFunctions = ["assert", "collectgarbage", "dofile", "error", "getmetatable", "ipairs", "load", "loadfile", "next", "pairs", "pcall", "print", "rawequal", "rawget", "rawset", "require", "select", "setmetatable", "tonumber", "tostring", "type", "xpcall", "string.byte", "string.char", "string.dump", "string.find", "string.format", "string.gmatch", "string.gsub", "string.len", "string.lower", "string.match", "string.rep", "string.reverse", "string.sub", "string.upper", "table.concat", "table.insert", "table.pack", "table.remove", "table.sort", "table.unpack", "math.abs", "math.acos", "math.asin", "math.atan", "math.ceil", "math.cos", "math.deg", "math.exp", "math.floor", "math.log", "math.max", "math.min", "math.pi", "math.rad", "math.random", "math.randomseed", "math.sin", "math.sqrt", "math.tan"];
            
            CodeMirror.registerHelper("hint", "lua", (editor) => {
                const cur = editor.getCursor(), token = editor.getTokenAt(cur);
                const start = token.string.trim() !== "" ? token.start : cur.ch;
                const currentWord = token.string.trim() !== "" ? token.string : "";
                const list = [...luaKeywords, ...luaFunctions].filter(item => item.indexOf(currentWord) === 0);
                
                return {
                    list: list.length ? list : [],
                    from: CodeMirror.Pos(cur.line, start),
                    to: CodeMirror.Pos(cur.line, cur.ch)
                };
            });
            
            const cm = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
                mode: "text/x-lua", theme: "monokai", lineNumbers: true,
                matchBrackets: true, indentUnit: 4, tabSize: 4,
                indentWithTabs: false, smartIndent: true,
                extraKeys: {
                    "Tab": cm => cm.somethingSelected() ? cm.indentSelection("add") : cm.replaceSelection("    "),
                    "Ctrl-Space": "autocomplete"
                }
            });
            
            const MAX_TABS = 8;
            const output = document.getElementById('output');
            const tabContainer = document.querySelector('.tab-container');
            const newTabBtn = document.querySelector('.new-tab-btn');
            
            let scripts = {'script1': {name: 'script.lua'}};
            let activeId = 'script1', nextId = 2;
            
            function createTab(id, name, active = false) {
                const tab = document.createElement('div');
                tab.className = `tab ${active ? 'active' : ''}`;
                tab.dataset.tabId = id;
                tab.innerHTML = `${name}<span class="tab-close">×</span>`;
                return tab;
            }
            
            function switchTab(id) {
                scripts[activeId].content = cm.getValue();
                document.querySelectorAll('.tab').forEach(tab => 
                    tab.classList.toggle('active', tab.dataset.tabId === id));
                activeId = id;
                cm.setValue(scripts[id].content);
                
                setTimeout(() => {
                    cm.setCursor(0, 0);
                    cm.focus();
                }, 0);
            }
            
            function closeTab(id) {
                if (Object.keys(scripts).length <= 1) return;
                
                if (activeId === id) {
                    const tabIds = Object.keys(scripts);
                    const currentIndex = tabIds.indexOf(id);
                    let nextTabId;
                    if (currentIndex < tabIds.length - 1) {
                        nextTabId = tabIds[currentIndex + 1];
                    } else {
                        nextTabId = tabIds[currentIndex - 1];
                    }
                    
                    switchTab(nextTabId);
                }
                
                document.querySelector(`.tab[data-tab-id="${id}"]`).remove();
                delete scripts[id];
                updateTabBtn();
            }
            
            function updateTabBtn() {
                const count = Object.keys(scripts).length;
                newTabBtn.disabled = count >= MAX_TABS;
                newTabBtn.style.opacity = count >= MAX_TABS ? '0.5' : '1';
                newTabBtn.style.cursor = count >= MAX_TABS ? 'not-allowed' : 'pointer';
            }
            
            window.updateConsoleOutput = function(message) {
                if (typeof message === 'string') {
                    const lowerMsg = message.toLowerCase();

                    if (lowerMsg.includes('[dflog::') || lowerMsg.includes('dflog::') || 
                        message.includes('[DFlog::') || message.includes('DFlog::')) {
                        return; 
                    }

                    if (lowerMsg.includes('[channel]') || lowerMsg.includes('channel]')) {
                        return; 
                    }
                    
                    const messageElement = document.createElement('div');
                    let logType = null, prefix = '', msgContent = message.trim();

                    if (message.includes('[FLog::')) {
                        if (message.includes('[FLog::Output]')) {
                            logType = 'log-output';
                            prefix = '[Output]: ';
                            message = message.replace('[FLog::Output]', '').trim();
                        } else if (message.includes('[FLog::Warning]')) {
                            logType = 'log-warning';
                            prefix = '[Warning]: ';
                            message = message.replace('[FLog::Warning]', '').trim();
                        } else if (message.includes('[FLog::Error]')) {
                            logType = 'log-error';
                            prefix = '[Error]: ';
                            message = message.replace('[FLog::Error]', '').trim();
                        } else {
                            return; 
                        }
                        
                        msgContent = message.replace(/\[FLog::[^]]+\]/, '').trim();
                        const matches = msgContent.match(/(?:[0-9a-fA-F,.:\-TZ]+\s+)+(.+)$/);
                        if (matches && matches[1]) {
                            msgContent = matches[1];
                        } else {
                            const wordStart = msgContent.search(/[a-zA-Z_](?![^a-zA-Z_]*[0-9a-fA-F,.:\-])/);
                            if (wordStart >= 0) msgContent = msgContent.substring(wordStart);
                        }
                    }
                    
                    if (logType) {
                        const logPrefix = document.createElement('span');
                        logPrefix.className = logType;
                        logPrefix.textContent = prefix;
                        messageElement.appendChild(logPrefix);
                        messageElement.appendChild(document.createTextNode(msgContent));
                    } else {
                        messageElement.textContent = msgContent;
                    }
                    
                    output.appendChild(messageElement);
                    requestAnimationFrame(() => output.scrollTop = output.scrollHeight);
                } else if (message !== undefined && message !== null) {
                    const messageElement = document.createElement('div');
                    messageElement.textContent = String(message);
                    output.appendChild(messageElement);
                    requestAnimationFrame(() => output.scrollTop = output.scrollHeight);
                }
            };
            window.batchUpdateConsole = function(lines) {
                if (Array.isArray(lines)) {
                    for (const line of lines) {
                        updateConsoleOutput(line);
                    }
                }
            };
            
// scripts.js (Electron front-end)

window.addEventListener('load', () => {
    setTimeout(() => {
        window.api.startLogMonitoring();
    }, 1000);
});

const output = document.getElementById('output');

document.getElementById('clear-console').addEventListener('click', () => {
    const logMessages = Array.from(output.childNodes).filter(node => 
        node.textContent && node.textContent.includes('Monitoring log file')
    );
    output.innerHTML = '';
    logMessages.forEach(node => output.appendChild(node));
});

const minimizeConsoleBtn = document.getElementById('minimize-console');
const outputContainer = document.querySelector('.output-container');

minimizeConsoleBtn.addEventListener('click', () => {
    outputContainer.classList.toggle('minimized');
    minimizeConsoleBtn.classList.toggle('minimized');

    const header = document.querySelector('.output-header');
    const titleNode = header.firstChild.textContent.trim() === 'Roblox Console'
        ? header.firstChild
        : header.childNodes[0];

    if (outputContainer.classList.contains('minimized')) {
        titleNode.textContent = '-';
    } else {
        titleNode.textContent = 'Roblox Console';
        setTimeout(() => {
            requestAnimationFrame(() => output.scrollTop = output.scrollHeight);
        }, 300);
    }
});

setTimeout(() => {
    document.querySelectorAll('.load-fade, .load-slide-up, .load-slide-down, .load-scale')
        .forEach(el => {
            el.style.opacity = '1';
            el.style.transform = 'none';
            el.classList.remove(
                'load-fade', 'load-slide-up', 'load-slide-down', 'load-scale',
                'delay-1', 'delay-2', 'delay-3', 'delay-4', 'delay-5'
            );
        });
}, 2000);

function executeScript() {
    const code = cm.getValue();
    scripts[activeId].content = code;

    window.api.executeScript(code)
        .then(data => {
            updateConsoleOutput(data.message);
            if (data.details && Array.isArray(data.details)) {
                data.details.forEach(detail => updateConsoleOutput(detail));
            }
        })
        .catch(error => updateConsoleOutput(`Error: ${error.message}`));
}

document.getElementById('run-btn').addEventListener('click', executeScript);

// Tab switching, close, hints, etc. (unchanged)
// ... [rest of UI logic stays the same] ...

// ScriptHub & Local Scripts
function fetchLocalScripts() {
    scripthubContent.innerHTML = '<div class="loading-spinner"></div>';
    window.api.getLocalScripts()
        .then(data => {
            if (data.status === 'success' && data.scripts.length) {
                localScriptsCache = data.scripts;
                displayLocalScripts(data.scripts);
            } else {
                scripthubContent.innerHTML = '<p style="padding: 20px;">No local scripts found</p>';
            }
        })
        .catch(err => {
            console.error('Error fetching local scripts:', err);
            scripthubContent.innerHTML = '<p style="padding: 20px;">Error fetching local scripts</p>';
        });
}

function filterLocalScripts(term) {
    if (!term.trim()) return displayLocalScripts(localScriptsCache);
    const filtered = localScriptsCache.filter(script =>
        script.name.toLowerCase().includes(term.toLowerCase()) ||
        (script.content && script.content.toLowerCase().includes(term.toLowerCase()))
    );
    filtered.length ? displayLocalScripts(filtered) :
        scripthubContent.innerHTML = '<p style="padding: 20px;">No matching scripts found</p>';
}

function displayLocalScripts(list) {
    scripthubContent.innerHTML = '';
    list.forEach(script => {
        // ... build script-item DOM ...
    });
    // Attach load, direct-execute, autoexec, rename, delete handlers
    document.querySelectorAll('.script-load-btn').forEach(btn => {
        btn.addEventListener('click', e => loadLocalScript(btn.dataset.scriptName));
    });
    document.querySelectorAll('.script-autoexec-toggle').forEach(toggle => {
        toggle.addEventListener('change', () => {
            window.api.toggleAutoExec(toggle.dataset.scriptName, toggle.checked)
                .then(res => updateConsoleOutput(
                    res.status === 'success'
                        ? `Auto-execute ${toggle.checked ? 'enabled' : 'disabled'} for "${toggle.dataset.scriptName}"`
                        : `Error: ${res.message}`
                ))
                .catch(err => {
                    toggle.checked = !toggle.checked;
                    updateConsoleOutput(`Error toggling auto-execute: ${err.message}`);
                });
        });
    });
    // ... rename, delete btn handlers invoking window.api.renameScript / deleteScript ...
}

function loadLocalScript(name) {
    window.api.getLocalScripts()
        .then(data => {
            if (data.status === 'success') {
                const script = data.scripts.find(s => s.name === name);
                // ... load into editor and UI ...
            }
        });
}

function fetchScripts(query = '') {
    scripthubContent.innerHTML = '<div class="loading-spinner"></div>';
    window.api.getScripts(query)
        .then(data => {
            if (data.result.scripts.length) {
                window.scriptHubScripts = data.result.scripts;
                displayScripts(data.result.scripts);
            } else {
                scripthubContent.innerHTML = '<p style="padding: 20px;">No scripts found</p>';
            }
        })
        .catch(err => console.error('Error fetching scripts:', err));
}

// ... rest of UI code unchanged, using window.api for openRoblox, saveScript, renameScript, deleteScript, quitApp, minimizeApp etc. ...

// Example:
document.getElementById('roblox-btn').addEventListener('click', () => {
    window.api.openRoblox();
});

document.getElementById('close-app-btn').addEventListener('click', () => {
    window.api.quitApp();
});

document.getElementById('minimize-app-btn').addEventListener('click', () => {
    window.api.minimizeApp();
});
