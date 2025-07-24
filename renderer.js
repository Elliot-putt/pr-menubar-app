const { ipcRenderer } = require('electron');

const { createApp } = Vue;

createApp({
    data() {
        return {
            prs: [],
            filteredPRs: [],
            loading: true,
            error: null,
            settings: null,
            countdown: 0,
            countdownInterval: null,
            activeFilter: null,
            metrics: {
                openPRs: 0,
                reviewPRs: 0,
                totalPRs: 0,
                nonDraftPRs: 0
            }
        }
    },
    
    computed: {
        prCount() {
            return this.displayedPRs.length;
        },
        
        displayedPRs() {
            if (!this.activeFilter) {
                return this.prs;
            }
            return this.filteredPRs;
        },
        
        openPRs() {
            return this.metrics.openPRs;
        },
        
        reviewPRs() {
            return this.metrics.reviewPRs;
        },
        
        openPRsStyle() {
            // Show progress based on open PRs vs total PRs (all PRs are open, so this should be 100%)
            const percentage = this.metrics.totalPRs > 0 ? (this.metrics.openPRs / this.metrics.totalPRs) * 100 : 0;
            console.log('Open PRs Style - Open PRs:', this.metrics.openPRs, 'Total PRs:', this.metrics.totalPRs, 'Percentage:', percentage, 'Degrees:', percentage);
            console.log('Open PRs Style - Metrics object:', this.metrics);
            
            // Ensure percentage is a valid number
            const validPercentage = isNaN(percentage) ? 0 : percentage;
            
            // Try a different approach - use linear-gradient as fallback
            const cssBackground = `conic-gradient(#667eea 0deg, #667eea ${validPercentage}deg, #e1e5e9 ${validPercentage}deg, #e1e5e9 360deg)`;
            console.log('Open PRs CSS Background:', cssBackground);
            
            // Circular progress bar using conic-gradient
            console.log('Open PRs - Percentage:', validPercentage, 'Degrees:', validPercentage);
            return {
                background: `conic-gradient(#9333ea 0deg, #9333ea ${validPercentage}deg, #27272a ${validPercentage}deg, #27272a 360deg)`
            };
        },
        
        reviewPRsStyle() {
            // Show progress based on review PRs vs non-draft PRs
            const percentage = this.metrics.nonDraftPRs > 0 ? (this.metrics.reviewPRs / this.metrics.nonDraftPRs) * 100 : 0;
            console.log('Review PRs Style - Review PRs:', this.metrics.reviewPRs, 'Non-draft PRs:', this.metrics.nonDraftPRs, 'Percentage:', percentage, 'Degrees:', percentage);
            console.log('Review PRs Style - Metrics object:', this.metrics);
            
            // Ensure percentage is a valid number
            const validPercentage = isNaN(percentage) ? 0 : percentage;
            
            // Circular progress bar using conic-gradient
            console.log('Review PRs - Percentage:', validPercentage, 'Degrees:', validPercentage);
            return {
                background: `conic-gradient(#ec4899 0deg, #ec4899 ${validPercentage}deg, #27272a ${validPercentage}deg, #27272a 360deg)`
            };
        }
    },
    
    async mounted() {
        console.log('Vue app mounted, loading settings and PRs...');
        
        // Only prevent scroll on the main window, not the content area
        window.scrollTo(0, 0);
        
        await this.loadSettings();
        await this.loadPRs();
        this.startCountdown();
        
        // Listen for PR updates from main process
        ipcRenderer.on('prs-updated', (event, prs) => {
            console.log('Received PRs update from main process:', prs.length, 'PRs');
            this.prs = prs;
            this.calculateMetrics();
            this.loading = false;
            this.error = null;
            this.startCountdown(); // Restart countdown after update
            
            // Re-apply current filter after data update to ensure consistency
            if (this.activeFilter) {
                this.applyFilter(this.activeFilter);
            }
        });
    },
    
    methods: {
        async loadSettings() {
            try {
                this.settings = await ipcRenderer.invoke('get-settings');
            } catch (error) {
                console.error('Error loading settings:', error);
            }
        },
        
        async loadPRs() {
            try {
                console.log('Loading PRs from main process...');
                this.loading = true;
                this.error = null;
                this.prs = await ipcRenderer.invoke('get-prs');
                console.log('Loaded PRs:', this.prs.length, 'PRs');
                this.calculateMetrics();
            } catch (error) {
                this.error = error.message || 'Failed to load pull requests';
                console.error('Error loading PRs:', error);
            } finally {
                this.loading = false;
            }
        },
        
        calculateMetrics() {
            if (!this.prs || this.prs.length === 0) {
                this.metrics = { openPRs: 0, reviewPRs: 0, totalPRs: 0, nonDraftPRs: 0 };
                console.log('No PRs found, metrics reset to zero');
                return;
            }
            
            let openPRs = 0;
            let reviewPRs = 0;
            let totalPRs = this.prs.length;
            let nonDraftPRs = 0;
            
            console.log('Calculating metrics for', this.prs.length, 'PRs');
            
            this.prs.forEach(pr => {
                openPRs++;
                
                console.log('Processing PR:', pr.number, 'Draft:', pr.draft, 'Review data:', pr.review_data);
                
                // Count non-draft PRs
                if (!pr.draft) {
                    nonDraftPRs++;
                    
                    // Improved review logic: Only count PRs that actually need review
                    if (pr.review_data) {
                        console.log('PR', pr.number, 'workflow status:', pr.review_data.workflow_status);
                        
                        // Count as needing review if:
                        // 1. No reviewers assigned yet
                        // 2. Has reviewers but changes were requested and now waiting for approval
                        // 3. Has reviewers but still awaiting initial review
                        if (pr.review_data.workflow_status === 'needs_review' || 
                            pr.review_data.workflow_status === 'awaiting_review' ||
                            pr.review_data.workflow_status === 'review_in_progress') {
                            reviewPRs++;
                            console.log('PR', pr.number, 'counted as needing review');
                        }
                    } else {
                        // If no review data, assume it needs review
                        reviewPRs++;
                        console.log('PR', pr.number, 'counted as needing review (no review data)');
                    }
                } else {
                    console.log('PR', pr.number, 'is draft, not counted for review');
                }
            });
            
            // Use Vue.set or direct assignment to ensure reactivity
            this.metrics.openPRs = openPRs;
            this.metrics.reviewPRs = reviewPRs;
            this.metrics.totalPRs = totalPRs;
            this.metrics.nonDraftPRs = nonDraftPRs;
            
            console.log('Final metrics:', this.metrics);
            
            // Force Vue to update the computed properties
            this.$nextTick(() => {
                console.log('Computed properties updated - Open PRs Style:', this.openPRsStyle);
                console.log('Computed properties updated - Review PRs Style:', this.reviewPRsStyle);
                this.debugComputedProperties();
                
                // Debug: Check if styles are actually applied to DOM elements
                setTimeout(() => {
                    const openPRsCircle = document.querySelector('.metric-circle:first-child .circle-progress');
                    const reviewPRsCircle = document.querySelector('.metric-circle:last-child .circle-progress');
                    
                    if (openPRsCircle) {
                        console.log('Open PRs Circle computed style:', window.getComputedStyle(openPRsCircle).background);
                        console.log('Open PRs Circle background-image:', window.getComputedStyle(openPRsCircle).backgroundImage);
                    }
                    
                    if (reviewPRsCircle) {
                        console.log('Review PRs Circle computed style:', window.getComputedStyle(reviewPRsCircle).background);
                        console.log('Review PRs Circle background-image:', window.getComputedStyle(reviewPRsCircle).backgroundImage);
                    }
                }, 100);
            });
        },
        
        openPR(url) {
            ipcRenderer.invoke('open-pr', url);
        },
        

        
        // Debug method to test computed properties
        debugComputedProperties() {
            console.log('=== DEBUG COMPUTED PROPERTIES ===');
            console.log('Metrics:', this.metrics);
            console.log('Open PRs Style:', this.openPRsStyle);
            console.log('Review PRs Style:', this.reviewPRsStyle);
            console.log('Open PRs:', this.openPRs);
            console.log('Review PRs:', this.reviewPRs);
            console.log('Open PRs Background:', this.openPRsStyle.backgroundColor);
            console.log('Review PRs Background:', this.reviewPRsStyle.backgroundColor);
            console.log('===============================');
        },
        
        refreshPRs() {
            this.loadPRs();
            this.startCountdown();
            
            // Re-apply current filter after refresh to ensure consistency
            if (this.activeFilter) {
                this.applyFilter(this.activeFilter);
            }
        },
        
        toggleFilter(filterType) {
            if (this.activeFilter === filterType) {
                // If clicking the same filter, clear it
                this.activeFilter = null;
                this.filteredPRs = [];
            } else {
                // Apply new filter
                this.activeFilter = filterType;
                this.applyFilter(filterType);
            }
        },
        
        applyFilter(filterType) {
            if (!this.prs || this.prs.length === 0) {
                this.filteredPRs = [];
                return;
            }
            
            switch (filterType) {
                case 'open':
                    // Show all open PRs (which are all PRs in this case)
                    this.filteredPRs = this.prs;
                    break;
                case 'review':
                    // Show only PRs that need review (improved logic)
                    this.filteredPRs = this.prs.filter(pr => {
                        if (pr.draft) return false; // Exclude drafts
                        
                        if (pr.review_data) {
                            // Include PRs that need review:
                            // 1. No reviewers assigned yet
                            // 2. Has reviewers but changes were requested and now waiting for approval
                            // 3. Has reviewers but still awaiting initial review
                            return pr.review_data.workflow_status === 'needs_review' || 
                                   pr.review_data.workflow_status === 'awaiting_review' ||
                                   pr.review_data.workflow_status === 'review_in_progress';
                        } else {
                            // If no review data, assume it needs review
                            return true;
                        }
                    });
                    break;
                default:
                    this.filteredPRs = this.prs;
            }
        },
        
        clearFilter() {
            this.activeFilter = null;
            this.filteredPRs = [];
        },
        
        startCountdown() {
            // Clear existing countdown
            if (this.countdownInterval) {
                clearInterval(this.countdownInterval);
            }
            
            // Start countdown from 300 seconds (5 minutes)
            this.countdown = 300;
            
            this.countdownInterval = setInterval(() => {
                this.countdown--;
                if (this.countdown <= 0) {
                    clearInterval(this.countdownInterval);
                    this.countdownInterval = null;
                }
            }, 1000);
        },
        

    }
}).mount('#app'); 