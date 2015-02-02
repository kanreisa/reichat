/*!
 *  reichat client
 *
 *  Copyright (c) 2015 Yuki KAN
 *  https://github.com/kanreisa
**/
/*jslint browser:true, nomen:true, plusplus:true, regexp:true, vars:true, bitwise:true, continue:true */
/*global atob, requestAnimationFrame, URL, Blob, Uint8Array, io, flagrate, brush */
function init() {
	'use strict';
	
	var initialized = false,
		config = window.config = {},
		client = window.client = {},
		socket = window.socket = io();
	
	socket.io.reconnection(false);
	
	var colors = [
		'#f39700',
		'#e60012',
		'#9caeb7',
		'#00a7db',
		'#009944',
		'#d7c447',
		'#9b7cb6',
		'#00ada9',
		'#bb641d',
		'#e85298',
		'#0079c2',
		'#6cbb5a',
		'#b6007a',
		'#e5171f',
		'#522886',
		'#0078ba',
		'#019a66',
		'#e44d93',
		'#814721',
		'#a9cc51',
		'#ee7b1a',
		'#00a0de'
	];
	
	var initialize, entry, standby, ready, tick;
	
	var ui = window.ui = {},
		util = window.util = {},
		view = window.view = {},
		timer = window.timer = {};
	
	var listener = {};
	
	var map = {
		client: {}
	};
	
	var stat = window.stat = {
		changed: true,
		wacom: null,
		pressure: {
			size: true,
			alpha: true
		},
		w: 0,
		h: 0,
		scrolling: false,
		painting: false,
		paintedArea: {
			tlX: 0,
			tlY: 0,
			brX: 0,
			brY: 0
		},
		paintedQueues: [],
		paintedSending: false,
		contexts: [],
		pointers: [],
		clients: [],
		strokes: [],
		strokePoints: [],
		x: -1,
		y: -1,
		layerNumber: 0,
		mode: 'normal',
		type: 'binary',
		tool: 'pen',
		color: '#000000',
		alpha: 1,
		size: 1
	};
	
	socket.on('config', function (_config) {
		
		flagrate.extendObject(config, _config);
		
		stat.w = config.canvasWidth;
		stat.h = config.canvasHeight;
		
		document.title = config.title + ' - reichat';
		
		initialize();
	});
	
	initialize = function () {
		
		if (initialized === true) {
			location.reload();
			return;
		}
		initialized = true;
		
		client.name = localStorage.getItem('name') || '';
		
		if (client.name === '') {
			ui.promptClientName(entry);
		} else {
			entry();
		}
	};
	
	entry = function () {
		
		socket.once('client', function (_client) {
			
			flagrate.extendObject(client, _client);
			
			localStorage.setItem('uuid', client.uuid);
			localStorage.setItem('pin', client.pin);
			
			standby();
		});
		
		if (localStorage.getItem('uuid')) {
			client.uuid = localStorage.getItem('uuid');
		}
		if (localStorage.getItem('pin')) {
			client.pin = localStorage.getItem('pin');
		}
		
		socket.emit('client', client);
	};
	
	standby = function () {
		
		view.mask = flagrate.Element.extend(document.getElementById('mask'));
		view.progress = flagrate.createProgress({
			max: config.layerCount
		}).insertTo(view.mask);
		
		view.chatLog = flagrate.Element.extend(document.getElementById('log'));
		view.clients = flagrate.Element.extend(document.getElementById('clients'));
		view.commands = flagrate.Element.extend(document.getElementById('commands'));
		
		if (window.PointerEvent && /(Windows NT 6.1)/.test(navigator.userAgent) === false) {
			flagrate.Element.remove(document.getElementById('wacom'));
		} else if (document.getElementById('wacom').version && document.getElementById('wacom').penAPI.isWacom) {
			stat.wacom = document.getElementById('wacom').penAPI;
		} else {
			flagrate.Element.remove(document.getElementById('wacom'));
		}
		
		//util.setSize(stat.size);// todo
		//util.setColor(stat.color);// todo
		//util.setAlpha(stat.alpha);// todo
		//util.setTool(stat.tool);// todo
		
		view.canvasContainer = document.getElementById('canvas-container');
		
		// [0] main canvas
		view.canvas = document.getElementById('canvas-main');
		view.canvas.width = stat.w;
		view.canvas.height = stat.h;
		stat.contexts.push(view.canvas.getContext('2d'));
		stat.contexts[0].globalAlpha = 1;
		stat.contexts[0].fillStyle = '#ffffff';
		stat.contexts[0].mozImageSmoothingEnabled = false;
		stat.contexts[0].msImageSmoothingEnabled = false;
		stat.contexts[0].imageSmoothingEnabled = false;
		
		// [1] overlay
		view.overlayCanvas = document.getElementById('canvas-overlay');
		view.overlayCanvas.width = stat.w;
		view.overlayCanvas.height = stat.h;
		stat.contexts.push(view.overlayCanvas.getContext('2d'));
		stat.contexts[1].globalAlpha = 0.8;
		stat.contexts[1].lineWidth = 1;
		stat.contexts[1].mozImageSmoothingEnabled = false;
		stat.contexts[1].msImageSmoothingEnabled = false;
		stat.contexts[1].imageSmoothingEnabled = false;
		
		var i, c;
		
		// [2] painting buffer
		c = document.createElement('canvas');
		stat.contexts.push(c.getContext('2d'));
		c.width = stat.w;
		c.height = stat.h;
		
		// [3] painting composition buffer
		c = document.createElement('canvas');
		stat.contexts.push(c.getContext('2d'));
		c.width = stat.w;
		c.height = stat.h;
		
		// [4] painted composition buffer
		c = document.createElement('canvas');
		stat.contexts.push(c.getContext('2d'));
		
		// [5] painted composition buffer
		c = document.createElement('canvas');
		stat.contexts.push(c.getContext('2d'));
		stat.contexts[5].globalCompositeOperation = 'copy';
		
		// [6..] layer buffer
		var img;
		var getImgOnload = function (layerNumber) {
			
			return function () {
				
				stat.contexts[layerNumber + 6].drawImage(this, 0, 0);
				stat.changed = true;
				
				view.progress.setValue(view.progress.getValue() + 1);
				if (view.progress.getValue() === config.layerCount) {
					ready();
					view.progress.remove();
				}
			};
		};
		for (i = 0; i < config.layerCount; i++) {
			c = document.createElement('canvas');
			stat.contexts.push(c.getContext('2d'));
			c.width = stat.w;
			c.height = stat.h;
			
			img = new Image();
			img.src = 'layers/' + i;
			img.onload = getImgOnload(i);
		}
		
		requestAnimationFrame(tick);
		
		socket.on('clients', listener.socketOnClients);
		socket.on('pointer', listener.socketOnPointer);
		socket.on('stroke', listener.socketOnStroke);
		socket.on('paint', listener.socketOnPaint);
		socket.on('chat', listener.socketOnChat);
		socket.on('disconnect', listener.socketOnDisconnect);
		
		view.paint = document.getElementById('paint');
		view.scrollX = document.getElementById('scroll-x');
		view.scrollY = document.getElementById('scroll-y');
		view.scrollXB = document.getElementById('scroll-x-bar');
		view.scrollYB = document.getElementById('scroll-y-bar');
		
		util.setScrollbars();
		
		window.addEventListener('resize', util.setScrollbars);
		
		view.scrollX.addEventListener('mousedown', listener.scrollStart);
		view.scrollY.addEventListener('mousedown', listener.scrollStart);
		
		if (window.PointerEvent) {
			view.overlayCanvas.addEventListener('pointermove', listener.canvasOnPointerMove);
			view.overlayCanvas.addEventListener('pointerdown', listener.canvasOnPointerDown);
			view.overlayCanvas.addEventListener('pointerup', listener.canvasOnPointerUp);
			view.overlayCanvas.addEventListener('pointerleave', listener.canvasOnPointerLeave);
			view.overlayCanvas.addEventListener('pointerenter', listener.canvasOnPointerEnter);
		} else {
			view.overlayCanvas.addEventListener('mousemove', listener.canvasOnPointerMove);
			view.overlayCanvas.addEventListener('mousedown', listener.canvasOnPointerDown);
			view.overlayCanvas.addEventListener('mouseup', listener.canvasOnPointerUp);
			view.overlayCanvas.addEventListener('mouseleave', listener.canvasOnPointerLeave);
			view.overlayCanvas.addEventListener('mouseenter', listener.canvasOnPointerEnter);
		}
		view.overlayCanvas.addEventListener('contextmenu', listener.stopEvent);
		view.overlayCanvas.addEventListener('click', listener.stopEvent);
	};
	
	ready = function () {
		
		view.mask.hide();
	};
	
	tick = function () {
		
		if (stat.changed === false) {
			return requestAnimationFrame(tick);
		}
		stat.changed = false;
		
		var i, j, k, l, m, n, a, b, c;
		
		// main <- layers + painting
		stat.contexts[0].fillRect(0, 0, stat.w, stat.h);
		
		for (i = 0; i < config.layerCount; i++) {
			if (stat.painting === true && stat.layerNumber === i) {
				stat.contexts[3].globalCompositeOperation = 'copy';
				stat.contexts[3].globalAlpha = 1;
				
				stat.contexts[3].drawImage(stat.contexts[i + 6].canvas, 0, 0);
				
				if (stat.mode === 'normal') {
					stat.contexts[3].globalCompositeOperation = 'source-over';
				} else if (stat.mode === 'erase') {
					stat.contexts[3].globalCompositeOperation = 'destination-out';
				}
				stat.contexts[3].globalAlpha = stat.alpha;
				
				stat.contexts[3].drawImage(
					stat.contexts[2].canvas,
					stat.paintedArea.tlX,
					stat.paintedArea.tlY,
					stat.paintedArea.brX - stat.paintedArea.tlX,
					stat.paintedArea.brY - stat.paintedArea.tlY,
					stat.paintedArea.tlX,
					stat.paintedArea.tlY,
					stat.paintedArea.brX - stat.paintedArea.tlX,
					stat.paintedArea.brY - stat.paintedArea.tlY
				);
				
				stat.contexts[0].drawImage(stat.contexts[3].canvas, 0, 0);
			} else {
				stat.contexts[0].drawImage(stat.contexts[i + 6].canvas, 0, 0);
			}
			
			if (stat.layerNumber === i && stat.x >= 0 && stat.y >= 0) {
				if (stat.painting === false) {
					if (stat.mode === 'normal') {
						a = stat.color;
					} else if (stat.mode === 'erase') {
						a = '#ffffff';
					}
					brush.draw(stat.contexts[0], stat.x, stat.y, stat.size, stat.alpha, a, true);
				}
			}
		}
		
		// overlay
		stat.contexts[1].clearRect(0, 0, stat.w, stat.h);
		
		for (i = 0, l = stat.pointers.length; i < l; i++) {
			a = stat.pointers[i];
			
			stat.contexts[1].fillStyle = stat.contexts[1].strokeStyle = a.client._color;
			stat.contexts[1].strokeRect(a.x - 0.5, a.y - 0.5, 2, 2);
			stat.contexts[1].fillText(a.client.name, a.x + 5, a.y + 5);
			
			for (j = 0, m = stat.strokes.length; j < m; j++) {
				b = stat.strokes[j];
				
				if (b.client.uuid === a.client.uuid) {
					for (k = 0, n = b.points.length; k < n; k++) {
						c = b.points[k];
						stat.contexts[1].fillRect(c[0], c[1], 1, 1);
					}
					
					break;
				}
			}
		}
		
		requestAnimationFrame(tick);
	};
	
	listener.stopEvent = function (e) {
		
		e.stopPropagation();
		e.preventDefault();
	};
	
	listener.canvasOnPointerMove = function (e) {
		
		if (stat.scrolling === true) {
			return;
		}
		
		e.stopPropagation();
		e.preventDefault();
		
		var moved = false,
			x = typeof e.offsetX === 'number' ? e.offsetX : e.layerX,
			y = typeof e.offsetY === 'number' ? e.offsetY : e.layerY,
			now = Date.now();
		
		if (x !== stat.x || y !== stat.y) {
			moved = true;
			stat.x = x;
			stat.y = y;
		}
		
		if (moved) {
			socket.emit('pointer', {
				x: x,
				y: y
			});
		}
		
		if (stat.wacom) {
			stat.mode = stat.wacom.isEraser ? 'erase' : 'normal';
		}
		
		if (moved && stat.painting) {
			if ((!window.PointerEvent && e.which === 0) || (window.PointerEvent && e.buttons === 0)) {
				listener.canvasOnPointerUp(e);
				return;
			}
			
			var context = stat.contexts[2];
			
			var i, l;
			
			var prev = stat.strokePoints[stat.strokePoints.length - 1];
			var dist = Math.sqrt(Math.pow(prev[0] - x, 2) + Math.pow(prev[1] - y, 2));
			var difX = x - prev[0];
			var difY = y - prev[1];
			
			var size = stat.size;
			var alpha = 1;
			var color = stat.color;
			var mixing = true;
			
			var pressure = 0.5;
			
			if (stat.wacom && parseInt(stat.wacom.pointerType, 10) !== 0) {
				pressure = stat.wacom.pressure;
			} else if (e.pointerType === 'pen') {
				pressure = e.pressure;
			}
			
			if (stat.pressure.size) {
				if (stat.tool === 'pencil') {
					size = (pressure + 1) / 2 * size;
				} else if (stat.tool === 'brush') {
					size = size * pressure;
				}
			}
			if (stat.pressure.alpha) {
				if (stat.tool === 'pencil') {
					alpha = pressure * alpha;
				}
			}
			
			if (stat.mode === 'erase') {
				color = '#ffffff';
			}
			
			if (stat.type === 'binary') {
				dist = dist >> 0;
				size = Math.round(size);
				if (size < 1) {
					size = 1;
				}
				mixing = false;
			}
			
			for (i = 0, l = dist; i <= l; i++) {
				brush.draw(
					context,
					prev[0] + i / dist * difX,
					prev[1] + i / dist * difY,
					size * i / dist + prev[2] * (1 - i / dist),
					alpha * i / dist + prev[3] * (1 - i / dist),
					color,
					mixing
				);
			}
			
			if (stat.paintedArea.tlX > x - size >> 0) {
				stat.paintedArea.tlX = Math.min(Math.max(0, x - size >> 0), stat.w - 1);
			}
			if (stat.paintedArea.tlY > y - size >> 0) {
				stat.paintedArea.tlY = Math.min(Math.max(0, y - size >> 0), stat.h - 1);
			}
			if (stat.paintedArea.brX < Math.ceil(x + size)) {
				stat.paintedArea.brX = Math.min(Math.max(stat.paintedArea.tlX, Math.ceil(x + size)), stat.w);
			}
			if (stat.paintedArea.brY < Math.ceil(y + size)) {
				stat.paintedArea.brY = Math.min(Math.max(stat.paintedArea.tlY, Math.ceil(y + size)), stat.h);
			}
			
			stat.strokePoints.push([x, y, size, alpha]);
			
			if (stat.strokePoints.length > 100) {
				stat.strokePoints.shift();
			}
			
			stat.changed = true;
			
			if (now % 3 === 0) {
				socket.emit('stroke', {
					points: stat.strokePoints
				});
			}
		} else if (moved) {
			stat.changed = true;
			
			stat.strokePoints = [];
			
			if (now % 7 === 0) {
				socket.emit('stroke', {
					points: stat.strokePoints
				});
			}
		}
	};
	
	listener.canvasOnPointerDown = function (e) {
		
		if (stat.scrolling === true) {
			return;
		}
		
		e.stopPropagation();
		e.preventDefault();
		
		if (!document.hasFocus()) {
			document.body.focus();
		}
		
		var x = stat.x = typeof e.offsetX === 'number' ? e.offsetX : e.layerX,
			y = stat.y = typeof e.offsetY === 'number' ? e.offsetY : e.layerY;
		
		if (window.PointerEvent) {
			if (e.buttons === 1) {
				stat.mode = 'normal';
			} else if (e.buttons === 2) {
				// right
			} else if (e.buttons === 32) {
				stat.mode = 'erase';
			}
		}
		
		if (e.which === 1 || e.buttons === 1 || e.buttons === 32) {
			stat.changed = true;
			stat.painting = true;
			
			var context = stat.contexts[2];// painting buffer
			
			var size = stat.size,
				alpha = 1,
				color = stat.color,
				mixing = true,
				pressure = 0.5;
			
			if (stat.wacom && parseInt(stat.wacom.pointerType, 10) !== 0) {
				pressure = stat.wacom.pressure;
			} else if (e.pointerType === 'pen') {
				pressure = e.pressure;
			}
			
			if (stat.pressure.size) {
				if (stat.tool === 'pencil') {
					size = size * pressure;
				} else if (stat.tool === 'brush') {
					size = size * pressure;
				}
			}
			if (stat.pressure.alpha) {
				if (stat.tool === 'pencil') {
					alpha = alpha * pressure;
				}
			}
			
			context.clearRect(0, 0, stat.w, stat.h);
			
			if (stat.mode === 'erase') {
				color = '#ffffff';
			}
			
			if (stat.type === 'binary') {
				size = Math.round(size);
				if (size < 1) {
					size = 1;
				}
				mixing = false;
			}
			
			brush.draw(context, x, y, size, alpha, color, mixing);
			
			stat.paintedArea.tlX = Math.min(Math.max(0, x - size >> 0), stat.w - 1);
			stat.paintedArea.tlY = Math.min(Math.max(0, y - size >> 0), stat.h - 1);
			stat.paintedArea.brX = Math.min(Math.max(stat.paintedArea.tlX, Math.ceil(x + size)), stat.w);
			stat.paintedArea.brY = Math.min(Math.max(stat.paintedArea.tlY, Math.ceil(y + size)), stat.h);
			
			stat.strokePoints = [[x, y, size, alpha]];
			
			socket.emit('stroke', {
				points: stat.strokePoints
			});
		}
	};
	
	listener.canvasOnPointerUp = function (e) {
		
		e.stopPropagation();
		e.preventDefault();
		
		if (stat.painting === false) {
			return;
		}
		stat.painting = false;
		
		var paintedWidth = stat.paintedArea.brX - stat.paintedArea.tlX;
		var paintedHeight = stat.paintedArea.brY - stat.paintedArea.tlY;
		
		// painted composition buffer
		var context = stat.contexts[4];
		var canvas  = context.canvas;
		context.canvas.width = paintedWidth;
		context.canvas.height = paintedHeight;
		
		// <- current layer buffer
		context.drawImage(
			stat.contexts[stat.layerNumber + 6].canvas,
			stat.paintedArea.tlX,
			stat.paintedArea.tlY,
			paintedWidth,
			paintedHeight,
			0,
			0,
			paintedWidth,
			paintedHeight
		);
		
		// <- painting buffer
		if (stat.mode === 'normal') {
			context.globalCompositeOperation = 'source-over';
		} else if (stat.mode === 'erase') {
			context.globalCompositeOperation = 'destination-out';
		}
		context.globalAlpha = stat.alpha;
		
		context.drawImage(
			stat.contexts[2].canvas,
			stat.paintedArea.tlX,
			stat.paintedArea.tlY,
			paintedWidth,
			paintedHeight,
			0,
			0,
			paintedWidth,
			paintedHeight
		);
		
		// -> current layer buffer
		stat.contexts[stat.layerNumber + 6].clearRect(stat.paintedArea.tlX, stat.paintedArea.tlY, paintedWidth, paintedHeight);
		stat.contexts[stat.layerNumber + 6].drawImage(canvas, stat.paintedArea.tlX, stat.paintedArea.tlY);
		
		stat.changed = true;
		
		stat.strokePoints = [];
		
		socket.emit('stroke', {
			points: stat.strokePoints
		});
		
		setTimeout(util.queuePainted, 10, {
			layerNumber: stat.layerNumber,
			mode: stat.mode,
			x: stat.paintedArea.tlX,
			y: stat.paintedArea.tlY,
			width: paintedWidth,
			height: paintedHeight
		});
	};
	
	util.queuePainted = function (painted) {
		
		if (stat.paintedSending === true) {
			if (painted) {
				stat.paintedQueues.push(painted);
			}
			return;
		} else {
			if (painted) {
				if (stat.paintedQueues.length !== 0) {
					stat.paintedQueues.push(painted);
					painted = stat.paintedQueues.shift();
				}
			} else {
				if (stat.paintedQueues.length === 0) {
					return;
				}
				painted = stat.paintedQueues.shift();
			}
		}
		
		stat.paintedSending = true;
		
		// painted composition buffer
		var context = stat.contexts[5];
		var canvas  = context.canvas;
		context.canvas.width = painted.width;
		context.canvas.height = painted.height;
		
		// <- current layer buffer
		context.drawImage(
			stat.contexts[painted.layerNumber + 6].canvas,
			painted.x,
			painted.y,
			painted.width,
			painted.height,
			0,
			0,
			painted.width,
			painted.height
		);
		
		// testing
		var binaryString = atob(canvas.toDataURL('image/png').split(',')[1]);
		
		var i,
			l = binaryString.length,
			bytes = new Uint8Array(l);
		for (i = 0; i < l; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}
		
		socket.emit('paint', {
			layerNumber: stat.layerNumber,
			mode: stat.mode,
			x: stat.paintedArea.tlX,
			y: stat.paintedArea.tlY,
			data: bytes.buffer
		});
		
		socket.once('painted', function () {
			
			stat.paintedSending = false;
			setTimeout(util.queuePainted, 10);
		});
	};
	
	listener.canvasOnPointerLeave = function (e) {
		
		e.stopPropagation();
		e.preventDefault();
		
		if (stat.painting === true) {
			listener.canvasOnPointerUp(e);
		} else {
			stat.x = -1;
			stat.y = -1;
			
			stat.changed = true;
			
			socket.emit('pointer', {
				x: stat.x,
				y: stat.y
			});
		}
	};
	
	listener.canvasOnPointerEnter = function (e) {
		
		e.stopPropagation();
		e.preventDefault();
		
		if (e.which === 1 || e.buttons === 1 || e.buttons === 32) {
			listener.canvasOnPointerDown(e);
		}
	};
	
	listener.socketOnClients = function (_clients) {
		
		map.client = {};
		stat.clients = _clients;
		
		view.clients.update();
		
		var i, l;
		for (i = 0, l = _clients.length; i < l; i++) {
			_clients[i]._n = i;
			_clients[i]._color = colors[i % colors.length];
			map.client[_clients[i].uuid] = _clients[i];
			
			flagrate.createElement().setStyle({
				color: _clients[i]._color
			}).insertText(_clients[i].name).insertTo(view.clients);
		}
		
		util.prepPointers();
		util.prepStrokes();
		
		stat.changed = true;
	};
	
	listener.socketOnPointer = function (pointer) {
		
		if (pointer.client.uuid === client.uuid) {
			return;
		}
		
		var i, l, f;
		for (i = 0, l = stat.pointers.length; i < l; i++) {
			if (stat.pointers[i].client.uuid === pointer.client.uuid) {
				f = true;
				stat.pointers[i] = pointer;
				break;
			}
		}
		
		if (!f) {
			stat.pointers.push(pointer);
		}
		
		util.prepPointers();
		
		stat.changed = true;
	};
	
	listener.socketOnStroke = function (stroke) {
		
		if (stroke.client.uuid === client.uuid) {
			return;
		}
		
		var i, l, f;
		for (i = 0, l = stat.strokes.length; i < l; i++) {
			if (stat.strokes[i].client.uuid === stroke.client.uuid) {
				f = true;
				stat.strokes[i] = stroke;
				break;
			}
		}
		
		if (!f) {
			stat.strokes.push(stroke);
		}
		
		util.prepStrokes();
		
		stat.changed = true;
	};
	
	listener.socketOnPaint = function (paint) {
		
		if (paint.client.uuid === client.uuid) {
			return;
		}
		
		var img = new Image();
		img.src = URL.createObjectURL(new Blob([new Uint8Array(paint.data)], { type: 'image/png' }));
		img.onload = function () {
			
			// -> current layer buffer
			stat.contexts[paint.layerNumber + 6].clearRect(paint.x, paint.y, img.width, img.height);
			stat.contexts[paint.layerNumber + 6].drawImage(img, paint.x, paint.y);
			
			stat.changed = true;
			
			URL.revokeObjectURL(img.src);
		};
	};
	
	listener.socketOnDisconnect = function () {
		
		view.mask.show();
		util.cleanup();
		
		var reconnect = function () {
			
			if (document.hasFocus()) {
				socket.connect();
			} else {
				setTimeout(reconnect, 5000);
			}
		};
		setTimeout(reconnect, 3000);
	};
	
	listener.scrollStart = function (e) {
		
		e.preventDefault();
		e.stopPropagation();
		
		stat.scrolling = true;
		
		var end,
			scroll,
			prevX = e.screenX,
			prevY = e.screenY,
			ratioX = view.scrollX.clientWidth / view.scrollXB.clientWidth,
			ratioY = view.scrollY.clientHeight / view.scrollYB.clientHeight;
		
		end = function () {
			
			document.removeEventListener('mousemove', scroll, true);
			document.removeEventListener('mouseup', end, true);
			
			stat.scrolling = false;
		};
		
		scroll = function (e) {
			
			e.preventDefault();
			e.stopPropagation();
			
			if (e.which === 0) {
				end();
				return;
			}
			
			var movementX = e.screenX - prevX,
				movementY = e.screenY - prevY;
			
			prevX = e.screenX;
			prevY = e.screenY;
			
			view.canvasContainer.scrollLeft += movementX * ratioX;
			view.canvasContainer.scrollTop += movementY * ratioY;
			util.setScrollbars();
		};
		
		document.addEventListener('mousemove', scroll, true);
		document.addEventListener('mouseup', end, true);
	};
	
	util.prepPointers = function () {
		
		var i;
		for (i = 0; i < stat.pointers.length; i++) {
			if (stat.pointers[i].x === -1 || stat.pointers[i].y === -1 || typeof map.client[stat.pointers[i].client.uuid] === 'undefined') {
				stat.pointers.splice(i, 1);
			} else {
				stat.pointers[i].client = map.client[stat.pointers[i].client.uuid];
			}
		}
	};
	
	util.prepStrokes = function () {
		
		var i;
		for (i = 0; i < stat.strokes.length; i++) {
			if (typeof map.client[stat.strokes[i].client.uuid] === 'undefined') {
				stat.strokes.splice(i, 1);
			} else {
				stat.strokes[i].client = map.client[stat.strokes[i].client.uuid];
			}
		}
	};
	
	util.setScrollbars = function () {
		
		var viewWidth = view.canvasContainer.clientWidth,
			viewHeight = view.canvasContainer.clientHeight,
			scrollLeft = view.canvasContainer.scrollLeft,
			scrollTop = view.canvasContainer.scrollTop,
			canvasWidth = view.canvas.scrollWidth,
			canvasHeight = view.canvas.scrollHeight,
			scrollXWidth = view.scrollX.clientWidth,
			scrollYHeight = view.scrollY.clientHeight;
		
		var widthRatio = scrollXWidth / viewWidth,
			heightRatio = scrollYHeight / viewHeight;
		
		var scrollXBWidth = scrollXWidth * scrollXWidth / (canvasWidth * widthRatio),
			scrollYBHeight = scrollYHeight * scrollYHeight / (canvasHeight * heightRatio),
			scrollXBLeft = scrollLeft * scrollXBWidth / scrollXWidth * widthRatio,
			scrollYBTop = scrollTop * scrollYBHeight / scrollYHeight * heightRatio;
		
		if (scrollXBWidth >= scrollXWidth) {
			view.scrollXB.style.display = 'none';
		} else {
			view.scrollXB.style.display = '';
			view.scrollXB.style.left = scrollXBLeft + 'px';
			view.scrollXB.style.width = scrollXBWidth + 'px';
		}
		
		if (scrollYBHeight >= scrollYHeight) {
			view.scrollYB.style.display = 'none';
		} else {
			view.scrollYB.style.display = '';
			view.scrollYB.style.top = scrollYBTop + 'px';
			view.scrollYB.style.height = scrollYBHeight + 'px';
		}
	};
	
	util.cleanup = function () {
		
		view.canvas.removeEventListener('pointermove', listener.canvasOnPointerMove);
		view.canvas.removeEventListener('pointerdown', listener.canvasOnPointerDown);
		view.canvas.removeEventListener('pointerup', listener.canvasOnPointerUp);
		view.canvas.removeEventListener('pointerout', listener.canvasOnPointerLeave);
		view.canvas.removeEventListener('mousemove', listener.canvasOnPointerMove);
		view.canvas.removeEventListener('mousedown', listener.canvasOnPointerDown);
		view.canvas.removeEventListener('mouseup', listener.canvasOnPointerUp);
		view.canvas.removeEventListener('mouseout', listener.canvasOnPointerLeave);
		view.canvas.removeEventListener('contextmenu', listener.stopEvent);
		view.canvas.removeEventListener('click', listener.stopEvent);
		
		socket.removeAllListeners('clients');
		socket.removeAllListeners('pointer');
		socket.removeAllListeners('stroke');
		socket.removeAllListeners('paint');
		socket.removeAllListeners('chat');
		socket.removeAllListeners('disconnect');
	};
	
	util.setTool = function (type, name) {
		
		if (type !== 'binary') {
			return;
		}
		if (name !== 'pen') {
			return;
		}
		
		if (type === 'binary') {
			brush.setPreset('binary-circle');
		}
		
		stat.type = type;
		stat.tool = name;
	};
	
	ui.promptClientName = function (done) {
		
		var form = flagrate.createForm({
			vertical: true,
			nolabel: true,
			fields: [
				{
					key: 'name',
					input: {
						type: 'text',
						placeholder: 'Name'.__(),
						maxLength: 16,
						isRequired: true,
						style: {
							width: '100%'
						}
					}
				},
				{
					key: 'save',
					input: {
						type: 'checkbox',
						label: 'Save'.__(),
						value: false
					}
				}
			]
		});
		
		flagrate.createModal({
			disableCloseByMask: true,
			disableCloseButton: true,
			title: 'Your Name'.__(),
			element: form.element,
			buttons: [
				{
					color: '@pink',
					label: client.name === '' ? 'JOIN'.__() : 'OK',
					onSelect: function (e, modal) {
						
						form.validate(function (isValid) {
							
							if (!isValid) {
								return;
							}
							
							var input = form.getResult();
							
							if (input.save) {
								localStorage.setItem('name', input.name);
							} else {
								localStorage.setItem('name', '');
							}
							
							modal.close();
							
							client.name = input.name;
							done();
						});
					}
				},
				{
					label: 'Cancel'.__(),
					onSelect: function () {
						
						location.href = './';
					}
				}
			]
		}).open();
	};
}

// _|_
// \ /
//  v
window.addEventListener('DOMContentLoaded', init);