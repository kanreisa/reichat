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

	var initialize, entry, standby, ready, tick, updatePointer;
	var select, draw, drawLine, drawArea, tie;

	var ui = window.ui = {},
		util = window.util = {},
		view = window.view = {},
		timer = window.timer = {};

	var listener = {};

	var map = {
		client: {}
	};

	var layerContexts = window.layerContexts = [];
	var overlayContext;
	var paintingContext;
	var paintingCompositionContext;
	var paintedCompositionContext;

	var stat = window.stat = {
		width: 0,
		height: 0,
		changed: true,
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
		selecting: false,
		selectedArea: {
			tlX: 0,
			tlY: 0,
			brX: 0,
			brY: 0,
			sX: 0,
			sY: 0,
			width: 0,
			height: 0
		},
		paintedQueues: [],
		paintedSending: false,
		pointers: [],
		clients: [],
		strokes: [],
		strokePoints: [],
		layerNumber: 0,
		mode: 'normal',
		type: 'binary',
		tool: 'pen',
		color: '#000000',
		mixing: false,
		alpha: 1,
		size: 1,
		zoom: 1,
		stabilize: 1,
		viewArea: {
			tlX: 0,
			tlY: 0,
			brX: 1,
			brY: 1,
			width: 1,
			height: 1
		},
		pressedKeys: [],
		lastType: 'binary',
		lastTool: 'pen',
		pointerLastMoved: Date.now()
	};

	if (localStorage.getItem('stat.type') && localStorage.getItem('stat.tool')) {
		stat.type = localStorage.getItem('stat.type');
		stat.tool = localStorage.getItem('stat.tool');
	}

	if (localStorage.getItem('stat.color')) {
		stat.color = localStorage.getItem('stat.color');
	}

	var canvasW = 0, canvasH = 0;
	var pointerX = -1, pointerY = -1, pointerRawX = -1, pointerRawY = -1;

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
			ui.promptClientName(entry, function () {

				location.href = './';
			});
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

		var i;

		view.mask = flagrate.Element.extend(document.getElementById('mask'));
		view.progress = flagrate.createProgress({
			max: config.layerCount
		}).insertTo(view.mask);

		view.toolbar = flagrate.Element.extend(document.getElementById('toolbar'));

		view.tools = flagrate.createElement().addClassName('tools');
		view.tools.insertTo(view.toolbar);

		view.toolBtn = {
			binary: {},
			normal: {},
			area: {},
			select: {}
		};

		view.toolBtn.binary.pen = flagrate.createButton({
			icon: './icon/binary-pen' + (devicePixelRatio % 1 === 0 ? '' : '.alt') + '.svg',
			attribute: {
				title: 'Binary Pen'.__()
			},
			onSelect: function () {

				util.setTool('binary', 'pen');
			}
		}).insertTo(view.tools);

		view.toolBtn.normal.pen = flagrate.createButton({
			icon: './icon/pen.svg',
			attribute: {
				title: 'Pen'.__()
			},
			onSelect: function () {

				util.setTool('normal', 'pen');
			}
		}).insertTo(view.tools);

		view.toolBtn.binary.pencil = flagrate.createButton({
			icon: './icon/binary-pencil' + (devicePixelRatio % 1 === 0 ? '' : '.alt') + '.svg',
			attribute: {
				title: 'Binary Pencil'.__()
			},
			onSelect: function () {

				util.setTool('binary', 'pencil');
			}
		}).insertTo(view.tools);

		view.toolBtn.normal.pencil = flagrate.createButton({
			icon: './icon/pencil.svg',
			attribute: {
				title: 'Pencil'.__()
			},
			onSelect: function () {

				util.setTool('normal', 'pencil');
			}
		}).insertTo(view.tools);

		view.toolBtn.binary.brush = flagrate.createButton({
			icon: './icon/binary-brush' + (devicePixelRatio % 1 === 0 ? '' : '.alt') + '.svg',
			attribute: {
				title: 'Binary Brush'.__()
			},
			onSelect: function () {

				util.setTool('binary', 'brush');
			}
		}).insertTo(view.tools);

		view.toolBtn.normal.brush = flagrate.createButton({
			icon: './icon/brush.svg',
			attribute: {
				title: 'Brush'.__()
			},
			onSelect: function () {

				util.setTool('normal', 'brush');
			}
		}).insertTo(view.tools);

		view.toolBtn.binary['water-brush'] = flagrate.createButton({
			icon: './icon/binary-water-brush' + (devicePixelRatio % 1 === 0 ? '' : '.alt') + '.svg',
			attribute: {
				title: 'Binary Water Brush'.__()
			},
			onSelect: function () {

				util.setTool('binary', 'water-brush');
			}
		}).insertTo(view.tools);

		view.toolBtn.normal['water-brush'] = flagrate.createButton({
			icon: './icon/water-brush.svg',
			attribute: {
				title: 'Water Brush'.__()
			},
			onSelect: function () {

				util.setTool('normal', 'water-brush');
			}
		}).insertTo(view.tools);

		view.toolBtn.binary.eraser = flagrate.createButton({
			icon: './icon/binary-eraser' + (devicePixelRatio % 1 === 0 ? '' : '.alt') + '.svg',
			attribute: {
				title: 'Binary Eraser'.__()
			},
			onSelect: function () {

				util.setTool('binary', 'eraser');
			}
		}).insertTo(view.tools);

		view.toolBtn.normal.eraser = flagrate.createButton({
			icon: './icon/eraser.svg',
			attribute: {
				title: 'Eraser'.__()
			},
			onSelect: function () {

				util.setTool('normal', 'eraser');
			}
		}).insertTo(view.tools);

		view.toolBtn.area.fill = flagrate.createButton({
			icon: './icon/area-fill.svg',
			attribute: {
				title: 'Rectangular Fill'.__()
			},
			onSelect: function () {

				util.setTool('area', 'fill');
			}
		}).insertTo(view.tools);

		view.toolBtn.area.eraser = flagrate.createButton({
			icon: './icon/area-eraser.svg',
			attribute: {
				title: 'Rectangular Eraser'.__()
			},
			onSelect: function () {

				util.setTool('area', 'eraser');
			}
		}).insertTo(view.tools);

		view.toolBtn.select.copy = flagrate.createButton({
			icon: './icon/select-copy.svg',
			attribute: {
				title: 'Rectangular COPY'.__()
			},
			onSelect: function () {

				util.setTool('select', 'copy');
			}
		}).insertTo(view.tools);

		view.toolBtn.select.move = flagrate.createButton({
			icon: './icon/select-move.svg',
			attribute: {
				title: 'Rectangular MOVE'.__()
			},
			onSelect: function () {

				util.setTool('select', 'move');
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

		view.color = flagrate.createButton().addClassName('color').insertTo(view.toolbar);

		view.r = flagrate.createElement().addClassName('r').insertTo(view.toolbar);
		view.currentR = flagrate.createElement('span').insertText('R0').insertTo(view.r);
		view.rSlider = flagrate.createSlider({
			max: 255
		}).on('change', function () {

			var c = parseInt(stat.color.slice(1), 16),
				g = c >> 8 & 0xff,
				b = c & 0xff,
				color = '#';

			color += ('0' + this.getValue().toString(16)).slice(-2);
			color += ('0' + g.toString(16)).slice(-2);
			color += ('0' + b.toString(16)).slice(-2);

			if (stat.color !== color) {
				util.setColor(color);
			}

			view.currentR.updateText('R' + this.getValue());
		}).insertTo(view.r);

		view.g = flagrate.createElement().addClassName('g').insertTo(view.toolbar);
		view.currentG = flagrate.createElement('span').insertText('G0').insertTo(view.g);
		view.gSlider = flagrate.createSlider({
			max: 255
		}).on('change', function () {

			var c = parseInt(stat.color.slice(1), 16),
				r = c >> 16,
				b = c & 0xff,
				color = '#';

			color += ('0' + r.toString(16)).slice(-2);
			color += ('0' + this.getValue().toString(16)).slice(-2);
			color += ('0' + b.toString(16)).slice(-2);

			if (stat.color !== color) {
				util.setColor(color);
			}

			view.currentG.updateText('G' + this.getValue());
		}).insertTo(view.g);

		view.b = flagrate.createElement().addClassName('b').insertTo(view.toolbar);
		view.currentB = flagrate.createElement('span').insertText('B0').insertTo(view.b);
		view.bSlider = flagrate.createSlider({
			max: 255
		}).on('change', function () {

			var c = parseInt(stat.color.slice(1), 16),
				r = c >> 16,
				g = c >> 8 & 0xff,
				color = '#';

			color += ('0' + r.toString(16)).slice(-2);
			color += ('0' + g.toString(16)).slice(-2);
			color += ('0' + this.getValue().toString(16)).slice(-2);

			if (stat.color !== color) {
				util.setColor(color);
			}

			view.currentB.updateText('B' + this.getValue());
		}).insertTo(view.b);

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

		view.stabilize = flagrate.createElement().addClassName('stabilize').insertTo(view.toolbar);
		view.currentStabilize = flagrate.createElement('span').insertTo(view.stabilize);
		view.stabilizeSlider = flagrate.createSlider({
			max: 10
		}).on('change', function () {

			util.setStabilize(this.getValue());
		}).insertTo(view.stabilize);

		view.layerButtons = [];

		view.layerButtonsContainer = flagrate.createElement('div', { 'class': 'layer-buttons' });
		view.layerButtonsContainer.insertTo(view.toolbar);

		var craeteLayerButtonOnSelectHandler = function (i) {
			return function () {
				util.setLayer(i);
			};
		};
		var craeteLayerButtonOnEnterHandler = function (i) {
			return function () {
				var j;
				for (j = 0; j < config.layerCount; j++) {
					if (j !== i) {
						(stat.layerNumber === j ? paintingCompositionContext : layerContexts[j]).canvas.style.opacity = 0.25;
					}
				}
			};
		};
		var layerButtonOnLeaveHandler = function () {
			var i;
			for (i = 0; i < config.layerCount; i++) {
				layerContexts[i].canvas.style.opacity = 1;
			}
			paintingCompositionContext.canvas.style.opacity = 1;
		};
		for (i = config.layerCount - 1; i >= 0; i--) {
			view.layerButtons[i] = flagrate.createButton({
				label: 'Layer'.__() + ' ' + i,
				onSelect: craeteLayerButtonOnSelectHandler(i)
			}).insertTo(view.layerButtonsContainer);

			view.layerButtons[i].on('mouseenter', craeteLayerButtonOnEnterHandler(i));
			view.layerButtons[i].on('mouseleave', layerButtonOnLeaveHandler);
		}

		timer.updateLayerPreview = setInterval(util.updateLayerPreview, 10000);

		view.chatLog = flagrate.Element.extend(document.getElementById('log'));
		view.clients = flagrate.Element.extend(document.getElementById('clients'));
		view.commands = flagrate.Element.extend(document.getElementById('commands'));

		var sendChat = function () {

			var value = view.chatInput.getValue().trim();

			if (value === '') {
				return;
			}

			view.chatInput.setValue('');

			// command trap
			if (/^\/[a-z0-9\-]+/.test(value) === true) {
				if (value === '/clear') {
					ui.clearCanvas();
				} else {
					util.addChatLog(Date.now(), 'reichat', 'invalid command.');
				}
				return;
			}

			socket.emit('chat', {
				message: value
			});
		};

		view.chatInput = flagrate.createTextInput({
			placeholder: '(' + 'Enter key to Focus here'.__() + ')',
			attribute: {
				maxlength: 128
			}
		}).on('keydown', function (e) {

			e.stopPropagation();

			if (e.keyCode === 13) {
				setTimeout(sendChat, 0);
			} else if (e.keyCode === 27) {
				view.chatInput.blur();
				document.body.focus();
			}
		}, true).insertTo(view.commands);
		util.addChatLog(Date.now(), 'reichat', 'Loading'.__());

		var setNameButton = function () {

			view.nameButton.setLabel(client.name);
			view.chatInput.style.paddingLeft = 10 + view.nameButton.getWidth() + 'px';
		};

		view.nameButton = flagrate.createButton({
			className: 'name',
			label: client.name,
			onSelect: function () {

				ui.promptClientName(function () {

					setNameButton();

					socket.emit('client', client);
				});
			}
		}).insertTo(view.commands);

		setNameButton();

		view.sendButton = flagrate.createButton({
			className: 'send',
			color: '@blue',
			label: 'Send'.__(),
			onSelect: sendChat
		}).insertTo(view.commands);

		view.exitButton = flagrate.createButton({
			className: 'exit',
			label: 'Exit'.__(),
			onSelect: function () {

				window.location = './';
			}
		}).insertTo(view.commands);

		view.canvasContainer = document.getElementById('canvas-container');

		var c;

		// background canvas
		c = document.createElement('canvas');
		view.canvasContainer.appendChild(c);
		c.style.zIndex = 0;
		c.style.backgroundColor = '#ffffff';
		c.width = canvasW;
		c.height = canvasH;

		// overlay
		view.overlayCanvas = flagrate.Element.extend(document.getElementById('canvas-overlay'));
		view.overlayCanvas.width = canvasW;
		view.overlayCanvas.height = canvasH;
		overlayContext = view.overlayCanvas.getContext('2d');
		overlayContext.globalAlpha = 0.8;
		overlayContext.lineWidth = 1;
		overlayContext.mozImageSmoothingEnabled = false;
		overlayContext.msImageSmoothingEnabled = false;
		overlayContext.imageSmoothingEnabled = false;

		// painting buffer
		c = document.createElement('canvas');
		paintingContext = c.getContext('2d');
		c.width = canvasW;
		c.height = canvasH;
		paintingContext.mozImageSmoothingEnabled = false;
		paintingContext.msImageSmoothingEnabled = false;
		paintingContext.imageSmoothingEnabled = false;

		// painting composition buffer
		c = document.createElement('canvas');
		view.canvasContainer.appendChild(c);
		paintingCompositionContext = c.getContext('2d');
		c.width = canvasW;
		c.height = canvasH;
		paintingCompositionContext.globalCompositeOperation = 'copy';
		paintingCompositionContext.globalAlpha = 1;
		paintingCompositionContext.mozImageSmoothingEnabled = false;
		paintingCompositionContext.msImageSmoothingEnabled = false;
		paintingCompositionContext.imageSmoothingEnabled = false;

		// painted composition buffer
		c = document.createElement('canvas');
		paintedCompositionContext = c.getContext('2d');
		paintedCompositionContext.globalCompositeOperation = 'copy';
		paintedCompositionContext.mozImageSmoothingEnabled = false;
		paintedCompositionContext.msImageSmoothingEnabled = false;
		paintedCompositionContext.imageSmoothingEnabled = false;

		// layer buffer
		var img;
		var getImgOnload = function (layerNumber) {

			return function () {

				layerContexts[layerNumber].drawImage(this, 0, 0);
				stat.changed = true;

				view.layerButtons[layerNumber].style.backgroundImage = 'url(' + this.src + ')';

				view.progress.setValue(view.progress.getValue() + 1);
				if (view.progress.getValue() === config.layerCount) {
					ready();
					view.progress.remove();
				}
			};
		};
		for (i = 0; i < config.layerCount; i++) {
			c = document.createElement('canvas');
			view.canvasContainer.appendChild(c);
			layerContexts.push(c.getContext('2d'));
			c.width = canvasW;
			c.height = canvasH;

			img = new Image();
			img.src = 'layers/' + i + '?' + Date.now();
			img.onload = getImgOnload(i);

			c.style.zIndex = 1 + i * 2;
		}

		util.setColor(stat.color);
		util.setAlpha(stat.alpha);
		util.setStabilize(stat.stabilize);
		util.setLayer(stat.layerNumber);
		util.setTool(stat.type, stat.tool);

		requestAnimationFrame(tick);
		timer.updatePointer = setInterval(updatePointer, 4);

		socket.on('clients', listener.socketOnClients);
		socket.on('pointer', listener.socketOnPointer);
		socket.on('stroke', listener.socketOnStroke);
		socket.on('paint', listener.socketOnPaint);
		socket.on('chat', listener.socketOnChat);
		socket.on('disconnect', listener.socketOnDisconnect);
		socket.on('painted', listener.socketOnPainted);

		view.paint = document.getElementById('paint');
		view.scrollX = document.getElementById('scroll-x');
		view.scrollY = document.getElementById('scroll-y');
		view.scrollXB = document.getElementById('scroll-x-bar');
		view.scrollYB = document.getElementById('scroll-y-bar');
		view.zoomIn = document.getElementById('zoom-in');
		view.zoomOut = document.getElementById('zoom-out');
		view.fullScr = document.getElementById('fullscreen');

		util.setScrollbars();

		window.addEventListener('resize', util.setScrollbars);

		view.scrollX.addEventListener('pointerdown', listener.scrollStart);
		view.scrollY.addEventListener('pointerdown', listener.scrollStart);

		view.zoomIn.addEventListener('click', util.zoomIn);
		view.zoomOut.addEventListener('click', util.zoomOut);
		view.fullScr.addEventListener('click', util.toggleFullScreen);

		view.overlayCanvas.addEventListener('pointermove', listener.canvasOnPointerMove);
		view.overlayCanvas.addEventListener('pointerdown', listener.canvasOnPointerDown);
		view.overlayCanvas.addEventListener('pointerup', listener.canvasOnPointerUp);
		view.overlayCanvas.addEventListener('pointerleave', listener.canvasOnPointerLeave);
		view.overlayCanvas.addEventListener('pointerenter', listener.canvasOnPointerEnter);

		view.overlayCanvas.addEventListener('contextmenu', listener.stopEvent);
		view.overlayCanvas.addEventListener('click', listener.stopEvent);

		window.addEventListener('keydown', listener.documentOnKeydown);
		window.addEventListener('keyup', listener.documentOnKeyup);
	};

	ready = function () {

		view.mask.hide();

		util.addChatLog(Date.now(), 'reichat', 'Ready'.__());
	};

	tick = function () {

		if (stat.changed === false) {
			return requestAnimationFrame(tick);
		}
		stat.changed = false;

		var i, j, k, l, m, n, a, b, c;

		// <- layer buffer
		paintingCompositionContext.drawImage(
			layerContexts[stat.layerNumber].canvas,
			stat.viewArea.tlX,
			stat.viewArea.tlY,
			stat.viewArea.width,
			stat.viewArea.height,
			stat.viewArea.tlX,
			stat.viewArea.tlY,
			stat.viewArea.width,
			stat.viewArea.height
		);

		paintingCompositionContext.save();

		if (stat.mode === 'normal') {
			paintingCompositionContext.globalCompositeOperation = 'source-over';
		} else if (stat.mode === 'erase') {
			paintingCompositionContext.globalCompositeOperation = 'destination-out';
		}
		paintingCompositionContext.globalAlpha = stat.alpha;

		if (stat.painting === true) {
			// <- painting buffer
			paintingCompositionContext.drawImage(
				paintingContext.canvas,
				stat.paintedArea.tlX,
				stat.paintedArea.tlY,
				stat.paintedArea.brX - stat.paintedArea.tlX,
				stat.paintedArea.brY - stat.paintedArea.tlY,
				stat.paintedArea.tlX,
				stat.paintedArea.tlY,
				stat.paintedArea.brX - stat.paintedArea.tlX,
				stat.paintedArea.brY - stat.paintedArea.tlY
			);
		} else if (stat.type === 'select') {
			if (stat.selecting === true && stat.strokePoints[0][4] === false) {
				// <- painting buffer
				paintingCompositionContext.drawImage(
					paintingContext.canvas,
					stat.paintedArea.tlX,
					stat.paintedArea.tlY,
					stat.paintedArea.brX - stat.paintedArea.tlX,
					stat.paintedArea.brY - stat.paintedArea.tlY,
					stat.paintedArea.tlX,
					stat.paintedArea.tlY,
					stat.paintedArea.brX - stat.paintedArea.tlX,
					stat.paintedArea.brY - stat.paintedArea.tlY
				);
			}
		} else {
			// preview pointer
			if (pointerX >= 0 && pointerY >= 0) {
				// brush pointer
				if (stat.type === 'binary' || stat.type === 'normal') {
					brush.draw(paintingCompositionContext, pointerX, pointerY, stat.size, stat.alpha, stat.color, true);
				}
			}
		}

		paintingCompositionContext.restore();

		// overlay
		overlayContext.clearRect(
			stat.viewArea.tlX,
			stat.viewArea.tlY,
			stat.viewArea.width,
			stat.viewArea.height
		);

		for (i = 0, l = stat.pointers.length; i < l; i++) {
			a = stat.pointers[i];

			overlayContext.fillStyle = overlayContext.strokeStyle = a.client._color;
			overlayContext.strokeRect(a.x - 0.5, a.y - 0.5, 2, 2);
			overlayContext.fillText(a.client.name, a.x + 5, a.y + 5);

			for (j = 0, m = stat.strokes.length; j < m; j++) {
				b = stat.strokes[j];

				if (b.client.uuid === a.client.uuid) {
					for (k = 0, n = b.points.length; k < n; k++) {
						c = b.points[k];
						overlayContext.fillRect(c[0], c[1], 1, 1);
					}

					break;
				}
			}
		}

		if (stat.type === 'select') {
			if (stat.selectedArea.width > 1 && stat.selectedArea.height > 1) {
				overlayContext.save();

				overlayContext.strokeStyle = '#ffffff';
				overlayContext.strokeRect(
					stat.selectedArea.tlX - 0.5,
					stat.selectedArea.tlY - 0.5,
					stat.selectedArea.brX - stat.selectedArea.tlX + 1,
					stat.selectedArea.brY - stat.selectedArea.tlY + 1
				);

				overlayContext.setLineDash([4, 4]);
				overlayContext.lineDashOffset = 0.5;
				overlayContext.strokeStyle = '#000000';
				overlayContext.strokeRect(
					stat.selectedArea.tlX - 0.5,
					stat.selectedArea.tlY - 0.5,
					stat.selectedArea.brX - stat.selectedArea.tlX + 1,
					stat.selectedArea.brY - stat.selectedArea.tlY + 1
				);

				overlayContext.restore();
			}
		}

		requestAnimationFrame(tick);
	};

	updatePointer = function () {

		if (stat.painting === false && Math.round(pointerRawX - pointerX + pointerRawY - pointerY) !== 0) {
			stat.changed = true;
		}

		if (pointerRawX === -1 || pointerX === -1 || stat.stabilize === 0) {
			pointerX = pointerRawX;
		} else if (pointerRawX > pointerX) {
			pointerX += (pointerRawX - pointerX) * 0.75 / stat.stabilize;
		} else if (pointerRawX < pointerX) {
			pointerX -= (pointerX - pointerRawX) * 0.75 / stat.stabilize;
		}

		if (pointerRawY === -1 || pointerY === -1 || stat.stabilize === 0) {
			pointerY = pointerRawY;
		} else if (pointerRawY > pointerY) {
			pointerY += (pointerRawY - pointerY) * 0.75 / stat.stabilize;
		} else if (pointerRawY < pointerY) {
			pointerY -= (pointerY - pointerRawY) * 0.75 / stat.stabilize;
		}
	};

	select = function (e, start, end) {

		var area = stat.selectedArea;

		var isOut = area.tlX > pointerRawX || area.tlY > pointerRawY
		         || area.brX < pointerRawX || area.brY < pointerRawY;

		var point = [pointerRawX, pointerRawY, 1, 1, isOut];

		if (start === true) {
			stat.strokePoints = [point];
		}

		if (stat.strokePoints[0][4]) {
			if (stat.strokePoints[0][0] >= pointerRawX) {
				area.tlX = Math.min(Math.max(0, pointerRawX), canvasW - 1);
				area.brX = Math.min(Math.max(area.tlX + 1, stat.strokePoints[0][0]), canvasW);
			} else {
				area.tlX = Math.min(Math.max(area.tlX, stat.strokePoints[0][0]), canvasW);
				area.brX = Math.min(Math.max(0, pointerRawX + 1), canvasW - 1);
			}

			if (stat.strokePoints[0][1] >= pointerRawY) {
				area.tlY = Math.min(Math.max(0, pointerRawY), canvasH - 1);
				area.brY = Math.min(Math.max(area.tlY + 1, stat.strokePoints[0][1]), canvasH);
			} else {
				area.tlY = Math.min(Math.max(area.tlY, stat.strokePoints[0][1]), canvasH);
				area.brY = Math.min(Math.max(0, pointerRawY + 1), canvasH - 1);
			}

			area.sX = area.tlX;
			area.sY = area.tlY;
			area.width = area.brX - area.tlX;
			area.height = area.brY - area.tlY;

			if (end === true) {
				if (area.width === 1 && area.height === 1) {
					util.clearSelect();
				}
			}
		} else {
			if (start === true) {
				area.sX = area.tlX;
				area.sY = area.tlY;
			}

			var diffX = pointerRawX - stat.strokePoints[0][0];
			var diffY = pointerRawY - stat.strokePoints[0][1];
			var tlX = Math.max(0, area.tlX + diffX);
			var tlY = Math.max(0, area.tlY + diffY);

			paintingContext.save();

			paintingContext.globalCompositeOperation = 'copy';
			paintingContext.drawImage(
				layerContexts[stat.layerNumber].canvas,
				area.sX,
				area.sY,
				area.width,
				area.height,
				tlX,
				tlY,
				area.width,
				area.height
			);

			paintingContext.restore();

			stat.strokePoints[0][0] += diffX;
			stat.strokePoints[0][1] += diffY;

			area.tlX = tlX;
			area.tlY = tlY;
			area.brX = tlX + area.width;
			area.brY = tlY + area.height;

			if (stat.tool === 'copy') {
				stat.paintedArea.tlX = tlX;
				stat.paintedArea.tlY = tlY;
				stat.paintedArea.brX = area.brX;
				stat.paintedArea.brY = area.brY;
			} else if (stat.tool === 'move') {
				stat.paintedArea.tlX = Math.min(tlX, area.sX);
				stat.paintedArea.tlY = Math.min(tlY, area.sY);
				stat.paintedArea.brX = Math.max(area.brX, area.sX + area.width);
				stat.paintedArea.brY = Math.max(area.brY, area.sY + area.height);
			}
		}
	};

	draw = function (e, start) {

		if (stat.type === 'binary' || stat.type === 'normal') {
			drawLine(e, start);
		} else if (stat.type === 'area') {
			drawArea(e, start);
		}
	};

	drawArea = function (e, start) {

		var point = [pointerRawX, pointerRawY, 1, 1];

		if (start === true) {
			stat.strokePoints = [point];

			paintingContext.save();
			paintingContext.globalAlpha = 1;
			paintingContext.fillStyle = stat.color;
			paintingContext.fillRect(0, 0, canvasW, canvasH);
			paintingContext.restore();
		} else {
			stat.strokePoints[1] = point;
		}

		if (stat.strokePoints[0][0] >= pointerRawX) {
			stat.paintedArea.tlX = Math.min(Math.max(0, pointerRawX), canvasW - 1);
			stat.paintedArea.brX = Math.min(Math.max(stat.paintedArea.tlX + 1, stat.strokePoints[0][0]), canvasW);
		} else {
			stat.paintedArea.tlX = Math.min(Math.max(stat.paintedArea.tlX, stat.strokePoints[0][0]), canvasW);
			stat.paintedArea.brX = Math.min(Math.max(0, pointerRawX + 1), canvasW - 1);
		}

		if (stat.strokePoints[0][1] >= pointerRawY) {
			stat.paintedArea.tlY = Math.min(Math.max(0, pointerRawY), canvasH - 1);
			stat.paintedArea.brY = Math.min(Math.max(stat.paintedArea.tlY + 1, stat.strokePoints[0][1]), canvasH);
		} else {
			stat.paintedArea.tlY = Math.min(Math.max(stat.paintedArea.tlY, stat.strokePoints[0][1]), canvasH);
			stat.paintedArea.brY = Math.min(Math.max(0, pointerRawY + 1), canvasH - 1);
		}
	};

	drawLine = function (e, start) {

		var size = stat.size;
		var alpha = 1;

		var pressure = 0.5;

		if (e.pointerType === 'pen') {
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

		if (stat.type === 'binary') {
			size = Math.round(size);
			if (size < 1) {
				size = 1;
			}
		}

		var point = [pointerX, pointerY, size, alpha];

		if (start === true) {
			brush.draw(paintingContext, pointerX, pointerY, size, alpha, stat.color, stat.mixing);
		} else {
			tie(stat.strokePoints[0], point);
		}

		stat.strokePoints.unshift(point);

		if (start === true) {
			stat.paintedArea.tlX = Math.min(Math.max(0, pointerX - stat.size >> 0), canvasW - 1);
			stat.paintedArea.tlY = Math.min(Math.max(0, pointerY - stat.size >> 0), canvasH - 1);
			stat.paintedArea.brX = Math.min(Math.max(stat.paintedArea.tlX, Math.ceil(pointerX + stat.size)), canvasW);
			stat.paintedArea.brY = Math.min(Math.max(stat.paintedArea.tlY, Math.ceil(pointerY + stat.size)), canvasH);
		} else {
			if (stat.paintedArea.tlX > pointerX - stat.size >> 0) {
				stat.paintedArea.tlX = Math.min(Math.max(0, pointerX - stat.size >> 0), canvasW - 1);
			}
			if (stat.paintedArea.tlY > pointerY - stat.size >> 0) {
				stat.paintedArea.tlY = Math.min(Math.max(0, pointerY - stat.size >> 0), canvasH - 1);
			}
			if (stat.paintedArea.brX < Math.ceil(pointerX + stat.size)) {
				stat.paintedArea.brX = Math.min(Math.max(stat.paintedArea.tlX, Math.ceil(pointerX + stat.size)), canvasW);
			}
			if (stat.paintedArea.brY < Math.ceil(pointerY + stat.size)) {
				stat.paintedArea.brY = Math.min(Math.max(stat.paintedArea.tlY, Math.ceil(pointerY + stat.size)), canvasH);
			}
		}
	};

	tie = function (pA, pB) {

		var dist = Math.sqrt(Math.pow(pA[0] - pB[0], 2) + Math.pow(pA[1] - pB[1], 2));
		var difX = pB[0] - pA[0];
		var difY = pB[1] - pA[1];

		var i;
		for (i = 0; i < dist; i++) {
			brush.draw(
				paintingContext,
				pA[0] + i / dist * difX,
				pA[1] + i / dist * difY,
				pB[2] * i / dist + pA[2] * (1 - i / dist),
				pB[3] * i / dist + pA[3] * (1 - i / dist),
				stat.color,
				stat.mixing
			);
		}
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

		if (stat.zoom === 1) {
			pointerRawX = e.pageX + view.canvasContainer.scrollLeft - view.paint.offsetLeft;
			pointerRawY = e.pageY + view.canvasContainer.scrollTop - view.paint.offsetTop;
		} else {
			pointerRawX = (e.pageX + view.canvasContainer.scrollLeft - view.paint.offsetLeft) / stat.zoom;
			pointerRawY = (e.pageY + view.canvasContainer.scrollTop - view.paint.offsetTop) / stat.zoom;
		}

		stat.pointerLastMoved = Date.now();

		if (stat.painting === true) {
			draw(e, false);
		} else if (stat.selecting === true) {
			select(e, false);
		} else {
			stat.strokePoints = [];

			if (stat.tool === 'eraser') {
				stat.mode = 'erase';
			} else {
				stat.mode = 'normal';
			}
		}

		stat.changed = true;

		socket.emit('pointer', {
			x: pointerRawX,
			y: pointerRawY
		});

		if (stat.pointerLastMoved % 3 === 0) {
			socket.emit('stroke', {
				points: stat.strokePoints.slice(0, 100)
			});
		}
	};

	listener.canvasOnPointerDown = function (e) {

		if (stat.scrolling === true) {
			return;
		}

		if (!document.hasFocus()) {
			document.body.focus();
		}

		if (stat.zoom === 1) {
			pointerRawX = e.pageX + view.canvasContainer.scrollLeft - view.paint.offsetLeft;
			pointerRawY = e.pageY + view.canvasContainer.scrollTop - view.paint.offsetTop;
		} else {
			pointerRawX = (e.pageX + view.canvasContainer.scrollLeft - view.paint.offsetLeft) / stat.zoom;
			pointerRawY = (e.pageY + view.canvasContainer.scrollTop - view.paint.offsetTop) / stat.zoom;
		}

		if (pointerX === -1 && pointerY === -1) {
			pointerX = pointerRawX;
			pointerY = pointerRawY;
		}

		if (e.pointerType === 'pen' || e.pointerType === 'mouse') {
			if (stat.pressedKeys.indexOf(32) !== -1) {
				listener.scrollStart(e, true);
				return;
			} else if (e.buttons === 2 || (stat.pressedKeys.indexOf(17) !== -1 && stat.pressedKeys.indexOf(18) !== -1)) {
				if (stat.pressedKeys.indexOf(16) === -1) {
					var canvas = document.createElement('canvas');
					canvas.width = canvas.height = 1;
					var tmpContext = canvas.getContext('2d');
					tmpContext.fillStyle = '#ffffff';
					tmpContext.fillRect(0, 0, 1, 1);

					var i;
					for (i = 0; i < config.layerCount; i++) {
						tmpContext.drawImage(layerContexts[i].canvas, pointerRawX, pointerRawY, 1, 1, 0, 0, 1, 1);
					}

					util.pickColor(tmpContext, 0, 0);
				} else {
					util.pickColor(layerContexts[stat.layerNumber], pointerRawX, pointerRawY);
				}
				return;
			} else if (e.buttons === 1) {
				stat.mode = 'normal';
			} else if (e.buttons === 32) {
				stat.mode = 'erase';
			}

			if (stat.tool === 'eraser') {
				stat.mode = 'erase';
			}
		} else if (e.pointerType === 'touch') {
			listener.scrollStart(e, true);
			return;
		}

		if (e.buttons === 1 || e.buttons === 32) {
			if (stat.type === 'select') {
				stat.selecting = true;

				select(e, true);
			} else {
				stat.painting = true;

				draw(e, true);
			}

			stat.changed = true;
		}
	};

	listener.canvasOnPointerUp = function (e) {

		e.preventDefault();

		if (stat.zoom === 1) {
			pointerRawX = e.pageX + view.canvasContainer.scrollLeft - view.paint.offsetLeft;
			pointerRawY = e.pageY + view.canvasContainer.scrollTop - view.paint.offsetTop;
		} else {
			pointerRawX = (e.pageX + view.canvasContainer.scrollLeft - view.paint.offsetLeft) / stat.zoom;
			pointerRawY = (e.pageY + view.canvasContainer.scrollTop - view.paint.offsetTop) / stat.zoom;
		}

		if (stat.painting === false && stat.selecting === false) {
			return;
		}

		if (stat.painting === true) {
			draw(e, false);
		} else if (stat.selecting === true) {
			select(e, false, true);
		}

		stat.painting = false;
		stat.selecting = false;

		stat.changed = true;

		var paintedWidth = stat.paintedArea.brX - stat.paintedArea.tlX;
		var paintedHeight = stat.paintedArea.brY - stat.paintedArea.tlY;

		if (paintedWidth > 0 && paintedHeight > 0) {
			// -> current layer buffer
			var context = layerContexts[stat.layerNumber];

			if (stat.type === 'select' && stat.tool === 'move') {
				if (stat.strokePoints[0][4] === false) {
					// clear source area rect
					context.clearRect(
						stat.selectedArea.sX,
						stat.selectedArea.sY,
						stat.selectedArea.width,
						stat.selectedArea.height
					);
				}
			}

			if (stat.mode === 'normal') {
				context.globalCompositeOperation = 'source-over';
			} else if (stat.mode === 'erase') {
				context.globalCompositeOperation = 'destination-out';
			}
			context.globalAlpha = stat.alpha;

			// <- painting buffer
			context.drawImage(
				paintingContext.canvas,
				stat.paintedArea.tlX,
				stat.paintedArea.tlY,
				paintedWidth,
				paintedHeight,
				stat.paintedArea.tlX,
				stat.paintedArea.tlY,
				paintedWidth,
				paintedHeight
			);

			setTimeout(util.queuePainted, 10, {
				layerNumber: stat.layerNumber,
				mode: stat.mode,
				x: stat.paintedArea.tlX,
				y: stat.paintedArea.tlY,
				width: paintedWidth,
				height: paintedHeight
			});
		}

		// clean up
		stat.strokePoints = [];
		paintingContext.clearRect(0, 0, canvasW, canvasH);
	};

	listener.canvasOnPointerLeave = function (e) {

		e.stopPropagation();
		e.preventDefault();

		if (stat.painting === true || stat.selecting === true) {
			listener.canvasOnPointerUp(e);
			stat.interrupted = true;
		}

		pointerRawX = -1;
		pointerRawY = -1;
		pointerX = -1;
		pointerY = -1;

		socket.emit('pointer', {
			x: pointerRawX,
			y: pointerRawY
		});
	};

	listener.canvasOnPointerEnter = function (e) {

		e.stopPropagation();
		e.preventDefault();

		if (e.buttons === 1 || e.buttons === 32) {
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
			layerContexts[paint.layerNumber].globalCompositeOperation = 'source-over';
			layerContexts[paint.layerNumber].globalAlpha = 1;
			layerContexts[paint.layerNumber].clearRect(paint.x, paint.y, img.width, img.height);
			layerContexts[paint.layerNumber].drawImage(img, paint.x, paint.y);

			stat.changed = true;

			URL.revokeObjectURL(img.src);
		};
	};

	listener.socketOnPainted = function () {

		stat.paintedSending = false;
		setTimeout(util.queuePainted, 10);
	};

	listener.socketOnChat = function (chat) {

		if (chat.client) {
			var color = null;

			if (typeof map.client[chat.client.uuid] !== 'undefined') {
				color = map.client[chat.client.uuid]._color;
			}

			util.addChatLog(chat.time, chat.client.name, chat.message, color);
		} else {
			util.addChatLog(chat.time, 'reichat', chat.message.__());
		}
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
			ratioY = view.scrollY.clientHeight / view.scrollYB.clientHeight,
			scrollMaxX = Math.max(0, canvasW * stat.zoom - view.canvasContainer.offsetWidth),
			scrollMaxY = Math.max(0, canvasH * stat.zoom - view.canvasContainer.offsetHeight);

		end = function () {

			document.removeEventListener('pointermove', scroll, true);
			document.removeEventListener('pointerup', end, true);

			stat.scrolling = false;
		};

		scroll = function (e) {

			e.preventDefault();
			e.stopPropagation();

			if (e.buttons !== 1 && e.buttons !== 32) {
				end();
				return;
			}

			var movementX = e.clientX - prevX,
				movementY = e.clientY - prevY,
				scrollLeft = view.canvasContainer.scrollLeft,
				scrollTop = view.canvasContainer.scrollTop;

			if (byCanvas) {
				scrollLeft -= movementX;
				scrollTop -= movementY;
			} else {
				scrollLeft += movementX * ratioX;
				scrollTop += movementY * ratioY;
			}

			view.canvasContainer.scrollLeft = Math.min(scrollMaxX, scrollLeft);
			view.canvasContainer.scrollTop = Math.min(scrollMaxY, scrollTop);

			prevX = e.clientX;
			prevY = e.clientY;

			util.setScrollbars();
		};

		document.addEventListener('pointermove', scroll, true);
		document.addEventListener('pointerup', end, true);
	};

	listener.documentOnKeydown = function (e) {

		if (document.getElementsByClassName('flagrate-modal').length !== 0) {
			return;
		}

		if (stat.pressedKeys.indexOf(e.keyCode) === -1) {
			stat.pressedKeys.push(e.keyCode);
		}

		// Space
		if (e.keyCode === 32) {
			view.overlayCanvas.addClassName('panning');
			return;
		}

		// Ctrl + Alt
		if (e.ctrlKey === true && e.keyCode === 18) {
			e.preventDefault();
			view.overlayCanvas.addClassName('picking');
			return;
		}

		// Ctrl + A
		if (e.ctrlKey === true && e.keyCode === 65) {
			e.preventDefault();
			return;
		}

		// Tab
		if (e.keyCode === 9) {
			e.preventDefault();
			util.setTool(stat.lastType, stat.lastTool);
			return;
		}

		// Enter
		if (e.keyCode === 13) {
			view.chatInput.focus();
			return;
		}

		// ESC
		if (e.keyCode === 27) {
			if (stat.type === 'select') {
				util.clearSelect();
			}
			return;
		}
	};

	listener.documentOnKeyup = function (e) {

		if (document.getElementsByClassName('flagrate-modal').length !== 0) {
			return;
		}

		if (stat.pressedKeys.indexOf(e.keyCode) !== -1) {
			stat.pressedKeys.splice(stat.pressedKeys.indexOf(e.keyCode), 1);
		}

		// Space
		if (e.keyCode === 32) {
			view.overlayCanvas.removeClassName('panning');
			return;
		}

		// Alt
		if (e.keyCode === 18) {
			e.preventDefault();
			view.overlayCanvas.removeClassName('picking');
			return;
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
			canvasWidth = view.overlayCanvas.scrollWidth * stat.zoom,
			canvasHeight = view.overlayCanvas.scrollHeight * stat.zoom,
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

		scrollLeft = Math.floor(scrollLeft / stat.zoom);
		scrollTop = Math.floor(scrollTop / stat.zoom);
		viewWidth /= stat.zoom;
		viewHeight /= stat.zoom;
		canvasWidth = view.overlayCanvas.scrollWidth;
		canvasHeight = view.overlayCanvas.scrollHeight;

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

		view.overlayCanvas.removeEventListener('pointermove', listener.canvasOnPointerMove);
		view.overlayCanvas.removeEventListener('pointerdown', listener.canvasOnPointerDown);
		view.overlayCanvas.removeEventListener('pointerup', listener.canvasOnPointerUp);
		view.overlayCanvas.removeEventListener('pointerleave', listener.canvasOnPointerLeave);
		view.overlayCanvas.removeEventListener('pointerenter', listener.canvasOnPointerEnter);
		view.overlayCanvas.removeEventListener('contextmenu', listener.stopEvent);
		view.overlayCanvas.removeEventListener('click', listener.stopEvent);

		socket.removeAllListeners('clients');
		socket.removeAllListeners('pointer');
		socket.removeAllListeners('stroke');
		socket.removeAllListeners('paint');
		socket.removeAllListeners('chat');
		socket.removeAllListeners('disconnect');

		clearInterval(timer.updateLayerPreview);
	};

	util.setTool = function (type, name) {

		if (stat.type !== type || stat.tool !== name) {
			stat.lastType = stat.type;
			stat.lastTool = stat.tool;

			stat.type = type;
			stat.tool = name;

			localStorage.setItem('stat.type', type);
			localStorage.setItem('stat.tool', name);
		}

		brush.setType(type);

		if (stat.tool === 'water-brush') {
			stat.mixing = false;
		} else {
			stat.mixing = true;
		}

		var i, l = view.tools.children.length;
		for (i = 0; i < l; i++) {
			view.tools.children[i].removeClassName('selected');
		}

		view.toolBtn[type][name].addClassName('selected');

		var size = localStorage.getItem('tool.' + stat.tool + '.size');
		if (!size) {
			size = 1;

			if (name === 'eraser') {
				size = 10;
			} else if (name === 'brush') {
				size = 4;
			} else if (name === 'water-brush') {
				size = 8;
			}
		}
		if (typeof size === 'string') {
			size = parseInt(size, 10);
		}

		util.setSize(size);

		stat.changed = true;
	};

	util.setColor = function (color) {

		stat.color = color;

		localStorage.setItem('stat.color', color);

		view.color.setColor(color);

		var c = parseInt(color.slice(1), 16),
			r = c >> 16,
			g = c >> 8 & 0xff,
			b = c & 0xff;

		if (r !== view.rSlider.getValue()) {
			view.rSlider.setValue(r);
		}
		if (g !== view.gSlider.getValue()) {
			view.gSlider.setValue(g);
		}
		if (b !== view.bSlider.getValue()) {
			view.bSlider.setValue(b);
		}
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

		localStorage.setItem('tool.' + stat.tool + '.size', size);
	};

	util.setStabilize = function (stabilize) {

		stat.stabilize = stabilize;

		view.currentStabilize.updateText('Stabilize'.__() + ': ' + stabilize);

		if (stabilize !== view.stabilizeSlider.getValue()) {
			view.stabilizeSlider.setValue(stabilize);
		}
	};

	util.setLayer = function (layerNumber) {

		layerContexts[stat.layerNumber].canvas.style.display = '';
		layerContexts[stat.layerNumber].canvas.style.opacity = 0.25;
		layerContexts[layerNumber].canvas.style.display = 'none';
		paintingCompositionContext.canvas.style.opacity = 1;
		paintingCompositionContext.canvas.style.zIndex = 1 + layerNumber * 2;

		stat.layerNumber = layerNumber;

		view.layerButtons.forEach(function (button, i) {

			if (i === layerNumber) {
				button.addClassName('selected');
			} else {
				button.removeClassName('selected');
			}
		});

		stat.changed = true;
	};

	util.updateLayerPreview = function () {

		if (stat.painting === true || Date.now() - stat.pointerLastMoved < 3000) {
			return;
		}

		var i;
		for (i = 0; i < config.layerCount; i++) {
			view.layerButtons[i].style.backgroundImage = 'url(' + layerContexts[i].canvas.toDataURL() + ')';
		}
	};

	util.pickColor = function (context, x, y) {

		var imageData = context.getImageData(x, y, 1, 1);

		if (imageData.data[3] === 0) {
			util.setTool(stat.type, 'eraser');
		} else {
			if (stat.tool === 'eraser') {
				if (stat.lastTool === 'eraser') {
					util.setTool(stat.lastType, 'pen');
				} else {
					util.setTool(stat.lastType, stat.lastTool);
				}
			}

			var color = '#';
			color += ('0' + imageData.data[0].toString(16)).slice(-2);
			color += ('0' + imageData.data[1].toString(16)).slice(-2);
			color += ('0' + imageData.data[2].toString(16)).slice(-2);

			util.setColor(color);
			util.setAlpha(imageData.data[3] / 255);
		}
	};

	util.setZoom = function (zoom) {

		var i;
		for (i = 0; i < view.canvasContainer.children.length; i++) {
			view.canvasContainer.children[i].style.transform = 'scale(' + zoom + ')';
		}

		var ratio = zoom / stat.zoom;
		var cdX = view.canvasContainer.offsetWidth / stat.zoom - view.canvasContainer.offsetWidth / zoom;
		var cdY = view.canvasContainer.offsetHeight / stat.zoom - view.canvasContainer.offsetHeight / zoom;

		view.canvasContainer.scrollLeft = view.canvasContainer.scrollLeft * ratio + cdX;
		view.canvasContainer.scrollTop = view.canvasContainer.scrollTop * ratio + cdY;

		var scrollMaxX = Math.max(0, canvasW * zoom - view.canvasContainer.offsetWidth);
		var scrollMaxY = Math.max(0, canvasH * zoom - view.canvasContainer.offsetHeight);
		view.canvasContainer.scrollLeft = Math.min(scrollMaxX, view.canvasContainer.scrollLeft);
		view.canvasContainer.scrollTop = Math.min(scrollMaxY, view.canvasContainer.scrollTop);

		stat.zoom = zoom;

		util.setScrollbars();
	};

	util.zoomIn = function () {

		var zoom = stat.zoom;

		if (zoom >= 10) {
			return;
		}

		if (stat.zoom < 1) {
			zoom *= 2;
		} else {
			zoom += 1;
		}

		util.setZoom(zoom);
	};

	util.zoomOut = function () {

		var zoom = stat.zoom;

		if (zoom < 0.5) {
			return;
		}

		if (zoom <= 1) {
			zoom /= 2;
		} else {
			zoom -= 1;
		}

		util.setZoom(zoom);
	};

	util.toggleFullScreen = function () {

		if (document.fullscreenEnabled) {
			if (document.fullscreenElement) {
				document.exitFullscreen();
			} else {
				document.body.requestFullscreen();
			}
		}
	};

	util.clearSelect = function () {

		var area = stat.selectedArea;

		area.tlX = area.tlY = area.brX = area.brY = area.sX = area.sY = area.width = area.height = 0;

		stat.changed = true;
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
		var context = paintedCompositionContext;
		var canvas  = context.canvas;
		context.canvas.width = painted.width;
		context.canvas.height = painted.height;

		// <- current layer buffer
		context.drawImage(
			layerContexts[painted.layerNumber].canvas,
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
	};

	util.addChatLog = function (time, name, message, color) {

		var line = flagrate.createElement().addClassName(name).insertTo(view.chatLog);

		var date = new Date(time);

		var dateString = '';
		dateString += ('0' + date.getHours()).slice(-2) + ':';
		dateString += ('0' + date.getMinutes()).slice(-2) + ':';
		dateString += ('0' + date.getSeconds()).slice(-2);

		flagrate.createElement('span', { 'class': 'date' }).insertText(dateString).insertTo(line);
		flagrate.createElement('span', { 'class': 'name' }).setStyle({
			color: color
		}).insertText(name).insertTo(line);
		flagrate.createElement('span', { 'class': 'message' }).insertText(message).insertTo(line);

		view.chatLog.scrollTop = view.chatLog.scrollHeight - view.chatLog.clientHeight;
	};

	ui.promptClientName = function (done, cancel) {

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
						},
						value: localStorage.getItem('name') || ''
					}
				},
				{
					key: 'save',
					input: {
						type: 'checkbox',
						label: 'Save'.__(),
						value: !!localStorage.getItem('name')
					}
				}
			]
		});

		flagrate.createModal({
			disableCloseByEsc: true,
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

							e.targetButton.disable();

							modal.close();

							document.body.focus();

							client.name = input.name;
							done();
						});
					}
				},
				{
					label: 'Cancel'.__(),
					onSelect: function (e, modal) {

						e.targetButton.disable();

						modal.close();

						document.body.focus();

						if (cancel) {
							cancel();
						}
					}
				}
			]
		}).open();
	};

	ui.clearCanvas = function () {

		flagrate.createModal({
			title: 'Warning'.__(),
			subtitle: 'Clear Canvas'.__(),
			text: 'Are you sure you want to clear the canvas?'.__(),
			buttons: [
				{
					label: 'Yes'.__(),
					color: '@red',
					onSelect: function (e, modal) {

						modal.close();

						flagrate.createModal({
							title: 'Warning'.__(),
							text: 'Are you sure?'.__(),
							buttons: [
								{
									label: 'Yes'.__(),
									color: '@red',
									onSelect: function (e, modal) {

										socket.emit('clear');

										modal.close();
									}
								},
								{
									label: 'Cancel'.__(),
									onSelect: function (e, modal) {
										modal.close();
									}
								}
							]
						}).open();
					}
				},
				{
					label: 'Cancel'.__(),
					onSelect: function (e, modal) {
						modal.close();
					}
				}
			]
		}).open();
	};
}

// _|_
// \ /
//  v
if (localStorage.getItem('enter') === 'yes') {
	window.addEventListener('DOMContentLoaded', init);
} else {
	window.location = './';
}
