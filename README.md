# [![Deploy to Azure](http://azuredeploy.net/deploybutton.png)](https://azuredeploy.net/) reichat
A simple paint chat application like a [PaintChatApp](http://hp.vector.co.jp/authors/VA016309/paintchat/download.html) built with Node.

![Logo](https://yabumi.cc/14b08e54b51e2abe7c7a55c7.svg)

**Currently in development.** see [demo](https://reichat-dev.azurewebsites.net/)

#### Features
* **Pen Input Support**
* Layers
* Binary Pen / Pencil / Brush
* Pen / Pencil / Brush
* Watercolor Brush
* Pixel Copy / Move
* Zoom in / out / fullscreen
* Chat
* Stabilizer

#### Designed for
* Pen Devices (**pressure/eraser supported**)
* Internet Explorer 11
* Google Chrome 40
* Mozilla Firefox 35

#### Powered by
* [Node.js](http://nodejs.org/)
* [Pointer Events](http://www.w3.org/TR/pointerevents/) (for Internet Explorer 11) see [here](https://msdn.microsoft.com/en-us/library/ie/dn433244(v=vs.85).aspx)
* [Wacom WebPlugin](http://www.wacomeng.com/web/)
* [HTML Canvas 2D Context](http://www.w3.org/TR/2dcontext/)
* [Flagrate](https://flagrate.org/)

## Installing
```bash
npm install --global reichat
```

### if Azure Websites
Go to the Kudu (e.g. //**WEBSITES_NAME**.scm.azurewebsites.net/DebugConsole/?shell=powershell) and then type on console like this:
```powershell
cd \home\site\wwwroot
git clone git://github.com/kanreisa/reichat.git .
npm install
```
optional, You can configuration by **app settings** on Portal (e.g. //manage.windowsazure.com/@**DIRECTORY**#Workspaces/WebsiteExtension/Website/**WEBSITES_NAME**/configure

## Server
```bash
reichat --port 10133 --title "Example PaintChat Room"
```
### if Azure Websites
commands don't needed. see the **Web.config**

### Server Configuration
reichat loads option values in the order of argument, config.json and ENV for each options.

option name         | Argument              | ENV (app settings)  | config.json      | default value
--------------------|-----------------------|---------------------|------------------|--------------
Path to config.json | --config              | -                   | -                | -
Host                | --host                | HOST                | host             | 0.0.0.0
Port                | --port                | PORT                | port             | 10133
Title               | --title               | TITLE               | title            | reichat
Max Paint Log Count | --max-paint-log-count | MAX_PAINT_LOG_COUNT | maxPaintLogCount | 2000
Max Chat Log Count  | --max-chat-log-count  | MAX_CHAT_LOG_COUNT  | maxChatLogCount  | 200

### API
* /config
* /canvas
* /layers/0
* /layers/1
* /layers/2

## License
MIT
