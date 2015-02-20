/*!
 *  reichat server
 *
 *  Copyright (c) 2015 Yuki KAN
 *  https://github.com/kanreisa
**/
/*jslint node:true, nomen:true, plusplus:true, regexp:true, vars:true, continue:true, bitwise:true */
'use strict';

var pkg = require('../package.json');

var util = require('util');
var path = require('path');
var http = require('http');
var fs = require('fs');

var opts = require('opts');
var uuid = require('uuid');
var redis = require('redis');
var socketio = require('socket.io');
var PNG = require('node-png').PNG;
var mkdirp = require('mkdirp');

var id = uuid.v4();
var layers = [];
var clients = [];
var clientMap = {};
var rei = {};
var io, redisClient, redisSubscriber;

process.title = 'reichat server - ' + id;

util.log(util.format('this server id is %s', id));

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
		long: 'canvas-width',
		description: 'Width of canvas',
		value: true
	},
	{
		long: 'canvas-height',
		description: 'Height of canvas',
		value: true
	},
	{
		long: 'redis-host',
		description: 'Redis host',
		value: true
	},
	{
		long: 'redis-port',
		description: 'Redis port',
		value: true
	},
	{
		long: 'redis-password',
		description: 'Redis password',
		value: true
	},
	{
		long: 'data-dir',
		description: 'Data saving directory',
		value: true
	},
	{
		long: 'data-file-prefix',
		value: true
	},
	{
		long: 'data-save-interval',
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
config.port = parseInt(opts.get('port') || config.port || process.env.PORT || 10133, 10);
config.title = opts.get('title') || config.title || process.env.TITLE || 'reichat';
config.canvasWidth = parseInt(opts.get('canvas-width') || config.canvasWidth || process.env.CANVAS_WIDTH || 1920, 10);
config.canvasHeight = parseInt(opts.get('canvas-height') || config.canvasHeight || process.env.CANVAS_HEIGHT || 1080, 10);
config.redisHost = opts.get('redis-host') || config.redisHost || process.env.REDIS_HOST || '';
config.redisPort = parseInt(opts.get('redis-port') || config.redisPort || process.env.REDIS_PORT || 6379, 10);
config.redisPassword = opts.get('redis-password') || config.redisPassword || process.env.REDIS_PASSWORD || '';
config.dataDir = opts.get('data-dir') || config.dataDir || process.env.DATA_DIR || require('os').tmpdir();
config.dataFilePrefix = opts.get('data-file-prefix') || config.dataFilePrefix || process.env.DATA_FILE_PREFIX || 'reichat_';
config.dataSaveInterval = parseInt(opts.get('data-save-interval') || config.dataSaveInterval || process.env.DATA_SAVE_INTERVAL || 3000, 10);
config.maxPaintLogCount = parseInt(opts.get('max-paint-log-count') || config.maxPaintLogCount || process.env.MAX_PAINT_LOG_COUNT || 2000, 10);
config.maxChatLogCount = parseInt(opts.get('max-chat-log-count') || config.maxChatLogCount || process.env.MAX_CHAT_LOG_COUNT || 200, 10);

config.layerCount = 3;

(function () {
	
	var i;
	for (i = 0; i < config.layerCount; i++) {
		layers.push({
			isMustSaveData: false,
			cache: null,
			data: new Buffer(config.canvasWidth * config.canvasHeight * 4)
		});
	}
}());

config.dataMode = !!config.redisHost ? 'redis' : 'fs';

if (config.dataMode === 'fs') {
	if (config.dataDir === '/dev/null' || config.dataDir === 'null') {
		config.dataMode = null;
	} else {
		if (fs.existsSync(config.dataDir) === false) {
			mkdirp(config.dataDir, function (err) {

				if (err) {
					console.error(err);
					config.dataMode = null;
				}
			});
		}
	}
}

if (config.dataMode === 'redis') {
	redisClient = redis.createClient(config.redisPort, config.redisHost, {
		detect_buffers: true,
		auth_pass: config.redisPassword || null
	});
	redisSubscriber = redis.createClient(config.redisPort, config.redisHost, {
		auth_pass: config.redisPassword || null
	});
	
	redisSubscriber.subscribe('collect');
	redisSubscriber.subscribe('distribute');
	redisSubscriber.subscribe('ping');
	redisSubscriber.subscribe('pong');
	redisSubscriber.subscribe('paint');
	redisSubscriber.subscribe('chat');
	redisSubscriber.subscribe('stroke');
	redisSubscriber.subscribe('pointer');
	
	setInterval(function () {
		
		var otherServers = [];
		clients.forEach(function (client) {
			
			if (client.server.id !== id && otherServers.indexOf(client.server.id) === -1) {
				otherServers.push(client.server.id);
			}
		});
		
		if (otherServers.length === 0) {
			return;
		}
		
		var pongListener = function (type, data) {
			
			if (type === 'pong') {
				try {
					data = JSON.parse(data);
				} catch (e) {
					console.error(e);
				}
				
				var serverIndex = otherServers.indexOf(data.server.id);
				if (serverIndex !== -1) {
					otherServers.splice(serverIndex, 1);
				}
			}
		};
		
		setTimeout(function () {
			
			redisSubscriber.removeListener('message', pongListener);
			
			if (otherServers.length === 0) {
				return;
			}
			
			var i;
			for (i = 0; i < clients.length; i++) {
				if (otherServers.indexOf(clients[i].server.id) !== -1) {
					clients.splice(i, 1);
					i--;
				}
			}
			
			io.emit('clients', rei.getClients());
			
			util.log(util.format('server %s has timed-out.', otherServers.join(' and ')));
		}, 2000);
		
		redisSubscriber.on('message', pongListener);
		
		redisClient.publish('ping', JSON.stringify({
			server: {
				id: id
			}
		}));
	}, 5000);
	
	redisSubscriber.on('message', function (type, data) {
		
		try {
			data = JSON.parse(data);
		} catch (e) {
			console.error(e);
		}
		
		if (type === 'ping' && data.server.id !== id) {
			redisClient.publish('pong', JSON.stringify({
				server: {
					id: id
				}
			}));
		}
		
		if (type === 'collect' && data.server.id !== id) {
			if (data.target === 'clients') {
				rei.distributeClients();
			}
			return;
		}
		
		if (type === 'distribute' && data.server.id !== id) {
			if (data.target === 'clients') {
				(function () {
					
					var i;
					for (i = 0; i < clients.length; i++) {
						if (clients[i].server.id === data.server.id) {
							clients.splice(i, 1);
							i--;
						}
					}
					for (i = 0; i < data.body.length; i++) {
						clients.push({
							server: {
								id: data.server.id
							},
							uuid: data.body[i].uuid,
							name: data.body[i].name,
							pin: data.body[i].pin,
							remoteAddr: data.body[i].remoteAddr
						});
					}
				}());
				
				io.emit('clients', rei.getClients());
			}
			return;
		}
		
		if (!data.client || !data.client.server || data.client.server.id === id) {
			return;
		}
		
		if (type === 'paint') {
			data.body.data = new Buffer(data.body.data);
			rei.sendPaint(data.client, data.body);
		} else if (type === 'chat') {
			rei.sendChat(data.client, data.body);
		} else if (type === 'stroke') {
			rei.sendStroke(data.client, data.body);
		} else if (type === 'pointer') {
			rei.sendPointer(data.client, data.body);
		}
	});
	
	redisClient.publish('collect', JSON.stringify({
		server: {
			id: id
		},
		target: 'clients'
	}));
}

if (config.dataMode !== null) {
	layers.forEach(function (layer, i) {
		
		if (config.dataMode === 'fs') {
			var filePath = layer.filePath = path.join(config.dataDir, [config.dataFilePrefix, 'layer', i, '.png'].join(''));

			if (fs.existsSync(filePath) === true) {
				util.log(util.format('layer#%s data found. file=%s', i, filePath));

				fs.createReadStream(filePath).pipe(new PNG()).on('parsed', function () {

					if (this.width !== config.canvasWidth || this.height !== config.canvasHeight) {
						return;
					}

					this.data.copy(layer.data);

					layer.cache = null;

					clients.forEach(function (client) {

						if (client.socket && client.socket.conn) {
							client.socket.conn.close();
						}
					});

					util.log(util.format('layer#%s data loaded.', i));
				});
			}
		} else if (config.dataMode === 'redis') {
			redisClient.get(new Buffer('layer:' + i), function (err, buffer) {
				
				if (err) {
					console.error(err);
					return;
				}
				
				if (buffer !== null) {
					util.log(util.format('layer#%s data found. redis=layer:%s', i, i));
					
					var png = new PNG().on('parsed', function () {
						
						if (this.width !== config.canvasWidth || this.height !== config.canvasHeight) {
							return;
						}
						
						this.data.copy(layer.data);
						
						layer.cache = null;
						
						clients.forEach(function (client) {
							
							if (client.socket && client.socket.conn) {
								client.socket.conn.close();
							}
						});
						
						util.log(util.format('layer#%s data loaded.', i));
					});
					png.end(buffer);
				}
			});
		}
	});
	
	setInterval(function () {
		
		layers.forEach(function (layer, i) {
			
			if (layer.isMustSaveData === false) {
				return;
			}
			layer.isMustSaveData = false;
			
			var writeStream;
			
			if (config.dataMode === 'fs') {
				writeStream = fs.createWriteStream(layer.filePath);
			}
			
			if (layer.cache === null) {
				var layerPng = new PNG({
					width: config.canvasWidth,
					height: config.canvasHeight
				});
				
				layer.data.copy(layerPng.data);
				
				var buffers = [];
				
				layerPng.pack().on('data', function (buffer) {
					
					if (writeStream) {
						writeStream.write(buffer);
					}
					
					buffers.push(buffer);
				}).on('end', function () {
					
					if (writeStream) {
						writeStream.end();
					}
					
					layer.cache = Buffer.concat(buffers);
					
					if (redisClient) {
						redisClient.set(new Buffer('layer:' + i), layer.cache);
					}
				});
			} else {
				if (writeStream) {
					writeStream.end(layer.cache);
				}
				
				if (redisClient) {
					redisClient.set(new Buffer('layer:' + i), layer.cache);
				}
			}
		});
	}, config.dataSaveInterval);
}

var server = http.createServer(function (req, res) {
	
	var location = req.url;
	if (location.match(/(\?.*)$/) !== null) {
		location = location.match(/^(.+)\?.*$/)[1];
	}
	if (location.match(/\/$/) !== null) {
		location += 'index.html';
	}
	
	res.setHeader('Accept-Ranges', 'none');
	res.setHeader('Cache-Control', 'no-cache');
	res.setHeader('Pragma', 'no-cache');
	res.setHeader('Server', 'reichat/' + pkg.version);
	res.setHeader('X-Content-Type-Options', 'nosniff');
	
	if (req.method === 'GET' && location === '/config') {
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
	} else if (req.method === 'GET' && location === '/canvas') {
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
					a = layers[i].data[j + 3];
					
					screenPng.data[j] = Math.round(((255 - a) / 255 * screenPng.data[j]) + (a / 255 * layers[i].data[j]));
					screenPng.data[j + 1] = Math.round(((255 - a) / 255 * screenPng.data[j + 1]) + (a / 255 * layers[i].data[j + 1]));
					screenPng.data[j + 2] = Math.round(((255 - a) / 255 * screenPng.data[j + 2]) + (a / 255 * layers[i].data[j + 2]));
				}
			}
		}
		
		screenPng.pack().pipe(res);
	} else if (req.method === 'GET' && new RegExp('^\/layers\/[0-9]+$').test(location)) {
		var n = parseInt(location.match(/^\/layers\/([0-9]+)$/)[1], 10);
		
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
		
		if (layers[n].cache === null) {
			var layerPng = new PNG({
				width: config.canvasWidth,
				height: config.canvasHeight
			});
			
			layers[n].data.copy(layerPng.data);
			
			var buffers = [];
			
			layerPng.pack().on('data', function (buffer) {
				
				res.write(buffer);
				buffers.push(buffer);
			}).on('end', function () {
				
				res.end();
				layers[n].cache = Buffer.concat(buffers);
			});
		} else {
			res.end(layers[n].cache);
		}
	} else if (req.method === 'HEAD' || req.method === 'GET' || req.method === 'OPTIONS') {
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

io = socketio(server);
io.on('connection', function (socket) {
	
	var remoteAddr = socket.client.request.headers['x-forwarded-for'] || socket.conn.remoteAddress;
	
	util.log(util.format('%s %s connected.', remoteAddr, socket.id));
	
	socket.emit('server', {
		id: id
	});
	
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
			
			if (redisClient) {
				rei.distributeClients();
			}
			
			io.emit('clients', rei.getClients());
			
			rei.sendChat({
				server: {
					id: id
				}
			}, {
				time: Date.now(),
				message: util.format('! %s has left.', client.name)
			});
			
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
			
			if (client.socket && client.socket.conn) {
				client.socket.conn.close();
			}
		} else {
			client = {
				uuid: uuid.v1(),
				pin: uuid.v4(),
				socket: null,
				server: {
					id: id
				}
			};
			clientMap[client.uuid] = client;
			clients.push(client);
		}
		
		client.socket = socket;
		client.remoteAddr = remoteAddr;
		
		client.name = _client.name;
		
		socket.emit('client', {
			uuid: client.uuid,
			name: client.name,
			pin: client.pin
		});
		
		if (redisClient) {
			rei.distributeClients();
		}
		
		io.emit('clients', rei.getClients());
		
		socket.broadcast.emit('chat', {
			
		});
		
		rei.sendChat({
			server: {
				id: id
			}
		}, {
			time: Date.now(),
			message: util.format('! %s has joined.', client.name)
		});
		
		util.log(util.format('%s %s joined. client=%s<%s>', remoteAddr, socket.id, client.name, client.uuid));
	});
	
	socket.on('stroke', function (stroke) {
		
		rei.sendStroke(client, stroke);
	});
	
	socket.on('pointer', function (pointer) {
		
		rei.sendPointer(client, pointer);
	});
	
	socket.on('paint', function (paint) {
		
		rei.sendPaint(client, paint);
	});
	
	socket.on('chat', function (chat) {
		
		rei.sendChat(client, chat);
	});
});

rei.sendStroke = function (client, stroke) {
	
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
	
	if (redisClient && client.server.id === id) {
		redisClient.publish('stroke', JSON.stringify({
			client: rei.getClientForPublish(client),
			body: {
				points: stroke.points
			}
		}));
	}

	if (client.server.id === id) {
		client.socket.volatile.broadcast.emit('stroke', {
			client: rei.getClientForIO(client),
			points: stroke.points
		});
	} else {
		clients.forEach(function (c) {
			
			if (c.server.id === id && c.socket) {
				c.socket.volatile.emit('stroke', {
					client: rei.getClientForIO(client),
					points: stroke.points
				});
			}
		});
	}
};

rei.sendPointer = function (client, pointer) {
	
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

	if (redisClient && client.server.id === id) {
		redisClient.publish('pointer', JSON.stringify({
			client: rei.getClientForPublish(client),
			body: {
				x: pointer.x,
				y: pointer.y
			}
		}));
	}
	
	if (client.server.id === id) {
		client.socket.volatile.broadcast.emit('pointer', {
			client: rei.getClientForIO(client),
			x: pointer.x,
			y: pointer.y
		});
	} else {
		clients.forEach(function (c) {
			
			if (c.server.id === id && c.socket) {
				c.socket.volatile.emit('pointer', {
					client: rei.getClientForIO(client),
					x: pointer.x,
					y: pointer.y
				});
			}
		});
	}
};

rei.sendPaint = function (client, paint) {
	
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

				layer.data[i] = png.data[j];
				layer.data[i + 1] = png.data[j + 1];
				layer.data[i + 2] = png.data[j + 2];
				layer.data[i + 3] = png.data[j + 3];
			}
		}

		layer.cache = null;
		
		if (client.server.id === id) {
			layer.isMustSaveData = true;

			if (redisClient) {
				redisClient.publish('paint', JSON.stringify({
					client: rei.getClientForPublish(client),
					body: {
						layerNumber: paint.layerNumber,
						mode: paint.mode,
						x: paint.x,
						y: paint.y,
						data: paint.data
					}
				}));
			}
		}

		(client.server.id === id ? client.socket.broadcast : io).emit('paint', {
			client: rei.getClientForIO(client),
			layerNumber: paint.layerNumber,
			mode: paint.mode,
			x: paint.x,
			y: paint.y,
			data: paint.data
		});

		if (client.server.id === id) {
			client.socket.emit('painted');
		}
	});
};

rei.sendChat = function (client, chat) {
	
	if (client === null) {
		return;
	}
	
	if (typeof chat.message !== 'string' || chat.message.trim() === '') {
		return;
	}
	
	if (chat.message.length > 256) {
		return;
	}
	
	if (redisClient && client.server.id === id) {
		redisClient.publish('chat', JSON.stringify({
			client: rei.getClientForPublish(client),
			body: {
				message: chat.message,
				time: Date.now()
			}
		}));
	}
	
	io.emit('chat', {
		client: rei.getClientForIO(client),
		message: chat.message,
		time: chat.time || Date.now()
	});
	
	if (client.socket) {
		util.log(util.format('%s %s said: "%s". client=%s<%s> server=%s', client.remoteAddr, client.socket.id, chat.message, client.name, client.uuid, client.server.id));
	}
};

rei.distributeClients = function () {
	
	redisClient.publish('distribute', JSON.stringify({
		server: {
			id: id
		},
		target: 'clients',
		body: rei.getClientsForDistribute()
	}));
};

rei.getClients = function () {
	
	var _clients = [];
	
	clients.forEach(function (client) {
		
		if (client.server.id === id && client.socket === null) {
			return;
		}
		
		_clients.push({
			server: {
				id: client.server.id
			},
			uuid: client.uuid,
			name: client.name
		});
	});
	
	return _clients;
};

rei.getClientsForDistribute = function () {
	
	var _clients = [];
	
	clients.forEach(function (client) {
		
		if (client.server.id !== id) {
			return;
		}
		
		if (client.server.id === id && client.socket === null) {
			return;
		}
		
		_clients.push({
			uuid: client.uuid,
			name: client.name,
			pin: client.pin,
			remoteAddr: client.remoteAddr
		});
	});
	
	return _clients;
};

rei.getClientForIO = function (client) {
	
	return {
		server: {
			id: client.server.id
		},
		uuid: client.uuid,
		name: client.name
	};
};

rei.getClientForPublish = function (client) {
	
	return {
		server: {
			id: client.server.id
		},
		socket: client.socket ? {
			id: client.socket.id
		} : null,
		uuid: client.uuid,
		name: client.name,
		remoteAddr: client.remoteAddr
	};
};
