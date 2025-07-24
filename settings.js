const { ipcRenderer } = require('electron');

const { createApp } = Vue;

createApp({
    data() {
        return {
            settings: {
                owner: '',
                repo: '',
                token: ''
            },
            status: null
        }
    },
    
    async mounted() {
        await this.loadSettings();
    },
    
    methods: {
        async loadSettings() {
            try {
                const savedSettings = await ipcRenderer.invoke('get-settings');
                this.settings = { ...this.settings, ...savedSettings };
            } catch (error) {
                console.error('Error loading settings:', error);
                this.showStatus('Error loading settings', 'error');
            }
        },
        
        async saveSettings() {
            try {
                // Validate required fields
                if (!this.settings.owner || !this.settings.repo || !this.settings.token) {
                    this.showStatus('Please fill in all required fields', 'error');
                    return;
                }
                
                // Save settings
                await ipcRenderer.invoke('save-settings', this.settings);
                this.showStatus('Settings saved successfully!', 'success');
                
                // Clear status after 3 seconds
                setTimeout(() => {
                    this.status = null;
                }, 3000);
                
            } catch (error) {
                console.error('Error saving settings:', error);
                this.showStatus('Error saving settings', 'error');
            }
        },
        
        async testConnection() {
            try {
                // Validate required fields
                if (!this.settings.owner || !this.settings.repo || !this.settings.token) {
                    this.showStatus('Please fill in all required fields first', 'error');
                    return;
                }
                
                this.showStatus('Testing connection...', 'info');
                
                // Test the connection by fetching PRs
                const prs = await ipcRenderer.invoke('get-prs');
                
                if (Array.isArray(prs)) {
                    this.showStatus(`Connection successful! Found ${prs.length} open pull requests.`, 'success');
                } else {
                    this.showStatus('Connection failed. Please check your settings.', 'error');
                }
                
            } catch (error) {
                console.error('Error testing connection:', error);
                this.showStatus('Connection failed. Please check your settings.', 'error');
            }
        },
        
        showStatus(message, type) {
            this.status = {
                message,
                type
            };
        }
    }
}).mount('#app'); 