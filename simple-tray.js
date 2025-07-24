const { app, Tray, Menu } = require('electron');

let tray = null;

app.whenReady().then(() => {
  console.log('App is ready');
  
  // Create a simple tray
  tray = new Tray();
  tray.setToolTip('Simple Test');
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Test', click: () => console.log('Test clicked') },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);
  
  tray.setContextMenu(contextMenu);
  console.log('Tray created');
});

app.on('window-all-closed', () => {
  // Keep app running
}); 