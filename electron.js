module.exports = function(Config) {
	// open electron window
	const { app, BrowserWindow } = require('electron');
	const url = require('url');
	const path = require('path');

	let win;

	function createWindow() {
		// Create the browser window.
		win = new BrowserWindow({
			width: 600,
			height: 650,
			icon: "client/public/ab_radio_192.png",
		});

		// and load the index.html of the app.
		const startUrl = process.env.ELECTRON_START_URL || url.format({
			pathname: path.join(__dirname, './client/build/index.html'),
			protocol: 'file:',
			slashes: true
		});
		win.loadURL(startUrl);

		// Open the DevTools.
		if (process.env.ELECTRON_START_URL) win.webContents.openDevTools();

		// Emitted when the window is closed.
		win.on('closed', () => {
			// Dereference the window object, usually you would store windows
			// in an array if your app supports multi windows, this is the time
			// when you should delete the corresponding element.
			win = null;
		})
	}

	// This method will be called when Electron has finished
	// initialization and is ready to create browser windows.
	// Some APIs can only be used after this event occurs.
	app.on('ready', createWindow);

	// Quit when all windows are closed.
	app.on('window-all-closed', () => {
		// stop predictors
		Config.exit();

		// On macOS it is common for applications and their menu bar
		// to stay active until the user quits explicitly with Cmd + Q
		if (process.platform !== 'darwin') {
			app.quit()
		}
	});

	app.on('activate', () => {
		// On macOS it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (win === null) {
			createWindow()
		}
	});
}