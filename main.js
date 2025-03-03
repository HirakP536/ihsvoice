const { app, BrowserWindow, Menu, Tray, dialog, ipcMain } = require("electron");
const AutoLaunch = require("electron-auto-launch");
const path = require("path");
const { autoUpdater } = require("electron-updater");
const { shell } = require("electron");
let alwaysOnTop = false;
let mainWindow;
let tray = null;
let isQuiting = false;
let isStartupEnabled = true; //default : active

//Ensure only single instance is open.
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

  //AutoStart UP on boot.
  let myAppLauncher = new AutoLaunch({
    name: "IHSVoice",
    path: app.getPath("exe"),
  });
  myAppLauncher.isEnabled().then((enabled) => {
    isStartupEnabled = enabled;
  });

  // When app opens.
  app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
      width: 300,
      height: 550,
      title: "IHSVoice",
      icon: path.join(__dirname, "icon.ico"),
      backgroundColor: "#ffffff",
      resizable: false,
      frame: true,
      autoHideMenuBar: true,
      titleBarStyle: "default",
      show: false, // Start hidden, will show later
      webPreferences: {
        nodeIntegration: true,
        preload: path.join(__dirname, "preload.js"),
        disableBlinkFeatures: "OverlayScrollbars",
      },
    });

    //Webpage link.
    const APP_URL = "https://phone.ihs.host/IHSVoice.html";
    mainWindow.loadURL(APP_URL);

    //Scroll bar fix.
    mainWindow.webContents.on("did-finish-load", () => {
      mainWindow.webContents.insertCSS(`
            html, body {
                overflow: hidden !important;
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 0;
            }
            ::-webkit-scrollbar {
                width: 0px;
                height: 0px;
                display: none;
            }
        `);
    });

    // Tray Section.
    app.whenReady().then(() => {
      tray = new Tray(path.join(__dirname, "icon.ico"));

      const contextMenu = Menu.buildFromTemplate([
        {
          label: "Show App",
          click: () => {
            mainWindow.show();
            mainWindow.focus();
          },
        },
        {
          label: "More",
          submenu: [  // Submenu that appears on hover
            {
              label: "Always on Top",
              type: "checkbox",
              checked: alwaysOnTop,
              click: (menuItem) => {
                alwaysOnTop = menuItem.checked;
                mainWindow.setAlwaysOnTop(alwaysOnTop);
              },
            },
            {
              label: "Open at Startup",
              type: "checkbox",
              checked: isStartupEnabled,
              click: (menuItem) => {
                if (menuItem.checked) {
                  myAppLauncher.enable();
                  isStartupEnabled = true;
                } else {
                  myAppLauncher.disable();
                  isStartupEnabled = false;
                }
              },
            },
            {
              label: "Download NS Plugin",
              click: () => {
                shell.openExternal("https://example.com/ns-plugin-download"); // Replace with actual URL
              },
            },
            {
              label: "Check for Updates",
              click: () => {
                checkForUpdates();
              },
            },
          ],
        },
        {
          label: "Quit",
          click: () => {
            isQuiting = true;
            app.quit();
          },
        },
      ]);
      

      tray.setToolTip("IHSVoice");
      tray.setContextMenu(contextMenu);

      tray.on("double-click", () => {
        mainWindow.show();
        mainWindow.focus();
      });
    });

    //Auto Refresh Tray
    // function updateTrayMenu() {
    //   myAppLauncher.isEnabled().then((enabled) => {
    //     isStartupEnabled = enabled;

    //     const contextMenu = Menu.buildFromTemplate([
    //       {
    //         label: "Show App",
    //         click: () => {
    //           mainWindow.show();
    //           mainWindow.focus();
    //         },
    //       },
    //       {
    //         label: "Always on Top",
    //         type: "checkbox",
    //         checked: alwaysOnTop,
    //         click: (menuItem) => {
    //           alwaysOnTop = menuItem.checked;
    //           mainWindow.setAlwaysOnTop(alwaysOnTop);
    //         },
    //       },
    //       {
    //         label: "Enable Open at Startup",
    //         type: "checkbox",
    //         checked: isStartupEnabled,
    //         click: (menuItem) => {
    //           if (menuItem.checked) {
    //             myAppLauncher.enable();
    //           } else {
    //             myAppLauncher.disable();
    //           }
    //           updateTrayMenu(); // Refresh the tray menu
    //         },
    //       },
    //       {
    //         label: "Check for Updates",
    //         click: () => {
    //           checkForUpdates();
    //         },
    //       },
    //       {
    //         label: "Quit",
    //         click: () => {
    //           isQuiting = true;
    //           app.quit();
    //         },
    //       },
    //     ]);

    //     tray.setContextMenu(contextMenu);
    //   });
    // }

    // Show window on startup
    mainWindow.once("ready-to-show", () => {
      mainWindow.show();
    });

    mainWindow.on("close", (event) => {
      if (!isQuiting) {
        event.preventDefault();
        mainWindow.hide();
      }
    });

    // Check for updates function
    function checkForUpdates() {
      dialog.showMessageBox({
        type: "info",
        title: "Checking for Updates",
        message: "Looking for updates...",
      });

      autoUpdater.checkForUpdatesAndNotify();

      autoUpdater.on("update-available", () => {
        dialog.showMessageBox({
          type: "info",
          title: "Update Available",
          message: "A new update is available. Downloading now...",
        });
      });

      autoUpdater.on("update-not-available", () => {
        dialog.showMessageBox({
          type: "info",
          title: "No Updates",
          message: "Your application is up to date.",
        });
      });

      autoUpdater.on("error", (error) => {
        dialog.showErrorBox(
          "Update Error",
          error == null ? "Unknown" : error.message
        );
      });
    }

    // Call popup on incoming call.
    mainWindow.webContents.on("did-navigate-in-page", (event, currentURL) => {
      console.log("Navigated to:", currentURL);

      let lastBounds = null; // Store last position & size before minimizing

      if (currentURL.includes("#page_call")) {
        console.log("Handling page call...");

        if (mainWindow.isMinimized()) {
          console.log("Window is minimized, restoring...");

          //To ensure that when screen pops up during incoming call it comes back to previous minimize location.
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

      // Storing minimize window location for restoring it back to original area.
      mainWindow.on("minimize", () => {
        lastBounds = mainWindow.getBounds(); // Save position & size
        console.log("Stored last position before minimizing:", lastBounds);
      });
    });
  });

  // Updating tray for startup at boot.
  myAppLauncher.isEnabled().then((enabled) => {
    isStartupEnabled = enabled;
    updateTrayMenu();
  });

  // Prevent app from quitting when all windows are closed.
  app.on("window-all-closed", (event) => {
    event.preventDefault();
  });
}
