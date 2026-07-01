<div align="center">

<img src="src/assets/Tmurv-logo.png" alt="Logo Tmurv" width="100px">

# Tmurv

[![GitHub stars](https://img.shields.io/github/stars/BUGA-M/Tmurv?style=for-the-badge&logo=github)](https://github.com/BUGA-M/Tmurv/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/BUGA-M/Tmurv?style=for-the-badge&logo=github)](https://github.com/BUGA-M/Tmurv/network/members)
[![Made with Tauri](https://img.shields.io/badge/Made%20with-Tauri-24C8DB?style=for-the-badge&logo=tauri&logoColor=white)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

<br>

*A sleek, modern, and distraction-free desktop Pomodoro planner widget.*

</div>

---

## 📋 About

**Tmurv** (Timer + Curve/Plan) is a desktop productivity companion built using Tauri 2, React, and TypeScript. Featuring a high-end glassmorphism floating widget design, it combines a Pomodoro timer with an interactive timeline planner, custom audio alert uploads (validated securely via Rust), and native desktop notifications. Tmurv is designed to help you stay in flow, structure your intervals, and minimize cleanly out of your way.

## 🚀 Features

### Core Functionality

- **Smart Cycle Tracking**: Automatic alternation between Focus sessions (default 25m) and Break sessions.
- **Milestone Break Trigger**: Completing 4 consecutive focus sessions automatically rewards you with a Long Break.
- **Dynamic Tab Layout**: Switch seamlessly between the Timer view, Cycle Schema Plan, and Parameters panel.
- **Titlebar Time Sync**: Track the remaining focus/break time directly from the application's window title bar.

### User Experience & Customization

- **Glassmorphism UI**: Beautiful, borderless design layout that fits cleanly on your desktop with custom dragging regions and control buttons.
- **Flexible Plan durations**: Adjust Focus, Short Break, and Long Break durations (in minutes) via the planning interface, dynamically recalculating the timeline.
- **Custom Alert Audio**: Upload and select your own alert sound files (MP3 or WAV). File type validity is checked natively in Rust via magic number inspections.
- **Desktop Notifications**: Real-time native OS notifications on focus completion, break starting, and break expiration.
- **System Tray Integration**: Optional setting to minimize to the tray on close, keeping the timer active silently in the background.

## 🛠️ Technology Stack

- **Frontend Framework**: React 19 with Vite
- **Programming Languages**: TypeScript (Frontend), Rust (Backend)
- **Desktop Engine**: Tauri v2
- **State & Storage**: `@tauri-apps/plugin-store` (persistence of user preferences and timer values)
- **Native Integrations**:
  - `@tauri-apps/plugin-notification` (OS banners)
  - `@tauri-apps/plugin-dialog` (custom file-picker window)
  - `@tauri-apps/plugin-fs` (sandboxed file directory management)

## 📋 System Requirements

- **Operating System**: Windows 10/11, Linux (Ubuntu/Debian, Fedora, etc.), or macOS
- **Memory**: Extremely lightweight footprint (~30-50MB RAM)
- **Storage**: ~30MB disk space for the binary (plus space for custom alert audios)

## 🚀 Setup & Build

### 🧑‍💻 Development Setup

To run and build the application locally from source, ensure you have [Node.js](https://nodejs.org/) and [Rust/Cargo](https://www.rust-lang.org/tools/install) installed.

```bash
# 1. Clone the repository
git clone https://github.com/BUGA-M/Tmurv.git
cd Tmurv

# 2. Install dependencies
npm install

# 3. Start development environment
npm run tauri dev
```

### 📦 Building for Production

Compile native executables and setup files optimized for your target platform:

```bash
npm run tauri build
```
The compiled files and installers (e.g. `.msi`, `.deb`, `.appimage`) will be generated inside the `src-tauri/target/release/bundle/` folder.

## 🎯 Usage

### 1. Timer Tab
- Press **Play** to start your current session.
- Press **Pause** or **Stop** (Reset) to manage the countdown.
- When a phase finishes, click **Dismiss** to silence the active alarm and start the next phase.

### 2. Plan Tab
- Inspect the visual sequence of Focus and Break nodes representing the complete Pomodoro schema.
- Enter custom minutes for Focus, Short Break, and Long Break durations. Changes save automatically.

### 3. Settings Tab
- **Minimize to System Tray**: If enabled, closing the window hides it in the tray instead of shutting down.
- **Desk Notifications**: Toggle native system notification popups.
- **Alert Sound**: Upload custom sound files (MP3/WAV) or select/delete existing ones from the menu.

## 📁 File Structure

```
Tmurv/
├── src/                    # Frontend React source code
│   ├── assets/            # App icons, logo resources (Tmurv-logo.png)
│   ├── components/        # UI components: Timer, PlanPanel, SettingsPanel
│   ├── hooks/            # usePomodoro state hook and Tauri APIs
│   ├── main.tsx          # Application bootstrapper
│   ├── App.tsx           # Layout, tab navigation, and drag title bar
│   └── index.css         # Styling system declarations & glassmorphism theme
├── src-tauri/             # Rust desktop wrapper & backend code
│   ├── src/
│   │   └── lib.rs         # System tray event loop & custom upload commands
│   ├── resources/         # Default sound resources bundled with installer
│   ├── icons/             # Custom application window icons
│   ├── Cargo.toml         # Rust backend dependencies
│   └── tauri.conf.json   # Tauri v2 configuration settings
└── package.json          # Node dependencies & project scripts
```

## 🔧 Configuration

All settings and configurations are kept safe across sessions in your local system configuration folder (`settings.json`):
- **Windows**: `%APPDATA%/com.buga.tmurv/settings.json`
- **Linux**: `~/.config/com.buga.tmurv/settings.json`
- **macOS**: `~/Library/Application Support/com.buga.tmurv/settings.json`

Custom alert sound uploads are copied into a `sounds/` subfolder at the same config path.

## 🐛 Troubleshooting

### Common Issues

**Sound Upload Error**
- Ensure the selected file is a valid `.mp3` or `.wav` format. Tmurv scans the file headers natively using Rust to ensure the media file is not corrupted or malformed.

**Notifications Do Not Pop Up**
- Verify that system notifications are enabled for Tmurv in your operating system settings.

**App Doesn't Close / Disappeared**
- When *Minimize to System Tray* is active, clicking "X" hides the window. Right-click the Tmurv icon in your taskbar tray and click **Quitter** (Quit), or left-click it to bring the application back.

## 🤝 Contributing

We welcome contributions!
1. Fork the repository
2. Create your branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Tauri**: The awesome lightweight desktop toolkit
- **React & TypeScript**: Modern frontend developer experience
- **Lucide Icons**: Crisp and beautiful open-source icons

## 🔄 Version History

### v0.1.0 (Current)
- Initial release.
- Pomodoro timer state loop with cycle configurations.
- Dynamic glassmorphic UI.
- Desktop notifications & system tray persistence.
- Secure custom sound uploader.

---

<div align="center">

![Tmurv-logo2](src/assets/Tmurv-logo2.png)

**Made with ❤️ by BUGA**

*Tmurv - Sleek and secure Pomodoro timer.*

</div>
