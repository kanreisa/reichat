#!/usr/bin/env node
/*!
 *  reichat server
 *
 *  Copyright (c) 2015 Yuki KAN
 *  https://github.com/kanreisa
**/
/*jslint node:true, nomen:true, plusplus:true, regexp:true, vars:true, continue:true, bitwise:true */
'use strict';

process.title = 'reichat server';

var pkg = require('../package.json');

var util = require('util');
var path = require('path');
var http = require('http');
var fs = require('fs');

var opts = require('opts');
var uuid = require('uuid');
var socketio = require('socket.io');
var PNG = require('node-png').PNG;

opts.parse([
	{
		short: 'v',
		long: 'version',
		description: 'Show version and exit',
		callback: function () {
			
			util.puts(pkg.version);
			process.exit(1);
		}
	},
	{
		long: 'config',
		description: 'Load a config file',
		value: true
	},
	{
		long: 'host',
		description: 'Listening host',
		value: true
	},
	{
		long: 'port',
		description: 'Listening port',
		value: true
	},
	{
		long: 'title',
		description: 'Title of chat room',
		value: true
	},
	{
		long: 'width',
		description: 'Width of canvas',
		value: true
	},
	{
		long: 'height',
		description: 'Height of canvas',
		value: true
	},
	{
		long: 'max-paint-log-count',
		value: true
	},
	{
		long: 'max-chat-log-count',
		value: true
	}
].reverse(), true);

var config = opts.get('config') ? require(opts.get('config')) : {};

config.host = opts.get('host') || config.host || process.env.HOST || '0.0.0.0';
config.port = opts.get('port') || config.port || process.env.PORT || 10133;
config.title = opts.get('title') || config.title || process.env.TITLE || 'reichat';
config.canvasWidth = parseInt(opts.get('canvas-width') || config.canvasWidth || process.env.CANVAS_WIDTH || 1920, 10);
config.canvasHeight = parseInt(opts.get('canvas-height') || config.canvasHeight || process.env.CANVAS_HEIGHT || 1080, 10);
config.maxPaintLogCount = parseInt(opts.get('max-paint-log-count') || config.maxPaintLogCount || process.env.MAX_PAINT_LOG_COUNT || 2000, 10);
config.maxChatLogCount = parseInt(opts.get('max-chat-log-count') || config.maxChatLogCount || process.env.MAX_CHAT_LOG_COUNT || 200, 10);

var layers = [
	new Buffer(config.canvasWidth * config.canvasHeight * 4),// Layer 0
	new Buffer(config.canvasWidth * config.canvasHeight * 4),
	new Buffer(config.canvasWidth * config.canvasHeight * 4)
];

var server = http.createServer(function (req, res) {
	
	res.setHeader('Accept-Ranges', 'none');
	res.setHeader('Cache-Control', 'no-cache');
	res.setHeader('Pragma', 'no-cache');
	res.setHeader('Server', 'reichat/' + pkg.version);
	res.setHeader('X-Content-Type-Options', 'nosniff');
	
	if (req.method === 'GET' && req.url === '/config') {
		res.writeHead(200, {
			'Content-Type': 'application/json; charset=utf-8'
		});
		
		res.end(JSON.stringify({
			title: config.title,
			canvasWidth: config.canvasWidth,
			canvasHeight: config.canvasHeight,
			layerCount: layers.length,
			version: pkg.version
		}, null, '  '));
	} else if (req.method === 'GET' && req.url === '/canvas') {
		res.writeHead(200, {
			'Content-Type': 'image/png'
		});
		
		var screenPng = new PNG({
			width: config.canvasWidth,
			height: config.canvasHeight
		});
		screenPng.data.fill(255);
		
		var i, j, l, x, y, a,
			w = screenPng.width,
			h = screenPng.height;
		
		for (i = 0, l = layers.length; i < l; i++) {
			for (y = 0; y < h; y++) {
				for (x = 0; x < w; x++) {
					j = (w * y + x) << 2;
					a = layers[i][j + 3];
					
					screenPng.data[j] = Math.round(((255 - a) / 255 * screenPng.data[j]) + (a / 255 * layers[i][j]));
					screenPng.data[j + 1] = Math.round(((255 - a) / 255 * screenPng.data[j + 1]) + (a / 255 * layers[i][j + 1]));
					screenPng.data[j + 2] = Math.round(((255 - a) / 255 * screenPng.data[j + 2]) + (a / 255 * layers[i][j + 2]));
				}
			}
		}
		
		screenPng.pack().pipe(res);
	} else if (req.method === 'GET' && new RegExp('^\/layers\/[0-9]+$').test(req.url)) {
		var n = parseInt(req.url.match(/^\/layers\/([0-9]+)$/)[1], 10);
		
		if (n >= layers.length) {
			res.writeHead(404, {
				'Content-Type': 'text/plain'
			});
			res.end();
			return;
		}
		
		res.writeHead(200, {
			'Content-Type': 'image/png'
		});
		
		var layerPng = new PNG({
			width: config.canvasWidth,
			height: config.canvasHeight
		});
		
		layers[n].copy(layerPng.data);
		
		layerPng.pack().pipe(res);
	} else if (req.method === 'HEAD' || req.method === 'GET' || req.method === 'OPTIONS') {
		var location = req.url;
		if (location.match(/(\?.*)$/) !== null) {
			location = location.match(/^(.+)\?.*$/)[1];
		}
		if (location.match(/\/$/) !== null) {
			location += 'index.html';
		}
		
		var filepath = path.join(__dirname, '../lib/client/', location);
		
		if (fs.existsSync(filepath) === false) {
			res.writeHead(404, {
				'Content-Type': 'text/plain'
			});
			res.end();
			return;
		}
		
		var ext = null;
		if (filepath.match(/[^\/]+\..+$/) !== null) {
			ext = filepath.split('.').pop();
			
			if (ext === 'html') {
				res.setHeader('Content-Type', 'text/html; charset=utf-8');
			} else if (ext === 'js') {
				res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
			} else if (ext === 'css') {
				res.setHeader('Content-Type', 'text/css; charset=utf-8');
			} else if (ext === 'ico') {
				res.setHeader('Content-Type', 'image/vnd.microsoft.icon');
			} else if (ext === 'cur') {
				res.setHeader('Content-Type', 'image/vnd.microsoft.icon');
			} else if (ext === 'svg') {
				res.setHeader('Content-Type', 'image/svg+xml');
			} else if (ext === 'png') {
				res.setHeader('Content-Type', 'image/png');
			}
		} else {
			res.setHeader('Content-Type', 'text/plain');
		}
		
		if (req.method === 'OPTIONS') {
			res.writeHead(200, {
				'Allow': 'HEAD, GET, OPTIONS',
				'Content-Length': '0'
			});
			res.end();
			return;
		}
		
		var fstat = fs.statSync(filepath);
		
		res.writeHead(200, {
			'Content-Length': fstat.size,
			'Last-Modified': new Date(fstat.mtime).toUTCString(),
			'X-UA-Compatible': 'IE=edge'
		});
		
		fs.createReadStream(filepath).pipe(res);
	} else {
		res.writeHead(405, {
			'Allow': 'HEAD, GET, OPTIONS',
			'Content-Type': 'text/plain'
		});
		res.end();
	}
}).listen(config.port, config.host, function () {
	
	util.log(util.format('listening on %s:%s', config.host, config.port));
});

var clients = [];
var clientMap = {};

var io = socketio(server);
var rei = {};

rei.getClients = function () {
	
	var _clients = [];
	
	clients.forEach(function (client) {
		
		if (client.socket === null) {
			return;
		}
		
		_clients.push({
			uuid: client.uuid,
			name: client.name
		});
	});
	
	return _clients;
};

io.on('connection', function (socket) {
	
	var remoteAddr = socket.conn.remoteAddress;
	
	util.log(util.format('%s %s connected.', remoteAddr, socket.id));
	
	socket.emit('config', {
		title: config.title,
		canvasWidth: config.canvasWidth,
		canvasHeight: config.canvasHeight,
		layerCount: layers.length,
		version: pkg.version
	});
	
	var client = null;
	
	socket.once('disconnect', function () {
		
		if (client !== null) {
			if (client.socket !== null) {
				client.socket = null;
			}
			
			io.emit('clients', rei.getClients());
			
			util.log(util.format('%s %s disconnected. client=%s<%s>', remoteAddr, socket.id, client.name, client.uuid));
		} else {
			util.log(util.format('%s %s disconnected.', remoteAddr, socket.id));
		}
	});
	
	socket.on('client', function (_client) {
		
		if (client !== null) {
			if (client.socket !== null) {
				client.socket = null;
			}
		}
		
		if (_client.uuid && _client.uuid.length !== 36) {
			return;
		}
		
		if (!_client.name || _client.name > 16) {
			return;
		}
		
		if (_client.uuid && clientMap[_client.uuid] && clientMap[_client.uuid].pin === _client.pin) {
			client = clientMap[_client.uuid];
			
			if (client.socket) {
				client.socket.conn.close();
			}
		} else {
			client = {
				uuid: uuid.v1(),
				pin: uuid.v4(),
				socket: null
			};
			clientMap[client.uuid] = client;
			clients.push(client);
		}
		
		client.socket = socket;
		
		client.name = _client.name;
		
		socket.emit('client', {
			uuid: client.uuid,
			name: client.name,
			pin: client.pin
		});
		
		io.emit('clients', rei.getClients());
		
		util.log(util.format('%s %s joined. client=%s<%s>', remoteAddr, socket.id, client.name, client.uuid));
	});
	
	socket.on('stroke', function (stroke) {
		
		if (client === null) {
			return;
		}
		
		if (util.isArray(stroke.points) === false) {
			return;
		}
		
		var i, l, point;
		for (i = 0, l = stroke.points.length; i < l; i++) {
			point = stroke.points[i];
			
			if (!point || isNaN(point[0]) || isNaN(point[1]) || isNaN(point[2])) {
				return;
			}
			if (point[0] < 0 || point[1] < 0 || point[2] <= 0) {
				return;
			}
			if (point[0] > config.canvasWidth || point[1] > config.canvasHeight) {
				return;
			}
			if (point[3]) {
				point.splice(3, 1);
			}
			point[0] = Math.round(point[0]);
			point[1] = Math.round(point[1]);
			point[2] = point[2] << 0;
		}
		
		socket.broadcast.emit('stroke', {
			client: {
				uuid: client.uuid,
				name: client.name
			},
			points: stroke.points
		});
	});
	
	socket.on('pointer', function (pointer) {
		
		if (client === null) {
			return;
		}
		
		if (isNaN(pointer.x) || isNaN(pointer.y)) {
			return;
		}
		
		pointer.x = pointer.x >> 0;
		pointer.y = pointer.y >> 0;
		
		if (pointer.x < -1 || pointer.y < -1 || pointer.x > config.canvasWidth || pointer.y > config.canvasHeight) {
			return;
		}
		
		socket.broadcast.emit('pointer', {
			client: {
				uuid: client.uuid,
				name: client.name
			},
			x: pointer.x,
			y: pointer.y
		});
	});
	
	socket.on('paint', function (paint) {
		
		if (client === null) {
			return;
		}
		
		if (isNaN(paint.layerNumber) || paint.layerNumber < 0 || paint.layerNumber >= layers.length) {
			return;
		}
		if (isNaN(paint.x) || isNaN(paint.y)) {
			return;
		}
		if (paint.mode !== 'normal' && paint.mode !== 'erase') {
			return;
		}
		if (Buffer.isBuffer(paint.data) === false) {
			return;
		}
		
		paint.x = paint.x >> 0;
		paint.y = paint.y >> 0;
		
		if (paint.x < 0 || paint.y < 0) {
			return;
		}
		
		new PNG().parse(paint.data, function (err, png) {
			
			if (err) {
				console.log(err);
				return;
			}
			
			var i, j, x, y, aA, bA, xA,
				w = config.canvasWidth,
				h = config.canvasHeight,
				px = paint.x,
				py = paint.y,
				pw = Math.min(paint.x + png.width, w),
				ph = Math.min(paint.y + png.height, h),
				iw = png.width,
				ih = png.height,
				layer = layers[paint.layerNumber];
			
			for (y = py; y < ph; y++) {
				for (x = px; x < pw; x++) {
					i = (w * y + x) << 2;
					j = (iw * (y - py) + (x - px)) << 2;

					layer[i] = png.data[j];
					layer[i + 1] = png.data[j + 1];
					layer[i + 2] = png.data[j + 2];
					layer[i + 3] = png.data[j + 3];
				}
			}
			
			socket.broadcast.emit('paint', {
				client: {
					uuid: client.uuid,
					name: client.name
				},
				layerNumber: paint.layerNumber,
				mode: paint.mode,
				x: paint.x,
				y: paint.y,
				data: paint.data
			});
			
			socket.emit('painted');
		});
	});
	
	socket.on('chat', function (chat) {
		
		if (client === null) {
			return;
		}
		
		
	});
});
