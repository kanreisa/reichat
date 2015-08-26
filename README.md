[![reichat](https://yabumi.cc/14bc26704ec04392c1627b2a.svg)](https://github.com/kanreisa/reichat)

A lovely paint chat application like a [PaintChatApp](http://hp.vector.co.jp/authors/VA016309/paintchat/download.html) built with [Node](https://nodejs.org/).

[![npm version][npm-img]][npm-url]
[![Linux Build][travis-img]][travis-url]
[![Windows Build][appveyor-img]][appveyor-url]
[![Dependency Status][dep-img]][dep-url]
[![devDependency Status][devdep-img]][devdep-url]

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)
[![Deploy to Azure](https://azuredeploy.net/deploybutton.png?_nonce=1425633252963)](https://azuredeploy.net/?repository=https://github.com/kanreisa/reichat)

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

* Pen Device (**pressure/eraser supported**)
 * Wacom Cintiq
 * Wacom Intuos
 * Wacom feel IT
 * Microsoft Surface Pen (Surface Pro 3 / Surface 3)
 * Microsoft Pro Pen (Surface Pro / Surface Pro 2)
* Windows 8.1
 * Internet Explorer 11
* Windows 10
 * Microsoft Edge
* Mac OS X Yosemite (10.10)
 * Google Chrome 44
 * Mozilla Firefox 40

#### Powered by

* [Node.js](http://nodejs.org/)
* [Pointer Events](http://www.w3.org/TR/pointerevents/) (for Internet Explorer 11) see [here](https://msdn.microsoft.com/en-us/library/ie/dn433244(v=vs.85).aspx)
* [PEP](https://github.com/jquery/PEP) (Pointer Events Polyfill) see [here](https://msopentech.com/blog/2014/12/17/jquery-adopts-pointer-events/)
* [HTML Canvas 2D Context](http://www.w3.org/TR/2dcontext/)
* [Flagrate](https://flagrate.org/)

## Installing

```bash
$ npm install --global reichat
```

### Case: Azure Websites

[![Deploy to Azure](https://azuredeploy.net/deploybutton.png?_nonce=1425633252963)](https://azuredeploy.net/?repository=https://github.com/kanreisa/reichat)

#### for Experts

1. open your Websites Dashboard on Portal.
2. click ![Set up deployment from source control](https://yabumi.cc/14b721a34bddfc874d1b3f1e.png)
3. select **External repository** and next.
4. repository url is `https://github.com/kanreisa/reichat.git`.
5. done.

### Case: Heroku

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

## Updating

```bash
$ npm update --global reichat
```

### Case: Azure Websites

1. open your Websites Dashboard on Portal.
2. go to the **DEPLOYMENTS**.
3. click ![SYNC](https://yabumi.cc/14b72219570b23ac4cf1d530.png) to sync latest version.

## Server

```bash
$ reichat # start simply with default configurations
$ reichat --port 10133 --title "Example PaintChat Room"
$ reichat --version
$ reichat --help
```
### Case: Azure Websites / Heroku

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

## Frequency Asked Questions

#### Pen Pressure ?
* Currently, Pen Pressure supported on Windows.
* Please use Microsoft Edge or Internet Explorer 11.

## License

[MIT](LICENSE)

![Logo](https://yabumi.cc/14b08e54b51e2abe7c7a55c7.svg)

[npm-img]: https://img.shields.io/npm/v/reichat.svg
[npm-url]: https://npmjs.org/package/reichat
[travis-img]: https://img.shields.io/travis/kanreisa/reichat.svg
[travis-url]: https://travis-ci.org/kanreisa/reichat
[appveyor-img]: https://img.shields.io/appveyor/ci/kanreisa/reichat.svg
[appveyor-url]: https://ci.appveyor.com/project/kanreisa/reichat
[dep-img]: https://david-dm.org/kanreisa/reichat.svg
[dep-url]: https://david-dm.org/kanreisa/reichat
[devdep-img]: https://david-dm.org/kanreisa/reichat/dev-status.svg
[devdep-url]: https://david-dm.org/kanreisa/reichat#info=devDependencies
