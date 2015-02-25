# reichat

[![Build Status](https://secure.travis-ci.org/kanreisa/reichat.svg)](http://travis-ci.org/kanreisa/reichat)
[![npm version](https://badge.fury.io/js/reichat.svg)](http://badge.fury.io/js/reichat)
[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)
[![Deploy to Azure](https://azuredeploy.net/deploybutton.png)](https://azuredeploy.net/)

A simple paint chat application like a [PaintChatApp](http://hp.vector.co.jp/authors/VA016309/paintchat/download.html) built with Node.

![Logo](https://yabumi.cc/14b08e54b51e2abe7c7a55c7.svg)

**Currently in development.** see DEMO (below)

#### DEMO
* [reichat on Azure Websites](https://reichat-dev.azurewebsites.net/) (JP)
* [reichat on Heroku](https://reichat-dev.herokuapp.com/) (US)

Note: They are synchronized using Redis!

#### Screenshot
![](https://yabumi.cc/14b8d9ec1e1979afb2215b23.png)

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
* [PEP](https://github.com/jquery/PEP) (Pointer Events Polyfill) see [here](https://msopentech.com/blog/2014/12/17/jquery-adopts-pointer-events/)
* [Wacom WebPlugin](http://www.wacomeng.com/web/)
* [HTML Canvas 2D Context](http://www.w3.org/TR/2dcontext/)
* [Flagrate](https://flagrate.org/)

## Installing
```bash
npm install --global reichat
```

### if Azure Websites
[![Deploy to Azure](https://azuredeploy.net/deploybutton.png)](https://azuredeploy.net/)

#### for Experts
1. open your Websites Dashboard on Portal.
2. click ![Set up deployment from source control](https://yabumi.cc/14b721a34bddfc874d1b3f1e.png)
3. select **External repository** and next.
4. repository url is `https://github.com/kanreisa/reichat.git`.
5. done.

### if Heroku
[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

## Updating
```bash
npm update --global reichat
```

### if Azure Websites
1. open your Websites Dashboard on Portal.
2. go to the **DEPLOYMENTS**.
3. click ![SYNC](https://yabumi.cc/14b72219570b23ac4cf1d530.png) to sync latest version.

## Server
```bash
reichat --port 10133 --title "Example PaintChat Room"
```
### if Azure Websites / Heroku
commands don't needed. it works automatically.

## Server Configuration
reichat loads option values in the order of argument, config.json and ENV for each options.

option name         | Argument              | ENV (app settings)  | config.json      | default value
--------------------|-----------------------|---------------------|------------------|--------------
Path to config.json | --config              | -                   | -                | -
Host                | --host                | HOST                | host             | 0.0.0.0
Port                | --port                | PORT                | port             | 10133
Title               | --title               | TITLE               | title            | PaintChat
Canvas Width        | --canvas-width        | CANVAS_WIDTH        | canvasWidth      | 1920
Canvas Height       | --canvas-height       | CANVAS_HEIGHT       | canvasHeight     | 1080
Data Directory      | --data-dir            | DATA_DIR            | dataDir          | (tmpdir)
Data File Prefix    | --data-file-prefix    | DATA_FILE_PREFIX    | dataFilePrefix   | reichat_
Redis Host          | --redis-host          | REDIS_HOST          | redisHost        | -
Redis Port          | --redis-port          | REDIS_PORT          | redisPort        | 6379
Redis Password      | --redis-password      | REDIS_PASSWORD      | redisPassword    | -
Redis Key Prefix    | --redis-key-prefix    | REDIS_KEY_PREFIX    | redisKeyPrefix   | -
Max Paint Log Count | --max-paint-log-count | MAX_PAINT_LOG_COUNT | maxPaintLogCount | 2000
Max Chat Log Count  | --max-chat-log-count  | MAX_CHAT_LOG_COUNT  | maxChatLogCount  | 100
Forwarded Header    | --forwarded-header    | FORWARDED_HEADER    | forwardedHeader  | -

### Forwarded Header
if in trusted proxy you can use this option for logging.
* `XFF`

## Shortcuts
* Eyedropper
 * `Ctrl + Alt`
 * (Right Click)
* Eyedropper (Current Layer)
 * `Ctrl + Shift + Alt`
 * (`Shift` + Right Click)
* Hand Tool (Panning)
 * `Space`
* Switch to Last Tool
 * `Tab`
* Focus to Chat
 * `Enter`

## API
* /config
* /canvas
* /layers/0
* /layers/1
* /layers/2

## License
MIT
