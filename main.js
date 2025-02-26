const { app, BrowserWindow, Menu, Tray } = require("electron");
const path = require("path");

let mainWindow;
let tray = null;
let isQuiting = false;

// Ensure a single instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit(); // Quit the second instance immediately
} else {
  app.on("second-instance", () => {
    // If the app is already running, focus the existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
      width: 350,
      height: 550,
      title: "IHSVoice",
      icon: path.join(__dirname, "icon.ico"),
      resizable: false,
      frame: true,
      autoHideMenuBar: true,
      titleBarStyle: "default",
      show: false, // Start hidden, will show later
      webPreferences: {
        nodeIntegration: true,
      },
    });

    const APP_URL = "https://phone.ihs.host/IHSVoice.html";
    // const APP_URL = "http://localhost:5501/softphone.html";
    mainWindow.loadURL(APP_URL);

    tray = new Tray(path.join(__dirname, "icon.ico")); // Ensure this file exists

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Show App",
        click: () => {
          mainWindow.show();
          mainWindow.focus();
        },
      },
      {
        label: "Quit",
        click: () => {
          isQuiting = true;
          app.quit();
        },
      },
    ]);

    tray.setToolTip("IHSVoice App");
    tray.setContextMenu(contextMenu);

    // Show window on startup
    mainWindow.once("ready-to-show", () => {
      mainWindow.show();
    });

    // Hide window instead of closing
    mainWindow.on("close", (event) => {
      if (!isQuiting) {
        event.preventDefault();
        mainWindow.hide();
      }
    });

    // Double-click on tray icon to show app
    tray.on("double-click", () => {
      mainWindow.show();
      mainWindow.focus();
    });

    // Monitor URL for auto-resizing and showing window
    mainWindow.webContents.on("did-navigate-in-page", (event, currentURL) => {
      console.log("Navigated to:", currentURL);

      let lastBounds = null; // Store last position & size before minimizing

      if (currentURL.includes("#page_call")) {
        console.log("Handling page call...");

        if (mainWindow.isMinimized()) {
          console.log("Window is minimized, restoring...");

          // Restore the window and place it back in the previous location
          mainWindow.restore();

          if (lastBounds) {
            mainWindow.setBounds(lastBounds);
          }
        } else if (!mainWindow.isVisible()) {
          console.log("Window is in the system tray, restoring...");
          mainWindow.show();

          if (lastBounds) {
            mainWindow.setBounds(lastBounds);
          }
        } else {
          console.log("Window is already in focus, no need to move.");
        }

        mainWindow.focus();
      }

      // Listen for window minimize event to store last position & size
      mainWindow.on("minimize", () => {
        lastBounds = mainWindow.getBounds(); // Save position & size
        console.log("Stored last position before minimizing:", lastBounds);
      });
    });
  });

  // Prevent app from quitting when all windows are closed
  app.on("window-all-closed", (event) => {
    event.preventDefault();
  });
}
