/*!
 *  reichat client
 *
 *  Copyright (c) 2015 Yuki KAN
 *  https://github.com/kanreisa
**/
/*jslint browser:true, nomen:true, plusplus:true, regexp:true, vars:true, bitwise:true, continue:true */
/*global atob, requestAnimationFrame, URL, Blob, Uint8Array, devicePixelRatio, io, flagrate, brush */
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
		width: 0,
		height: 0,
		changed: true,
		wacom: null,
		pressure: {
			size: true,
			alpha: true
		},
		interrupted: false,
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
		size: 1,
		zoom: 1,
		viewArea: {
			tlX: 0,
			tlY: 0,
			brX: 1,
			brY: 1,
			width: 1,
			height: 1
		}
	};
	
	var canvasW = 0, canvasH = 0;
	
	socket.on('config', function (_config) {
		
		flagrate.extendObject(config, _config);
		
		canvasW = stat.width = config.canvasWidth;
		canvasH = stat.height = config.canvasHeight;
		
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
		
		if (window.PointerEvent && /(Windows NT 6.1)/.test(navigator.userAgent) === false) {
			flagrate.Element.remove(document.getElementById('wacom'));
		} else if (document.getElementById('wacom').version && document.getElementById('wacom').penAPI.isWacom) {
			stat.wacom = document.getElementById('wacom').penAPI;
		} else {
			flagrate.Element.remove(document.getElementById('wacom'));
		}
		
		view.mask = flagrate.Element.extend(document.getElementById('mask'));
		view.progress = flagrate.createProgress({
			max: config.layerCount
		}).insertTo(view.mask);
		
		view.toolbar = flagrate.Element.extend(document.getElementById('toolbar'));
		
		view.tools = flagrate.createElement().addClassName('tools');
		view.tools.insertTo(view.toolbar);
		
		flagrate.createButton({
			icon: './icon/binary-pen' + (devicePixelRatio % 1 === 0 ? '' : '.alt') + '.svg',
			attribute: {
				title: 'Binary Pen'.__()
			},
			onSelect: function () {
				
				stat.type = 'binary';
				stat.tool = 'pen';
				
				brush.setPreset('binary-circle');
			}
		}).insertTo(view.tools);
		
		flagrate.createButton({
			icon: './icon/pen.svg',
			attribute: {
				title: 'Pen'.__()
			},
			onSelect: function () {
				
				stat.type = 'normal';
				stat.tool = 'pen';
				
				brush.setPreset('normal-circle');
			}
		}).insertTo(view.tools);
		
		flagrate.createButton({
			icon: './icon/binary-pencil' + (devicePixelRatio % 1 === 0 ? '' : '.alt') + '.svg',
			attribute: {
				title: 'Binary Pencil'.__()
			},
			onSelect: function () {
				
				stat.type = 'binary';
				stat.tool = 'pencil';
				
				brush.setPreset('binary-circle');
			}
		}).insertTo(view.tools);
		
		flagrate.createButton({
			icon: './icon/pencil.svg',
			attribute: {
				title: 'Pencil'.__()
			},
			onSelect: function () {
				
				stat.type = 'normal';
				stat.tool = 'pencil';
				
				brush.setPreset('normal-circle');
			}
		}).insertTo(view.tools);
		
		flagrate.createButton({
			icon: './icon/binary-brush' + (devicePixelRatio % 1 === 0 ? '' : '.alt') + '.svg',
			attribute: {
				title: 'Binary Brush'.__()
			},
			onSelect: function () {
				
				stat.type = 'binary';
				stat.tool = 'brush';
				
				brush.setPreset('binary-circle');
			}
		}).insertTo(view.tools);
		
		flagrate.createButton({
			icon: './icon/brush.svg',
			attribute: {
				title: 'Brush'.__()
			},
			onSelect: function () {
				
				stat.type = 'normal';
				stat.tool = 'brush';
				
				brush.setPreset('normal-circle');
			}
		}).insertTo(view.tools);
		
		flagrate.createButton({
			icon: './icon/binary-water-brush' + (devicePixelRatio % 1 === 0 ? '' : '.alt') + '.svg',
			attribute: {
				title: 'Binary Water Brush'.__()
			},
			onSelect: function () {
				
				stat.type = 'binary';
				stat.tool = 'water-brush';
				
				brush.setPreset('binary-circle');
			}
		}).insertTo(view.tools);
		
		flagrate.createButton({
			icon: './icon/water-brush.svg',
			attribute: {
				title: 'Water Brush'.__()
			},
			onSelect: function () {
				
				stat.type = 'normal';
				stat.tool = 'water-brush';
				
				brush.setPreset('normal-circle');
			}
		}).insertTo(view.tools);
		
		flagrate.createButton({
			icon: './icon/binary-eraser' + (devicePixelRatio % 1 === 0 ? '' : '.alt') + '.svg',
			attribute: {
				title: 'Binary Eraser'.__()
			},
			onSelect: function () {
				
				stat.type = 'binary';
				stat.tool = 'eraser';
				
				brush.setPreset('binary-circle');
			}
		}).insertTo(view.tools);
		
		flagrate.createButton({
			icon: './icon/eraser.svg',
			attribute: {
				title: 'Eraser'.__()
			},
			onSelect: function () {
				
				stat.type = 'normal';
				stat.tool = 'eraser';
				
				brush.setPreset('normal-circle');
			}
		}).insertTo(view.tools);
		
		view.swatch = flagrate.createElement().addClassName('swatch').insertTo(view.toolbar);
		var swatchButtonOnSelect = function (e) {
			
			var color = e.targetButton.style.backgroundColor;
			
			if (/^rgb/.test(color) === true) {
				var rgb = color.slice(4, -1).split(', ');
				color = '#';
				color += parseInt(rgb[0], 10).toString(16);
				color += parseInt(rgb[1], 10).toString(16);
				color += parseInt(rgb[2], 10).toString(16);
			}
			
			util.setColor(color);
		};
		var createSwatchButton = function (color) {
			
			flagrate.createButton({
				color: color,
				onSelect: swatchButtonOnSelect
			}).insertTo(view.swatch);
		};
		createSwatchButton('#000000');
		createSwatchButton('#ffffff');
		createSwatchButton('#aaaaaa');
		createSwatchButton('#b47575');
		createSwatchButton('#fa9696');
		createSwatchButton('#c096c0');
		createSwatchButton('#ffb6ff');
		createSwatchButton('#8080ff');
		createSwatchButton('#25c7c9');
		createSwatchButton('#e7e58d');
		createSwatchButton('#e7962d');
		createSwatchButton('#99cb7b');
		createSwatchButton('#fcece2');
		createSwatchButton('#f9ddcf');
		
		view.alpha = flagrate.createElement().addClassName('alpha').insertTo(view.toolbar);
		view.currentAlpha = flagrate.createElement('span').insertTo(view.alpha);
		view.alphaSlider = flagrate.createSlider({
			max: 255
		}).on('change', function () {
			
			util.setAlpha(Math.min(1, this.getValue() / 255));
		}).insertTo(view.alpha);
		
		view.size = flagrate.createElement().addClassName('size').insertTo(view.toolbar);
		view.currentSize = flagrate.createElement('span').insertTo(view.size);
		view.sizeSlider = flagrate.createSlider({
			max: 19
		}).on('change', function () {
			
			util.setSize(this.getValue() + 1);
		}).insertTo(view.size);
		
		view.chatLog = flagrate.Element.extend(document.getElementById('log'));
		view.clients = flagrate.Element.extend(document.getElementById('clients'));
		view.commands = flagrate.Element.extend(document.getElementById('commands'));
		
		util.setColor(stat.color);
		util.setAlpha(stat.alpha);
		util.setSize(stat.size);
		//util.setTool(stat.tool);// todo
		
		view.canvasContainer = document.getElementById('canvas-container');
		
		// [0] main canvas
		view.canvas = document.getElementById('canvas-main');
		view.canvas.width = canvasW;
		view.canvas.height = canvasH;
		stat.contexts.push(view.canvas.getContext('2d'));
		stat.contexts[0].mozImageSmoothingEnabled = false;
		stat.contexts[0].msImageSmoothingEnabled = false;
		stat.contexts[0].imageSmoothingEnabled = false;
		
		// [1] overlay
		view.overlayCanvas = document.getElementById('canvas-overlay');
		view.overlayCanvas.width = canvasW;
		view.overlayCanvas.height = canvasH;
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
		c.width = canvasW;
		c.height = canvasH;
		
		// [3] painting composition buffer
		c = document.createElement('canvas');
		stat.contexts.push(c.getContext('2d'));
		c.width = canvasW;
		c.height = canvasH;
		
		// [4] painted composition buffer
		c = document.createElement('canvas');
		stat.contexts.push(c.getContext('2d'));
		stat.contexts[4].globalCompositeOperation = 'copy';
		stat.contexts[4].mozImageSmoothingEnabled = false;
		stat.contexts[4].msImageSmoothingEnabled = false;
		stat.contexts[4].imageSmoothingEnabled = false;
		
		// [5..] layer buffer
		var img;
		var getImgOnload = function (layerNumber) {
			
			return function () {
				
				stat.contexts[layerNumber + 5].drawImage(this, 0, 0);
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
			c.width = canvasW;
			c.height = canvasH;
			
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
		
		if (window.PointerEvent) {
			view.scrollX.addEventListener('pointerdown', listener.scrollStart);
			view.scrollY.addEventListener('pointerdown', listener.scrollStart);
			
			view.overlayCanvas.addEventListener('pointermove', listener.canvasOnPointerMove);
			view.overlayCanvas.addEventListener('pointerdown', listener.canvasOnPointerDown);
			view.overlayCanvas.addEventListener('pointerup', listener.canvasOnPointerUp);
			view.overlayCanvas.addEventListener('pointerleave', listener.canvasOnPointerLeave);
			view.overlayCanvas.addEventListener('pointerenter', listener.canvasOnPointerEnter);
		} else {
			view.scrollX.addEventListener('mousedown', listener.scrollStart);
			view.scrollY.addEventListener('mousedown', listener.scrollStart);
			
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
		stat.contexts[0].clearRect(
			stat.viewArea.tlX,
			stat.viewArea.tlY,
			stat.viewArea.width,
			stat.viewArea.height
		);
		
		for (i = 0; i < config.layerCount; i++) {
			if (stat.painting === true && stat.layerNumber === i) {
				// -> painting composition buffer
				stat.contexts[3].globalCompositeOperation = 'copy';
				stat.contexts[3].globalAlpha = 1;
				
				// <- layer buffer
				stat.contexts[3].drawImage(
					stat.contexts[i + 5].canvas,
					stat.viewArea.tlX,
					stat.viewArea.tlY,
					stat.viewArea.width,
					stat.viewArea.height,
					stat.viewArea.tlX,
					stat.viewArea.tlY,
					stat.viewArea.width,
					stat.viewArea.height
				);
				
				if (stat.mode === 'normal') {
					stat.contexts[3].globalCompositeOperation = 'source-over';
				} else if (stat.mode === 'erase') {
					stat.contexts[3].globalCompositeOperation = 'destination-out';
				}
				stat.contexts[3].globalAlpha = stat.alpha;
				
				// <- painting buffer
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
				
				// canvas <- painting composition buffer
				stat.contexts[0].drawImage(
					stat.contexts[3].canvas,
					stat.viewArea.tlX,
					stat.viewArea.tlY,
					stat.viewArea.width,
					stat.viewArea.height,
					stat.viewArea.tlX,
					stat.viewArea.tlY,
					stat.viewArea.width,
					stat.viewArea.height
				);
			} else {
				// canvas <- layer buffer
				stat.contexts[0].drawImage(
					stat.contexts[i + 5].canvas,
					stat.viewArea.tlX,
					stat.viewArea.tlY,
					stat.viewArea.width,
					stat.viewArea.height,
					stat.viewArea.tlX,
					stat.viewArea.tlY,
					stat.viewArea.width,
					stat.viewArea.height
				);
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
		stat.contexts[1].clearRect(
			stat.viewArea.tlX,
			stat.viewArea.tlY,
			stat.viewArea.width,
			stat.viewArea.height
		);
		
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
		
		if (stat.painting === false) {
			if (stat.tool === 'eraser') {
				stat.mode = 'erase';
			} else {
				stat.mode = 'normal';
				
				if (stat.wacom) {
					stat.mode = stat.wacom.isEraser ? 'erase' : 'normal';
				}
			}
		}
		
		if (moved && stat.painting) {
			if ((e.type === 'mousemove' && e.which === 0) || (e.type === 'pointermove' && e.buttons === 0)) {
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
				} else if (stat.tool === 'brush' || stat.tool === 'water-brush') {
					size = size * pressure;
				}
			}
			if (stat.pressure.alpha) {
				if (stat.tool === 'pencil' || stat.tool === 'water-brush') {
					alpha = pressure * alpha;
				}
			}
			
			if (stat.mode === 'erase') {
				color = '#ffffff';
			}
			
			if (stat.type === 'binary') {
				size = Math.round(size);
				if (size < 1) {
					size = 1;
				}
			}
			
			if (stat.tool === 'water-brush') {
				mixing = false;
			}
			
			for (i = 0, l = dist; i < l; i++) {
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
				stat.paintedArea.tlX = Math.min(Math.max(0, x - size >> 0), canvasW - 1);
			}
			if (stat.paintedArea.tlY > y - size >> 0) {
				stat.paintedArea.tlY = Math.min(Math.max(0, y - size >> 0), canvasH - 1);
			}
			if (stat.paintedArea.brX < Math.ceil(x + size)) {
				stat.paintedArea.brX = Math.min(Math.max(stat.paintedArea.tlX, Math.ceil(x + size)), canvasW);
			}
			if (stat.paintedArea.brY < Math.ceil(y + size)) {
				stat.paintedArea.brY = Math.min(Math.max(stat.paintedArea.tlY, Math.ceil(y + size)), canvasH);
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
		
		if (moved) {
			socket.emit('pointer', {
				x: x,
				y: y
			});
		}
	};
	
	listener.canvasOnPointerDown = function (e) {
		
		if (stat.scrolling === true || stat.painting === true) {
			return;
		}
		
		e.stopPropagation();
		e.preventDefault();
		
		if (!document.hasFocus()) {
			document.body.focus();
		}
		
		var x = stat.x = typeof e.offsetX === 'number' ? e.offsetX : e.layerX,
			y = stat.y = typeof e.offsetY === 'number' ? e.offsetY : e.layerY;
		
		if (e.pointerType === 'pen' || e.pointerType === 'mouse') {
			if (e.buttons === 1) {
				stat.mode = 'normal';
			} else if (e.buttons === 32) {
				stat.mode = 'erase';
			} else if (e.buttons === 2) {
				util.pickColor();
				return;
			}
			
			if (stat.tool === 'eraser') {
				stat.mode = 'erase';
			}
		} else if (e.pointerType === 'touch') {
			listener.scrollStart(e, true);
			return;
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
					size = (pressure + 1) / 2 * size;
				} else if (stat.tool === 'brush' || stat.tool === 'water-brush') {
					size = size * pressure;
				}
			}
			if (stat.pressure.alpha) {
				if (stat.tool === 'pencil' || stat.tool === 'water-brush') {
					alpha = alpha * pressure;
				}
			}
			
			context.clearRect(0, 0, canvasW, canvasH);
			
			if (stat.mode === 'erase') {
				color = '#ffffff';
			}
			
			if (stat.type === 'binary') {
				size = Math.round(size);
				if (size < 1) {
					size = 1;
				}
			}
			
			if (stat.tool === 'water-brush') {
				mixing = false;
			}
			
			brush.draw(context, x, y, size, alpha, color, mixing);
			
			stat.paintedArea.tlX = Math.min(Math.max(0, x - size >> 0), canvasW - 1);
			stat.paintedArea.tlY = Math.min(Math.max(0, y - size >> 0), canvasH - 1);
			stat.paintedArea.brX = Math.min(Math.max(stat.paintedArea.tlX, Math.ceil(x + size)), canvasW);
			stat.paintedArea.brY = Math.min(Math.max(stat.paintedArea.tlY, Math.ceil(y + size)), canvasH);
			
			stat.strokePoints = [[x, y, size, alpha]];
			
			socket.emit('stroke', {
				points: stat.strokePoints
			});
		}
	};
	
	listener.canvasOnPointerUp = function (e) {
		
		//e.stopPropagation();
		e.preventDefault();
		
		if (stat.painting === false) {
			return;
		}
		stat.painting = false;
		
		var paintedWidth = stat.paintedArea.brX - stat.paintedArea.tlX;
		var paintedHeight = stat.paintedArea.brY - stat.paintedArea.tlY;
		
		// -> current layer buffer
		var context = stat.contexts[stat.layerNumber + 5];
		
		if (stat.mode === 'normal') {
			context.globalCompositeOperation = 'source-over';
		} else if (stat.mode === 'erase') {
			context.globalCompositeOperation = 'destination-out';
		}
		context.globalAlpha = stat.alpha;
		
		// <- painting buffer
		context.drawImage(
			stat.contexts[2].canvas,
			stat.paintedArea.tlX,
			stat.paintedArea.tlY,
			paintedWidth,
			paintedHeight,
			stat.paintedArea.tlX,
			stat.paintedArea.tlY,
			paintedWidth,
			paintedHeight
		);
		
		stat.changed = true;
		
		stat.strokePoints = [];
		
		setTimeout(util.queuePainted, 10, {
			layerNumber: stat.layerNumber,
			mode: stat.mode,
			x: stat.paintedArea.tlX,
			y: stat.paintedArea.tlY,
			width: paintedWidth,
			height: paintedHeight
		});
	};
	
	listener.canvasOnPointerLeave = function (e) {
		
		e.stopPropagation();
		e.preventDefault();
		
		if (stat.painting === true) {
			listener.canvasOnPointerUp(e);
			stat.interrupted = true;
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
		
		if ((typeof e.buttons === 'undefined' && e.which === 1) || e.buttons === 1 || e.buttons === 32) {
			if (stat.interrupted === true) {
				listener.canvasOnPointerDown(e);
				stat.interrupted = false;
			}
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
			
			// -> layer buffer
			stat.contexts[paint.layerNumber + 5].globalCompositeOperation = 'source-over';
			stat.contexts[paint.layerNumber + 5].globalAlpha = 1;
			stat.contexts[paint.layerNumber + 5].clearRect(paint.x, paint.y, img.width, img.height);
			stat.contexts[paint.layerNumber + 5].drawImage(img, paint.x, paint.y);
			
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
	
	listener.scrollStart = function (e, byCanvas) {
		
		e.preventDefault();
		e.stopPropagation();
		
		stat.scrolling = true;
		
		var end,
			scroll,
			prevX = e.clientX,
			prevY = e.clientY,
			ratioX = view.scrollX.clientWidth / view.scrollXB.clientWidth,
			ratioY = view.scrollY.clientHeight / view.scrollYB.clientHeight;
		
		end = function () {
			
			document.removeEventListener('pointermove', scroll, true);
			document.removeEventListener('pointerup', end, true);
			document.removeEventListener('mousemove', scroll, true);
			document.removeEventListener('mouseup', end, true);
			
			stat.scrolling = false;
		};
		
		scroll = function (e) {
			
			e.preventDefault();
			e.stopPropagation();
			
			if (e.which === 0 && e.buttons !== 1 && e.buttons !== 32) {
				end();
				return;
			}
			
			var movementX = e.clientX - prevX,
				movementY = e.clientY - prevY;
			
			if (byCanvas) {
				view.canvasContainer.scrollLeft -= movementX;
				view.canvasContainer.scrollTop -= movementY;
			} else {
				view.canvasContainer.scrollLeft += movementX * ratioX;
				view.canvasContainer.scrollTop += movementY * ratioY;
			}
			
			prevX = e.clientX;
			prevY = e.clientY;
			
			util.setScrollbars();
		};
		
		if (window.PointerEvent) {
			document.addEventListener('pointermove', scroll, true);
			document.addEventListener('pointerup', end, true);
		} else {
			document.addEventListener('mousemove', scroll, true);
			document.addEventListener('mouseup', end, true);
		}
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
		
		stat.viewArea.tlX = scrollLeft;
		stat.viewArea.tlY = scrollTop;
		stat.viewArea.brX = Math.min(canvasWidth, scrollLeft + viewWidth);
		stat.viewArea.brY = Math.min(canvasHeight, scrollTop + viewHeight);
		stat.viewArea.width = stat.viewArea.brX - stat.viewArea.tlX;
		stat.viewArea.height = stat.viewArea.brY - stat.viewArea.tlY;
		
		stat.changed = true;
	};
	
	util.cleanup = function () {
		
		view.scrollX.removeEventListener('pointerdown', listener.scrollStart);
		view.scrollY.removeEventListener('pointerdown', listener.scrollStart);
		view.scrollX.removeEventListener('mousedown', listener.scrollStart);
		view.scrollY.removeEventListener('mousedown', listener.scrollStart);
		
		view.canvas.removeEventListener('pointermove', listener.canvasOnPointerMove);
		view.canvas.removeEventListener('pointerdown', listener.canvasOnPointerDown);
		view.canvas.removeEventListener('pointerup', listener.canvasOnPointerUp);
		view.canvas.removeEventListener('pointerleave', listener.canvasOnPointerLeave);
		view.canvas.removeEventListener('pointerenter', listener.canvasOnPointerEnter);
		view.canvas.removeEventListener('mousemove', listener.canvasOnPointerMove);
		view.canvas.removeEventListener('mousedown', listener.canvasOnPointerDown);
		view.canvas.removeEventListener('mouseup', listener.canvasOnPointerUp);
		view.canvas.removeEventListener('mouseleave', listener.canvasOnPointerLeave);
		view.canvas.removeEventListener('mouseenter', listener.canvasOnPointerEnter);
		view.canvas.removeEventListener('contextmenu', listener.stopEvent);
		view.canvas.removeEventListener('click', listener.stopEvent);
		
		socket.removeAllListeners('clients');
		socket.removeAllListeners('pointer');
		socket.removeAllListeners('stroke');
		socket.removeAllListeners('paint');
		socket.removeAllListeners('chat');
		socket.removeAllListeners('disconnect');
	};
	
	util.setColor = function (color) {
		
		stat.color = color;
		
		//todo
	};
	
	util.setAlpha = function (alpha) {
		
		stat.alpha = alpha;
		
		view.currentAlpha.updateText('A' + Math.round(alpha * 255));
		
		if (Math.round(alpha * 255) !== view.alphaSlider.getValue()) {
			view.alphaSlider.setValue(Math.round(alpha * 255));
		}
	};
	
	util.setSize = function (size) {
		
		stat.size = size;
		
		view.currentSize.updateText('Size'.__() + ': ' + size);
		
		if (size - 1 !== view.sizeSlider.getValue()) {
			view.sizeSlider.setValue(size - 1);
		}
	};
	
	util.pickColor = function () {
		
		
	};
	
	util.queuePainted = function (painted) {
		
		if (stat.painting === true) {
			setTimeout(util.queuePainted, 100, painted);
			return;
		}
		
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
		var context = stat.contexts[4];
		var canvas  = context.canvas;
		context.canvas.width = painted.width;
		context.canvas.height = painted.height;
		
		// <- current layer buffer
		context.drawImage(
			stat.contexts[painted.layerNumber + 5].canvas,
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
			layerNumber: painted.layerNumber,
			mode: painted.mode,
			x: painted.x,
			y: painted.y,
			data: bytes.buffer
		});
		
		socket.once('painted', function () {
			
			stat.paintedSending = false;
			setTimeout(util.queuePainted, 10);
		});
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