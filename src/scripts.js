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
            
window.addEventListener('load', () => {
    setTimeout(() => {
        window.electronAPI.startLogMonitoring();
    }, 1000);
});

let searchTimeout = null;

function executeScript() {
    const code = document.getElementById("script-input").value;
    window.electronAPI.executeScript(code)
        .then(result => {
            document.getElementById("output").innerText = result;
        })
        .catch(error => {
            document.getElementById("output").innerText = error;
        });
}

function toggleAutoExec(scriptName) {
    const toggle = document.querySelector(`input[data-name="${scriptName}"]`);
    window.electronAPI.toggleAutoExec(scriptName, toggle.checked);
}

function loadLocalScripts() {
    window.electronAPI.getLocalScripts().then(scripts => {
        const table = document.getElementById("localScriptsTable");
        table.innerHTML = `
            <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Toggle</th>
                <th>Load</th>
            </tr>`;

        scripts.forEach(script => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${script.name}</td>
                <td>${script.description || ""}</td>
                <td>
                    <label class="switch">
                        <input type="checkbox" data-name="${script.name}" onchange="toggleAutoExec('${script.name}')"
                        ${script.enabled ? "checked" : ""}>
                        <span class="slider round"></span>
                    </label>
                </td>
                <td><button onclick="loadScript('${script.name}')">Load</button></td>
            `;

            table.appendChild(row);
        });
    });
}

function loadScript(scriptName) {
    window.electronAPI.getLocalScripts().then(scripts => {
        const script = scripts.find(s => s.name === scriptName);
        if (script) {
            document.getElementById("script-input").value = script.code;
        }
    });
}

function fetchScripts() {
    const searchTerm = document.getElementById("search").value;

    window.electronAPI.getScripts(searchTerm).then(scripts => {
        const table = document.getElementById("scriptTable");
        table.innerHTML = `
            <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Load</th>
            </tr>`;

        scripts.forEach(script => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${script.name}</td>
                <td>${script.description || ""}</td>
                <td><button onclick="loadFromRepo('${script.name}', '${script.code.replace(/'/g, "\\'")}')">Load</button></td>
            `;
            table.appendChild(row);
        });
    });
}

function loadFromRepo(name, code) {
    document.getElementById("script-input").value = code;
}

document.getElementById("search").addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(fetchScripts, 500);
});

document.getElementById("scriptForm").addEventListener("submit", (event) => {
    event.preventDefault();
    executeScript();
});

document.addEventListener("DOMContentLoaded", () => {
    fetchScripts();
    loadLocalScripts();
});
