const { app, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let tray = null;

function createTray() {
  console.log('Creating test tray...');
  
  // Hide app from dock
  app.dock.hide();
  
  // Create a simple icon using data URL
  const iconData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAbwAAAG8B8aLcQwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3Njape.org5vuPBoAAAB5SURBVDiNY2AYBYMRMDIyMjAyMjL8//+f4f///wwsDAwMDP///2f4//8/AwMDA8P///8ZGBgYGP7//8/AyMjI8P//f4b///8zMDIyMvz//5+BkZGR4f///wyMjIwM////Z2BkZGT4//8/AyMjI8P///8ZGBkZGf7//8/AyMjI8P//f4ZRMBgBAJ8jBQxQqF8YAAAAAElFTkSuQmCC';
  const icon = nativeImage.createFromDataURL(iconData);
  
  console.log('Icon created');
  
  tray = new Tray(icon);
  console.log('Tray created');
  
  tray.setToolTip('Test PR MenuBar');
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Test App', enabled: false },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);
  
  tray.setContextMenu(contextMenu);
  console.log('Context menu set');
  
  tray.on('click', () => {
    console.log('Tray clicked!');
  });
  
  console.log('Test tray setup complete');
}

app.whenReady().then(() => {
  console.log('App ready');
  createTray();
});

app.on('window-all-closed', () => {
  console.log('Windows closed, keeping app alive');
});

app.on('before-quit', () => {
  console.log('App quitting');
}); 