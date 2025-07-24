const { app, BrowserWindow, Tray, Menu, nativeImage, Notification, shell } = require('electron');
const path = require('path');
const axios = require('axios');
const Store = require('electron-store');

const store = new Store();

let tray = null;
let mainWindow = null;
let pollInterval = null;

// GitHub API configuration
const GITHUB_API_BASE = 'https://api.github.com';
const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Default settings
const defaultSettings = {
  owner: '',
  repo: '',
  token: '',
  lastPrCount: 0
};

// Initialize settings
if (!store.get('settings')) {
  store.set('settings', defaultSettings);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    show: false,
    frame: false,
    fullscreenable: false,
    resizable: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: true,
    type: 'panel',
    hasShadow: false,
    thickFrame: false,
    titleBarStyle: 'hidden',
    closable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true
    }
  });

  mainWindow.loadFile('index.html');

  // Open dev tools with Cmd+Option+I (Mac) or Ctrl+Shift+I (Windows/Linux)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key === 'I') {
      mainWindow.webContents.openDevTools();
    }
  });

  // Hide window when it loses focus, but with a longer delay
  mainWindow.on('blur', () => {
    // Longer delay to prevent immediate hiding when clicking inside the window
    setTimeout(() => {
      if (!mainWindow.isDestroyed() && !mainWindow.isFocused()) {
        mainWindow.hide();
      }
    }, 300);
  });

  // Prevent window from being closed
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  console.log('Creating tray...');
  
  let icon;
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  
  try {
    if (require('fs').existsSync(iconPath)) {
      console.log('Icon file exists at:', iconPath);
      icon = nativeImage.createFromPath(iconPath);
      const size = icon.getSize();
      console.log('Custom icon loaded successfully, size:', size);
      
      // Check if the icon loaded properly
      if (size.width === 0 || size.height === 0) {
        console.log('Custom icon is invalid, using system icon');
        icon = nativeImage.createFromNamedImage('NSImageNameStatusAvailable', [16, 16]);
      } else {
        // Ensure the icon is properly sized for the menu bar
        if (size.width < 16 || size.height < 16) {
          console.log('Icon is too small, resizing...');
          icon = icon.resize({ width: 20, height: 20 });
        } else if (size.width > 32 || size.height > 32) {
          console.log('Icon is too large, resizing...');
          icon = icon.resize({ width: 20, height: 20 });
        } else {
          // For medium-sized icons, make them a bit bigger
          console.log('Resizing icon to 20x20 for better visibility...');
          icon = icon.resize({ width: 20, height: 20 });
        }
      }
    } else {
      console.log('Icon file not found at:', iconPath);
      // Use a system icon that should be more visible
      icon = nativeImage.createFromNamedImage('NSImageNameStatusAvailable', [16, 16]);
      console.log('Using system icon');
    }
  } catch (error) {
    console.log('Error loading custom icon:', error.message);
    console.log('Using fallback system icon');
    // Try a different system icon
    icon = nativeImage.createFromNamedImage('NSImageNameStatusAvailable', [16, 16]);
  }
  
  // Make sure the icon is visible by setting it as template image
  icon.setTemplateImage(false); // This makes it visible instead of template
  
  tray = new Tray(icon.resize({ width: 20, height: 20 }));
  tray.setToolTip('PR MenuBar');
  
  // Create context menu
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'PR MenuBar',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        showSettings();
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  // Show window when tray icon is clicked
  tray.on('click', () => {
    toggleWindow();
  });
  
  console.log('Tray created successfully');
}

function toggleWindow() {
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    showWindow();
  }
}

function showWindow() {
  const trayBounds = tray.getBounds();
  const windowBounds = mainWindow.getBounds();
  
  // Position window below the tray icon
  const x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
  const y = Math.round(trayBounds.y + trayBounds.height + 4);
  
  // Get screen bounds
  const screen = require('electron').screen.getPrimaryDisplay();
  const screenBounds = screen.workAreaSize;
  
  // Ensure window stays within screen bounds
  const adjustedX = Math.max(0, Math.min(x, screenBounds.width - windowBounds.width));
  const adjustedY = Math.max(0, Math.min(y, screenBounds.height - windowBounds.height));
  
  // Set position and show
  mainWindow.setPosition(adjustedX, adjustedY, false);
  mainWindow.show();
  
  // Keep window on top and focused
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.focus();
  
  // Ensure it stays on top
  setTimeout(() => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
      mainWindow.focus();
    }
  }, 100);
}

function showSettings() {
  try {
    console.log('Opening settings window...');
    
    const settingsWindow = new BrowserWindow({
      width: 500,
      height: 400,
      parent: mainWindow,
      modal: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true
      }
    });

    console.log('Settings window created, loading simple-settings.html...');
    
    settingsWindow.loadFile('simple-settings.html');
    
    settingsWindow.on('closed', () => {
      console.log('Settings window closed');
    });
    
    settingsWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Settings window failed to load:', errorCode, errorDescription);
    });
    
    settingsWindow.webContents.on('crashed', (event) => {
      console.error('Settings window crashed');
    });
    
    settingsWindow.webContents.on('unresponsive', () => {
      console.error('Settings window became unresponsive');
    });
    
    console.log('Settings window setup complete');
  } catch (error) {
    console.error('Error creating settings window:', error);
  }
}

async function fetchPRs() {
  const settings = store.get('settings');
  
  if (!settings.owner || !settings.repo || !settings.token) {
    return [];
  }

  try {
    // First get basic PR list
    const response = await axios.get(
      `${GITHUB_API_BASE}/repos/${settings.owner}/${settings.repo}/pulls?state=open`,
      {
        headers: {
          'Authorization': `token ${settings.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    const prs = response.data;
    
    // Enhance each PR with additional data
    const enhancedPRs = await Promise.all(prs.map(async (pr) => {
      try {
        // Get build status
        const buildStatus = await getBuildStatus(settings, pr.number);
        
        // Get review data
        const reviewData = await getReviewData(settings, pr.number);
        
        return {
          ...pr,
          build_status: buildStatus,
          review_data: reviewData
        };
      } catch (error) {
        console.error(`Error enhancing PR ${pr.number}:`, error.message);
        return pr;
      }
    }));

    return enhancedPRs;
  } catch (error) {
    console.error('Error fetching PRs:', error.message);
    return [];
  }
}

async function getBuildStatus(settings, prNumber) {
  try {
    // First get the PR details to get the head SHA
    const prResponse = await axios.get(
      `${GITHUB_API_BASE}/repos/${settings.owner}/${settings.repo}/pulls/${prNumber}`,
      {
        headers: {
          'Authorization': `token ${settings.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    const pr = prResponse.data;
    const headSha = pr.head.sha;

    // Now get the status for the head commit
    const statusResponse = await axios.get(
      `${GITHUB_API_BASE}/repos/${settings.owner}/${settings.repo}/commits/${headSha}/status`,
      {
        headers: {
          'Authorization': `token ${settings.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    const status = statusResponse.data;
    let overallState = 'unknown';
    
    if (status.state) {
      overallState = status.state;
    }

    return {
      overall_state: overallState,
      statuses: status.statuses || [],
      total_count: status.statuses ? status.statuses.length : 0
    };
  } catch (error) {
    console.error('Error fetching build status:', error.message);
    return {
      overall_state: 'unknown',
      statuses: [],
      total_count: 0
    };
  }
}

async function getReviewData(settings, prNumber) {
  try {
    // Get reviews
    const reviewsResponse = await axios.get(
      `${GITHUB_API_BASE}/repos/${settings.owner}/${settings.repo}/pulls/${prNumber}/reviews`,
      {
        headers: {
          'Authorization': `token ${settings.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    // Get requested reviewers
    const reviewersResponse = await axios.get(
      `${GITHUB_API_BASE}/repos/${settings.owner}/${settings.repo}/pulls/${prNumber}/requested_reviewers`,
      {
        headers: {
          'Authorization': `token ${settings.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    const reviews = reviewsResponse.data;
    const requestedReviewers = reviewersResponse.data.users || [];
    
    // Analyze review workflow
    const workflowStatus = analyzeReviewWorkflow(reviews, requestedReviewers);
    
    return {
      workflow_status: workflowStatus.status,
      status_message: workflowStatus.message,
      reviews: reviews,
      requested_reviewers: requestedReviewers
    };
  } catch (error) {
    console.error('Error fetching review data:', error.message);
    return {
      workflow_status: 'unknown',
      status_message: 'Unable to fetch review data',
      reviews: [],
      requested_reviewers: []
    };
  }
}

function analyzeReviewWorkflow(reviews, requestedReviewers) {
  // If no reviewers requested and no reviews, it needs review
  if (requestedReviewers.length === 0 && (!reviews || reviews.length === 0)) {
    return {
      status: 'needs_review',
      message: 'No reviewers assigned'
    };
  }

  if (!reviews || reviews.length === 0) {
    return {
      status: 'awaiting_review',
      message: `Awaiting review from ${requestedReviewers.map(r => r.login).join(', ')}`
    };
  }

  // Get latest review per user
  const latestReviewsByUser = {};
  reviews.forEach(review => {
    const user = review.user.login;
    if (!latestReviewsByUser[user] || 
        new Date(review.submitted_at) > new Date(latestReviewsByUser[user].submitted_at)) {
      latestReviewsByUser[user] = review;
    }
  });

  const approvedBy = [];
  const changesRequestedBy = [];
  const commentedBy = [];

  Object.values(latestReviewsByUser).forEach(review => {
    switch (review.state) {
      case 'APPROVED':
        approvedBy.push(review.user.login);
        break;
      case 'CHANGES_REQUESTED':
        changesRequestedBy.push(review.user.login);
        break;
      case 'COMMENTED':
        commentedBy.push(review.user.login);
        break;
    }
  });

  // Check if all requested reviewers have reviewed
  const requestedReviewerLogins = requestedReviewers.map(r => r.login);
  const reviewersWhoHaventReviewed = requestedReviewerLogins.filter(
    login => !Object.keys(latestReviewsByUser).includes(login)
  );

  if (changesRequestedBy.length > 0) {
    return {
      status: 'changes_requested',
      message: `Changes requested by ${changesRequestedBy.join(', ')}`
    };
  } else if (approvedBy.length > 0 && reviewersWhoHaventReviewed.length === 0) {
    return {
      status: 'approved',
      message: `Approved by ${approvedBy.join(', ')}`
    };
  } else if (approvedBy.length > 0 && reviewersWhoHaventReviewed.length > 0) {
    return {
      status: 'partially_approved',
      message: `Approved by ${approvedBy.join(', ')}, awaiting ${reviewersWhoHaventReviewed.join(', ')}`
    };
  } else if (reviewersWhoHaventReviewed.length > 0) {
    return {
      status: 'awaiting_review',
      message: `Awaiting review from ${reviewersWhoHaventReviewed.join(', ')}`
    };
  } else if (commentedBy.length > 0) {
    return {
      status: 'review_in_progress',
      message: `Review in progress (${commentedBy.join(', ')})`
    };
  } else {
    return {
      status: 'needs_review',
      message: 'No reviewers assigned'
    };
  }
}

function updateTrayIcon(prCount) {
  const settings = store.get('settings');
  const lastCount = settings.lastPrCount || 0;
  
  // Update tray tooltip with PR count
  tray.setToolTip(`PR MenuBar - ${prCount} open PRs`);
  
  // Show notification if PR count increased
  if (prCount > lastCount && lastCount > 0) {
    const newPRs = prCount - lastCount;
    const iconPath = path.join(__dirname, 'assets', 'icon.png');
    
    new Notification({
      title: 'New Pull Requests',
      body: `${newPRs} new PR${newPRs > 1 ? 's' : ''} in ${settings.owner}/${settings.repo}`,
      icon: iconPath,
      silent: false
    }).show();
  }
  
  // Update stored count
  settings.lastPrCount = prCount;
  store.set('settings', settings);
}

async function pollPRs() {
  try {
    console.log('Polling for PR updates with fresh build status data...');
    const prs = await fetchPRs();
    updateTrayIcon(prs.length);
    
    // Send PR data to renderer process
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('prs-updated', prs);
    }
    
    console.log(`Updated ${prs.length} PRs with fresh build status data`);
  } catch (error) {
    console.error('Error polling PRs:', error.message);
  }
}

function startPolling() {
  // Initial poll
  pollPRs();
  
  // Set up interval
  pollInterval = setInterval(pollPRs, POLL_INTERVAL);
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

app.whenReady().then(() => {
  console.log('App is ready');
  createWindow();
  createTray();
  startPolling();
  
  app.dock.hide();
});

app.on('window-all-closed', () => {
  // Don't quit the app when all windows are closed
  // The app should stay running in the menu bar
  console.log('All windows closed, but keeping app alive');
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  app.isQuiting = true;
  stopPolling();
});

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// IPC handlers
const { ipcMain } = require('electron');

ipcMain.handle('get-settings', () => {
  return store.get('settings');
});

ipcMain.handle('save-settings', (event, settings) => {
  store.set('settings', settings);
  // Restart polling with new settings
  stopPolling();
  startPolling();
  return true;
});

ipcMain.handle('open-pr', (event, prUrl) => {
  shell.openExternal(prUrl);
});

ipcMain.handle('get-prs', async () => {
  return await fetchPRs();
});

ipcMain.handle('open-settings', () => {
  try {
    console.log('Opening settings from IPC...');
    showSettings();
    return true;
  } catch (error) {
    console.error('Error opening settings:', error);
    return false;
  }
}); 