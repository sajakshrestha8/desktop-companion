const {
  app,
  BrowserWindow,
  screen,
  ipcMain,
  Tray,
  Menu,
  nativeImage
} = require("electron");
const path = require("path");

if (process.platform === "linux") {
  app.commandLine.appendSwitch("enable-transparent-visuals");
}

let petWindow;
let tray;
let dragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let dragTimer = null;

console.log(dragTimer)

const WINDOW_WIDTH = 176;
const WINDOW_HEIGHT = 168;
const TRAY_ICON_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
    <path fill="#202020" d="M2 5 3 1l3 2h4l3-2 1 4v5c0 3-2 5-6 5s-6-2-6-5V5Z"/>
    <path fill="#f39c38" d="M4 5 4 3l2 2h4l2-2v7c0 2-2 3-4 3s-4-1-4-3V5Z"/>
    <path fill="#202020" d="M5 7h2v2H5zm4 0h2v2H9zm-2 3h2v1H7z"/>
  </svg>
`;

function stopDragging() {
  dragging = false;

  if (dragTimer) {
    clearInterval(dragTimer);
    dragTimer = null;
  }
}

function updateTrayMenu() {
  if (!tray) return;

  const isVisible =
    petWindow && !petWindow.isDestroyed() && petWindow.isVisible();

  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: isVisible ? "Hide Pixel Pet" : "Show Pixel Pet",
        click: togglePetVisibility
      },
      { type: "separator" },
      {
        label: "Quit",
        click: () => app.quit()
      }
    ])
  );
}

function togglePetVisibility() {
  if (!petWindow || petWindow.isDestroyed()) return;

  if (petWindow.isVisible()) {
    stopDragging();
    petWindow.hide();
  } else {
    petWindow.showInactive();
  }

  updateTrayMenu();
}

function createTray() {
  const iconUrl = `data:image/svg+xml;base64,${Buffer.from(
    TRAY_ICON_SVG
  ).toString("base64")}`;
  const icon = nativeImage.createFromDataURL(iconUrl).resize({
    width: 16,
    height: 16
  });

  tray = new Tray(icon);
  tray.setToolTip("Pixel Pet");
  tray.on("click", togglePetVisibility);
  updateTrayMenu();
}

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
    updateTrayMenu();
  });

  petWindow.loadFile("index.html");
}

ipcMain.on("pet-drag-start", (_event, cursor) => {
  if (
    !petWindow ||
    petWindow.isDestroyed() ||
    !cursor ||
    !Number.isFinite(cursor.x) ||
    !Number.isFinite(cursor.y)
  ) {
    return;
  }

  const [winX, winY] = petWindow.getPosition();
  dragOffsetX = cursor.x - winX;
  dragOffsetY = cursor.y - winY;
  dragging = true;

  if (dragTimer) clearInterval(dragTimer);

  dragTimer = setInterval(() => {
    if (!dragging || !petWindow || petWindow.isDestroyed()) return;
    const point = screen.getCursorScreenPoint();
    const nextX = Math.round(point.x - dragOffsetX);
    const nextY = Math.round(point.y - dragOffsetY);
    petWindow.setPosition(nextX, nextY);
  }, 16);
});

ipcMain.on("pet-drag-end", () => {
  stopDragging();
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
  createTray();

  const delay = process.platform === "linux" ? 400 : 0;
  setTimeout(createPet, delay);
});

app.on("window-all-closed", () => {
  app.quit();
});
