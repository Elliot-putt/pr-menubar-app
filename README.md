# PR MenuBar

A beautiful macOS menu bar app for monitoring GitHub pull requests in real-time.

![PR MenuBar Screenshot](assets/icon.png)

## 🚀 Quick Download

### Latest Release
**[⬇️ Download Latest Version](https://github.com/Elliot-putt/pr-menubar-app/releases/latest)**

**For Apple Silicon Macs (M1/M2/M3):**
- Download `PR MenuBar-1.0.0-arm64.dmg`

**For Intel Macs:**
- Download `PR MenuBar-1.0.0.dmg`

### Installation Steps
1. **Download** the appropriate `.dmg` file above
2. **Open** the downloaded DMG file
3. **Drag** PR MenuBar to your Applications folder
4. **Launch** from Applications (first time, right-click and select "Open")
5. **Configure** your GitHub settings (see Setup below)

---

## ✨ Features

- 🎯 **Real-time PR monitoring** - Get instant notifications about new pull requests
- 📊 **Visual metrics** - See open PRs and review requests at a glance
- 🔍 **Smart filtering** - Filter by open PRs or those awaiting review
- 🎨 **Beautiful UI** - Modern, native macOS design with dark theme
- ⚡ **Lightweight** - Minimal resource usage, runs in the background
- 🔔 **Notifications** - Get notified when PR counts change
- ⚙️ **Easy setup** - Simple GitHub token configuration
- 🔄 **Auto-updates** - Automatically checks for and installs new versions

## 🛠️ Setup

### 1. Generate GitHub Token
1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select scopes: `repo`, `read:org` (if needed)
4. Copy the token

### 2. Configure the App
1. Click the PR MenuBar icon in your menu bar
2. Click "Settings" in the context menu
3. Enter your GitHub repository details:
   - **Owner**: Your GitHub username or organization name
   - **Repository**: The repository name (e.g., `my-project`)
   - **Token**: Your GitHub personal access token
4. Click "Save Settings"

### 3. Start Monitoring
- The app will automatically start polling for PR updates
- You'll see the PR count in the menu bar icon
- Click the icon to view all pull requests

## 📱 Usage

### Menu Bar Icon
- **Normal state**: Shows the total number of open PRs
- **With notifications**: Icon changes when new PRs are detected
- **Click**: Opens the main PR list window

### Main Window
- **Metrics**: See open PRs and review requests at a glance
- **Filter buttons**: Click the 🔍 buttons to filter by status
- **PR list**: Click any PR to open it in your browser
- **Refresh**: Click the refresh button to manually update

### Settings
- **Repository**: Change which repository to monitor
- **Token**: Update your GitHub token
- **Auto-refresh**: Configure polling intervals
- **Check for Updates**: Manually check for new versions

## 🔧 Development

### Prerequisites
- Node.js 16+ 
- npm or yarn
- macOS 10.15+ (for building)

### Quick Start
```bash
# Clone and install
git clone https://github.com/Elliot-putt/pr-menubar-app.git
cd pr-menubar-app
npm install

# Run in development mode
npm run dev

# Build for distribution
npm run build:mac
```

### Development Commands

```bash
# Start development mode
npm run dev

# Build for macOS
npm run build:mac

# Build universal binary (Intel + Apple Silicon)
npm run build:mac-universal

# Build all targets
npm run build
```

## 🚨 Troubleshooting

### Common Issues

**App won't start**
- Check that you're running macOS 10.15 or later
- Try running from Applications folder
- Check Console.app for error messages

**Can't connect to GitHub**
- Verify your GitHub token is valid
- Check your internet connection
- Ensure the repository exists and is accessible

**No PRs showing**
- Verify repository owner and name are correct
- Check that the repository has open pull requests
- Try refreshing manually

**Menu bar icon missing**
- Check that the app is running
- Look in the menu bar overflow (arrow icon)
- Restart the app

**Auto-updates not working**
- Check your internet connection
- Verify the app has network permissions
- Try manually checking for updates in the tray menu

### Debug Mode
Run the app with debug logging:
```bash
npm run dev
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💬 Support

If you encounter any issues or have questions:
- [Open an issue](https://github.com/Elliot-putt/pr-menubar-app/issues)
- [Check the wiki](https://github.com/Elliot-putt/pr-menubar-app/wiki)
- [Join discussions](https://github.com/Elliot-putt/pr-menubar-app/discussions)

---

Made with ❤️ for GitHub developers 