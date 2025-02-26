const { ipcRenderer } = require("electron");

// Load stored settings
ipcRenderer.on("load-settings", (event, settings) => {
    document.querySelector("#volumeCheckbox").checked = settings.alwaysDisplayVolume;
    document.querySelector("#audioDeviceCheckbox").checked = settings.alwaysDisplayAudioDevice;
});

// Update settings when checkboxes change
document.querySelector("#volumeCheckbox").addEventListener("change", (event) => {
    ipcRenderer.send("update-settings", { alwaysDisplayVolume: event.target.checked });
});

document.querySelector("#audioDeviceCheckbox").addEventListener("change", (event) => {
    ipcRenderer.send("update-settings", { alwaysDisplayAudioDevice: event.target.checked });
});
