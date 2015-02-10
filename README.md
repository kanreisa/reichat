# reichat [![Deploy to Azure](http://azuredeploy.net/deploybutton.png)](https://azuredeploy.net/)
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
[![Deploy to Azure](http://azuredeploy.net/deploybutton.png)](https://azuredeploy.net/)

#### for Experts
1. open your Websites Dashboard on Portal.
2. click this: ![Set up deployment from source control](https://yabumi.cc/14b721a34bddfc874d1b3f1e.png)
3. select ***External repository*** and next.
4. repository url is `https://github.com/kanreisa/reichat.git`.
5. done.

## Updating
```bash
npm update --global reichat
```

### if Azure Websites
1. open your Websites Dashboard on Portal.
2. go to the ***DEPLOYMENTS***.
3. click this: ![SYNC](https://yabumi.cc/14b72219570b23ac4cf1d530.png)

### if Azure Websites

## Server
```bash
reichat --port 10133 --title "Example PaintChat Room"
```
### if Azure Websites
commands don't needed. it works automatically with **Web.config**.

## Server Configuration
reichat loads option values in the order of argument, config.json and ENV for each options.

option name         | Argument              | ENV (app settings)  | config.json      | default value
--------------------|-----------------------|---------------------|------------------|--------------
Path to config.json | --config              | -                   | -                | -
Host                | --host                | HOST                | host             | 0.0.0.0
Port                | --port                | PORT                | port             | 10133
Title               | --title               | TITLE               | title            | reichat
Canvas Width        | --canvas-width        | CANVAS_WIDTH        | canvasWidth      | 1920
Canvas Height       | --canvas-height       | CANVAS_HEIGHT       | canvasHeight     | 1080
Max Paint Log Count | --max-paint-log-count | MAX_PAINT_LOG_COUNT | maxPaintLogCount | 2000
Max Chat Log Count  | --max-chat-log-count  | MAX_CHAT_LOG_COUNT  | maxChatLogCount  | 200

## API
* /config
* /canvas
* /layers/0
* /layers/1
* /layers/2

## License
MIT
