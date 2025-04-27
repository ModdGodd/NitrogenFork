import webview
import requests
import os
import time
import threading
import json

class API:
    def __init__(self):
        self.log_thread = None
        self.stop_log_monitoring = False
        self.window = None
        self.directory = os.path.join(os.path.expanduser('~'), 'Documents', 'Nitrogen')
        self.scripts_directory = os.path.join(self.directory, 'scripts')
        self.metadata_file = os.path.join(self.directory, 'metadata.json')

        if not os.path.exists(self.directory):
            os.makedirs(self.directory)
            
        if not os.path.exists(self.scripts_directory):
            os.makedirs(self.scripts_directory)

        self.script_metadata = self._load_metadata()

    def _load_metadata(self):
        if os.path.exists(self.metadata_file):
            try:
                with open(self.metadata_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading metadata file: {str(e)}")
                return {}
        return {}
    
    def _save_metadata(self):
        try:
            if not os.path.exists(os.path.dirname(self.metadata_file)):
                os.makedirs(os.path.dirname(self.metadata_file))
                
            with open(self.metadata_file, 'w') as f:
                json.dump(self.script_metadata, f, indent=2)
            return True
        except Exception as e:
            print(f"Error saving metadata file: {str(e)}")
            return False

    def execute_script(self, script_content):
        START_PORT = 6969
        END_PORT = 7069
        server_port = None
        last_error = ''
        messages = []

        try:
            for port in range(START_PORT, END_PORT + 1):
                url = f"http://127.0.0.1:{port}/secret"
                
                try:
                    res = requests.get(url)
                    if res.status_code == 200:
                        text = res.text
                        if text == '0xdeadbeef':
                            server_port = port
                            break
                except Exception as e:
                    last_error = str(e)
            
            if not server_port:
                raise Exception(f"Could not locate HTTP server on ports {START_PORT}-{END_PORT}. Last error: {last_error}")
            
            post_url = f"http://127.0.0.1:{server_port}/execute"
            
            response = requests.post(
                post_url,
                headers={
                    'Content-Type': 'text/plain'
                },
                data=script_content
            )
            
            if response.status_code == 200:
                return {
                    'status': 'success',
                    'message': 'Script executed successfully',
                    'details': messages
                }
            else:
                error_text = response.text
                raise Exception(f"HTTP {response.status_code}: {error_text}")

        except Exception as e:
            messages.append(f"Error: {str(e)}")
            return {
                'status': 'error',
                'message': 'Script execution failed: ' + str(e),
                'details': messages
            }        
        
    def getScripts(self, script):
            res = requests.get(f"https://scriptblox.com/api/script/search?q={script}")
            if res.status_code == 200:
                return res.json()
            else:
                raise Exception(f"HTTP {res.status_code}: {res.text}")
            
    def openRoblox(self):
        try:
            os.system("open -a Roblox")
            return {
                'status': 'success',
                'message': 'Roblox opened successfully'
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Failed to open Roblox: {str(e)}'
            }
    
    def saveScript(self, name, content, auto_exec=False):
        try:
            if not name.endswith('.lua'):
                name = name + '.lua'
                
            name = os.path.basename(name)
            name = ''.join(c for c in name if c.isalnum() or c in '. _-')
            
            if not os.path.exists(self.scripts_directory):
                os.makedirs(self.scripts_directory)
                
            file_path = os.path.join(self.scripts_directory, name)
            
            with open(file_path, 'w') as f:
                f.write(content)
            
            self.script_metadata[name] = {
                'autoExec': bool(auto_exec)
            }
            self._save_metadata()
                
            return {
                'status': 'success',
                'message': f'Script saved to {file_path}',
                'path': file_path,
                'autoExec': auto_exec
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Failed to save script: {str(e)}'
            }
    
    def toggleAutoExec(self, script_name, enabled):
        try:
            if script_name in self.script_metadata:
                self.script_metadata[script_name]['autoExec'] = bool(enabled)
            else:
                self.script_metadata[script_name] = {
                    'autoExec': bool(enabled)
                }
            
            self._save_metadata()
            
            return {
                'status': 'success',
                'message': f'Auto-execute {"enabled" if enabled else "disabled"} for {script_name}'
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Failed to update auto-execute status: {str(e)}'
            }
    
    def runAutoExecScripts(self):
        try:
            executed_count = 0
            details = []
            
            for script_name, metadata in self.script_metadata.items():
                if metadata.get('autoExec', False):
                    script_path = os.path.join(self.scripts_directory, script_name)
                    if os.path.exists(script_path):
                        try:
                            with open(script_path, 'r') as f:
                                script_content = f.read()
                            
                            result = self.execute_script(script_content)
                            executed_count += 1
                            details.append(f"Auto-executed: {script_name}")
                            
                            if result.get('status') == 'error':
                                details.append(f"Error with {script_name}: {result.get('message')}")
                        except Exception as e:
                            details.append(f"Error reading/executing {script_name}: {str(e)}")
            
            return {
                'status': 'success',
                'message': f'Auto-executed {executed_count} script(s)',
                'executedCount': executed_count,
                'details': details
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Failed to run auto-execute scripts: {str(e)}'
            }
    
    def getLocalScripts(self):
        try:
            if not os.path.exists(self.scripts_directory):
                os.makedirs(self.scripts_directory)
                
            files = []
            for filename in os.listdir(self.scripts_directory):
                if filename.endswith('.lua'):
                    file_path = os.path.join(self.scripts_directory, filename)
                    try:
                        with open(file_path, 'r') as f:
                            content = f.read()
                        
                        auto_exec = False
                        if filename in self.script_metadata:
                            auto_exec = self.script_metadata[filename].get('autoExec', False)
                        
                        files.append({
                            'name': filename,
                            'path': file_path,
                            'content': content,
                            'autoExec': auto_exec
                        })
                    except Exception as e:
                        print(f"Error reading file {filename}: {str(e)}")
            
            return {
                'status': 'success',
                'scripts': files
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': str(e)
            }

    def deleteScript(self, script_name):
        try:
            script_path = os.path.join(self.scripts_directory, script_name)
            
            if not os.path.exists(script_path):
                return {
                    'status': 'error',
                    'message': f'Script "{script_name}" not found'
                }
            
            os.remove(script_path)
            
            if script_name in self.script_metadata:
                del self.script_metadata[script_name]
                self._save_metadata()
            
            return {
                'status': 'success',
                'message': f'Script "{script_name}" deleted successfully'
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Failed to delete script: {str(e)}'
            }
    
    def renameScript(self, old_name, new_name):
        try:
            if not new_name.endswith('.lua'):
                new_name = new_name + '.lua'
            
            new_name = os.path.basename(new_name)
            new_name = ''.join(c for c in new_name if c.isalnum() or c in '. _-')
            
            old_path = os.path.join(self.scripts_directory, old_name)
            new_path = os.path.join(self.scripts_directory, new_name)
            
            if not os.path.exists(old_path):
                return {
                    'status': 'error',
                    'message': f'Script "{old_name}" not found'
                }
            
            if os.path.exists(new_path) and old_name != new_name:
                return {
                    'status': 'error',
                    'message': f'Script "{new_name}" already exists'
                }
            
            os.rename(old_path, new_path)
            
            if old_name in self.script_metadata:
                self.script_metadata[new_name] = self.script_metadata[old_name]
                del self.script_metadata[old_name]
                self._save_metadata()
            
            return {
                'status': 'success',
                'message': f'Script renamed from "{old_name}" to "{new_name}"'
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Failed to rename script: {str(e)}'
            }

    def start_log_monitoring(self):
        if self.log_thread and self.log_thread.is_alive():
            return {"status": "already_running", "message": "Log monitoring is already running"}
        
        self.stop_log_monitoring = False
        self.log_thread = threading.Thread(target=self._monitor_log_file)
        self.log_thread.daemon = True
        self.log_thread.start()
        
        return {"status": "success", "message": "Started log monitoring"}
    
    def stop_log_monitoring(self):
        if self.log_thread and self.log_thread.is_alive():
            self.stop_log_monitoring = True
            self.log_thread.join(timeout=1.0)
            return {"status": "success", "message": "Stopped log monitoring"}
        return {"status": "not_running", "message": "Log monitoring is not running"}
    
    def _monitor_log_file(self):
        try:
            log_dir = os.path.expanduser('~/Library/Logs/Roblox')
            
            if not os.path.exists(log_dir):
                self.window.evaluate_js(f"updateConsoleOutput('Roblox logs directory not found: {log_dir}');")
                return
            
            self.window.evaluate_js("updateConsoleOutput('Starting log monitoring...');")
            
            current_log_file = None
            file_size = 0
            
            while not self.stop_log_monitoring:
                try:
                    files = [f for f in os.listdir(log_dir) if os.path.isfile(os.path.join(log_dir, f))]
                    if not files:
                        self.window.evaluate_js("updateConsoleOutput('No log files found in Roblox logs directory');")
                        time.sleep(2)
                        continue
                    
                    files.sort(key=lambda x: os.path.getmtime(os.path.join(log_dir, x)), reverse=True)
                    latest_log_file = os.path.join(log_dir, files[0])
                    
                    if latest_log_file != current_log_file:
                        current_log_file = latest_log_file
                        file_size = os.path.getsize(current_log_file)
                        self.window.evaluate_js(f"updateConsoleOutput('Monitoring new logs from: {os.path.basename(current_log_file)}');")
                    
                    current_size = os.path.getsize(current_log_file)
                    
                    if current_size > file_size:
                        with open(current_log_file, 'r') as f:
                            f.seek(file_size)
                            new_content = f.read(current_size - file_size)
                        
                        file_size = current_size
                        
                        for line in new_content.splitlines():
                            if line.strip():
                                escaped_line = line.replace('\\', '\\\\').replace('"', '\\"').replace("'", "\\'")
                                self.window.evaluate_js(f"updateConsoleOutput('{escaped_line}');")
                    
                    time.sleep(0.5)
                
                except Exception as e:
                    self.window.evaluate_js(f"updateConsoleOutput('Error monitoring log file: {str(e)}');")
                    time.sleep(2)
        
        except Exception as e:
            if self.window:
                self.window.evaluate_js(f"updateConsoleOutput('Log monitoring error: {str(e)}');")

api = API()
window = webview.create_window('Nitrogen v1.0', "./index.html", js_api=api, width=1280, height=720, min_size=(800,600))
api.window = window
webview.start()