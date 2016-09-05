const electron = require('electron');
const child = require('child_process');
const {ipcMain, dialog} = require('electron');
const chokidar = require('chokidar');
const path = require('path');
const gitParser = require('./src/gitParser/gitparser.js');
const exec = child.exec();
const fork = child.fork(`${__dirname}/src/terminal/fork.js`);
//var ls = child.fork('fork.js');
const Shell = require ('shelljs');
const fs = require('fs');
const Rx = require('rxjs/Rx');


/******************************************************************************
        *** Core Electron Startup Process ***
*******************************************************************************/
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow


function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 900,
    minHeight: 600
  })

  /*********************
  *** For Deployment ***
  *********************/
  // replace dev.html with index.html in root directory
  mainWindow.loadURL(`file://${__dirname}/dev.html`)

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow()
  }
})

/******************************************************************************
        *** File Watching and Emitting Events to Rendering Process ***
        Following methods, when triggered, calls git parser to parse log event
        then send that event and data to the render process in app.js
*******************************************************************************/
// to receive the path of file to be watched from renderer process,
ipcMain.on('dirChoice', function(event, input) {
  openDirChoice();
});
// sets file watching and triggers event chain when git log is modified
function openDirChoice() {
  let projectPath = dialog.showOpenDialog({properties: ['openFile', 'openDirectory', 'multiSelections']});
  if(!projectPath)dialog.showErrorBox("No File Selected", "Make sure you have chosen your project's root folder or that you have made at least one Git commit")
  else {
    // to resolve to home path and append path given from renderer process
    var gitPath = (path.resolve('~', projectPath.toString()));

    //Creates observable from fs method
    var fileSource = Rx.Observable.bindNodeCallback(fs.readFile);


    // Watches for  local git activity, sends most revent git event to renderer process
    chokidar.watch((gitPath + '/.git/logs/HEAD'), {ignoreInitial: true}).on('all', function (event, path){
      let fileSourceObservable = fileSource(gitPath + '/.git/logs/HEAD', 'utf8');
      fileSourceObservable.map(x => x.split('\n'))
        .flatMap(x => x)
        .filter(x => x.length > 40)
        .last()
        .map(x => gitParser.parseGit(x))
        .subscribe(x => mainWindow.webContents.send('parsedCommit', x));
      });

  // Loads entire local user's git log history after file path chosen on UI
  let fileSourceObservable = fileSource(gitPath + '/.git/logs/HEAD', 'utf8');
        fileSourceObservable.map(x => x.split('\n'))
          .flatMap(x => x)
          .filter(x => x.length > 40)
          .map(x => gitParser.parseGit(x))
          .toArray(x => x)
          .subscribe(x => mainWindow.webContents.send('parsedCommitAll', x), e => console.log('Error on fullGitLog: ' + e), () => console.log('gitFullLogDone'));

  // // Wrap the exists method TODO: ADD FILE VERIFICATION
  var exists = Rx.Observable.bindCallback(fs.exists);
  var existsSource = exists(projectPath + '/.git/logs/HEAD');
  // Get the first argument only which is true/false
  var existsSubsription = existsSource.subscribe(
    function (x) { (x)? console.log('valid'): dialog.showErrorBox("No Git File found", "Make sure you have chosen your project's root folder or that you have made at least one Git commit") },
    function (e) { console.log('onError: %s', e); },
    function ()  { console.log('onCompleted'); });
    }
};
/******************************************************************************
        *** Terminal Emulation ***
*******************************************************************************/

// receive input from terminal

ipcMain.on('term-input', (event, input) => {
  fork.send(input)
})

// ipcMain.on('send-dir', dir => {
//   console.log('ipc main send-dir firing')
//   mainWindow.webContents.send('send-dir', dir)
// })

ipcMain.on('get-dir', () => {
  //const fork = child.fork(`${__dirname}/fork.js`);
  console.log('ipc main get-dir firing')
  fork.send('get-dir')
})
fork.on('message', m => {
  if(m.dirOnly) {
    console.log(m.dirOnly)
    mainWindow.webContents.send('send-dir', m)
  }
  else mainWindow.webContents.send('reply', m)
  //mainWindow.webContents.send('reply', m)
})
