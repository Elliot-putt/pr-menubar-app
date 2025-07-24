const { app, BrowserWindow, Tray, Menu, nativeImage, Notification, shell, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const axios = require('axios');
const Store = require('electron-store');

const store = new Store();

let tray = null;
let mainWindow = null;
let pollInterval = null;

const GITHUB_API_BASE = 'https://api.github.com';
const POLL_INTERVAL = 5 * 60 * 1000;

const defaultSettings = {
  owner: '',
  repo: '',
  token: '',
  lastPrCount: 0
};

if (!store.get('settings')) {
  store.set('settings', defaultSettings);
}

function setupAutoUpdater() {
  console.log('Setting up auto-updater...');
  
  autoUpdater.autoDownload = false;
  autoUpdater.checkForUpdatesAndNotify();
  
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...');
  });
  
  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version);
    
    const response = dialog.showMessageBoxSync(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available!`,
      detail: 'Would you like to download it now? The app will restart after download.',
      buttons: ['Download Now', 'Later'],
      defaultId: 0,
      cancelId: 1
    });
    
    if (response === 0) {
      autoUpdater.downloadUpdate();
      
      new Notification({
        title: 'PR MenuBar Update',
        body: 'Downloading update in background...',
        silent: false
      }).show();
    }
  });
  
  autoUpdater.on('update-not-available', (info) => {
    console.log('Update not available. Current version:', info.version);
  });
  
  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err);
  });
  
  autoUpdater.on('download-progress', (progressObj) => {
    const percent = Math.round(progressObj.percent);
    console.log(`Download progress: ${percent}%`);
    
    if (tray) {
      tray.setToolTip(`PR MenuBar - Downloading update: ${percent}%`);
    }
  });
  
  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info.version);
    
    new Notification({
      title: 'Update Ready',
      body: 'Update downloaded! Click to restart and apply.',
      silent: false
    }).show();
    
    const response = dialog.showMessageBoxSync(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'Update has been downloaded.',
      detail: 'The application will restart to apply the update.',
      buttons: ['Restart Now', 'Restart Later'],
      defaultId: 0,
      cancelId: 1  
    });
    
    if (response === 0) {
      setImmediate(() => autoUpdater.quitAndInstall());
    }
  });
  
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 4 * 60 * 60 * 1000);
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

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key === 'I') {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('blur', () => {
    setTimeout(() => {
      if (!mainWindow.isDestroyed() && !mainWindow.isFocused()) {
        mainWindow.hide();
      }
    }, 300);
  });

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
      
      if (size.width === 0 || size.height === 0) {
        console.log('Custom icon is invalid, using system icon');
        icon = nativeImage.createFromNamedImage('NSImageNameStatusAvailable', [16, 16]);
      } else {
        console.log('Resizing icon to 20x20 for better visibility...');
        icon = icon.resize({ width: 20, height: 20 });
      }
    } else {
      console.log('Icon file not found at:', iconPath);
      icon = nativeImage.createFromNamedImage('NSImageNameStatusAvailable', [16, 16]);
      console.log('Using system icon');
    }
  } catch (error) {
    console.log('Error loading custom icon:', error.message);
    console.log('Using fallback system icon');
    icon = nativeImage.createFromNamedImage('NSImageNameStatusAvailable', [16, 16]);
  }
  
  icon.setTemplateImage(false);
  
  tray = new Tray(icon.resize({ width: 20, height: 20 }));
  tray.setToolTip(`PR MenuBar v${app.getVersion()}`);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: `PR MenuBar v${app.getVersion()}`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Check for Updates',
      click: () => {
        console.log('Manual update check requested');
        autoUpdater.checkForUpdatesAndNotify();
      }
    },
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
  
  const x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
  const y = Math.round(trayBounds.y + trayBounds.height + 4);
  
  const screen = require('electron').screen.getPrimaryDisplay();
  const screenBounds = screen.workAreaSize;
  
  const adjustedX = Math.max(0, Math.min(x, screenBounds.width - windowBounds.width));
  const adjustedY = Math.max(0, Math.min(y, screenBounds.height - windowBounds.height));
  
  mainWindow.setPosition(adjustedX, adjustedY, false);
  mainWindow.show();
  
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.focus();
  
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
    
    const enhancedPRs = await Promise.all(prs.map(async (pr) => {
      try {
        const buildStatus = await getBuildStatus(settings, pr.number);
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
    const reviewsResponse = await axios.get(
      `${GITHUB_API_BASE}/repos/${settings.owner}/${settings.repo}/pulls/${prNumber}/reviews`,
      {
        headers: {
          'Authorization': `token ${settings.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

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
  
  tray.setToolTip(`PR MenuBar v${app.getVersion()} - ${prCount} open PRs`);
  
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
  
  settings.lastPrCount = prCount;
  store.set('settings', settings);
}

async function pollPRs() {
  try {
    console.log('Polling for PR updates with fresh build status data...');
    const prs = await fetchPRs();
    updateTrayIcon(prs.length);
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('prs-updated', prs);
    }
    
    console.log(`Updated ${prs.length} PRs with fresh build status data`);
  } catch (error) {
    console.error('Error polling PRs:', error.message);
  }
}

function startPolling() {
  pollPRs();
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
  setupAutoUpdater();
  
  app.dock.hide();
});

app.on('window-all-closed', () => {
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

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const { ipcMain } = require('electron');

ipcMain.handle('get-settings', () => {
  return store.get('settings');
});

ipcMain.handle('save-settings', (event, settings) => {
  store.set('settings', settings);
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