const { app, BrowserWindow, screen, ipcMain } = require("electron");
const path = require("path");

if (process.platform === "linux") {
  app.commandLine.appendSwitch("enable-transparent-visuals");
}

let petWindow;
let dragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let dragTimer = null;

const WINDOW_WIDTH = 176;
const WINDOW_HEIGHT = 168;

function createPet() {
  const { x, y, width } = screen.getPrimaryDisplay().workArea;

  petWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,

    x: x + width - WINDOW_WIDTH - 16,
    y: y + 16,

    transparent: true,
    backgroundColor: "#00000000",
    frame: false,
    thickFrame: false,
    resizable: false,
    show: false,
    focusable: false,
    autoHideMenuBar: true,
    roundedCorners: false,
    type: process.platform === "linux" ? "toolbar" : undefined,

    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,

    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  petWindow.setMenu(null);
  petWindow.setAlwaysOnTop(true, "floating");
  petWindow.setBackgroundColor("#00000000");
  petWindow.setHasShadow(false);

  petWindow.once("ready-to-show", () => {
    petWindow.showInactive();
  });

  petWindow.loadFile("index.html");
}

ipcMain.on("pet-drag-start", (_event, cursor) => {
  if (!petWindow) return;

  const [winX, winY] = petWindow.getPosition();
  dragOffsetX = cursor.x - winX;
  dragOffsetY = cursor.y - winY;
  dragging = true;

  if (dragTimer) clearInterval(dragTimer);

  dragTimer = setInterval(() => {
    if (!dragging || !petWindow) return;
    const point = screen.getCursorScreenPoint();
    petWindow.setPosition(point.x - dragOffsetX, point.y - dragOffsetY);
  }, 16);
});

ipcMain.on("pet-drag-end", () => {
  dragging = false;
  if (dragTimer) {
    clearInterval(dragTimer);
    dragTimer = null;
  }
});

ipcMain.handle("get-pointer", () => {
  if (!petWindow || petWindow.isDestroyed()) {
    return null;
  }

  return {
    cursor: screen.getCursorScreenPoint(),
    bounds: petWindow.getContentBounds()
  };
});

app.whenReady().then(() => {
  const delay = process.platform === "linux" ? 400 : 0;
  setTimeout(createPet, delay);
});

app.on("window-all-closed", () => {
  app.quit();
});
