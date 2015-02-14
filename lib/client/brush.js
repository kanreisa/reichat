/*!
 *  reichat brush.js
 *
 *  Copyright (c) 2015 Yuki KAN
 *  https://github.com/kanreisa
**/
/*jslint browser:true, vars:true, plusplus:true, bitwise:true, white:true, nomen:true */
/*global Uint8Array */
(function () {
	'use strict';
	
	var brush = window.brush = {};
	
	var cur = {
		type: 'binary',
		preset: 'circle'
	};
	
	var createBinaryShape = function (size, data) {
		
		var canvas = document.createElement('canvas');
		canvas.width = canvas.height = size;
		var context = canvas.getContext('2d');
		
		var imageData = context.createImageData(size, size);
		
		var i, l, n;
		for (i = 0, l = data.length; i < l; i++) {
			n = i << 2;
			
			imageData.data[n + 3] = data[i];
		}
		
		context.putImageData(imageData, 0, 0);
		
		return {
			size: size,
			context: context,
			imageData: imageData
		};
	};
	
	var setHorizontalLineOfBinaryCircleArray = function (array, width, x1, x2, y) {
		
		if (x1 < x2) {
			return;
		}
		
		var offset = y * width,
			maxX = x1 < width ? x1 : width -1,
			minX = x2 > 0 ? x2 : 0,
			x;
		
		for (x = maxX; x >= minX; x--) {
			array[offset + x] = 255;
		}
	};
	
	var createBinaryCircleArray = function (size) {
		
		var x = Math.floor(size / 2),
			y = 0,
			o = Math.floor((size - 1)/2),
			radiusError = 1 - x,
			array = new Uint8Array(size * size),
			shift = size % 2 === 0 ? 1 : 0;
		
		while(x >= y) {
			setHorizontalLineOfBinaryCircleArray(array, size, x + o, -x + o + shift, y + o);
			setHorizontalLineOfBinaryCircleArray(array, size, x + o, -x + o + shift, -y + o + shift);
			
			if (radiusError < 0) {
				radiusError += 2 * y + 1;
			} else {
				setHorizontalLineOfBinaryCircleArray(array, size, y + o, -y + o + shift, x + o);
				setHorizontalLineOfBinaryCircleArray(array, size, y + o, -y + o + shift, -x + o + shift);
				
				x--;
				radiusError += 2 * (y - x + 1);
			}
			y++;
		}
		
		return array;
	};
	
	var binaryPreset = {
		'circle': {
			binary: true,
			shapes: (function () {
				
				var shapes = [];
				
				var i, l = 20;
				for (i = 1; i < l; i++) {
					shapes.push(
						createBinaryShape(i, createBinaryCircleArray(i))
					);
				}
				
				return shapes;
			}())
		}
	};
	
	var getBinaryShape = function (size) {
		
		var prst = binaryPreset[cur.preset],
			shape;

		size = Math.max(0, Math.round(size) - 1);

		if (prst.shapes[size]) {
			shape = prst.shapes[size];
		} else {
			shape = prst.shapes[prst.shapes.length - 1];
		}

		return shape;
	};
	
	brush.setType = function (typeName) {
		
		cur.type = typeName;
	};
	
	brush.setPreset = function (presetName) {
		
		cur.preset = presetName;
	};
	
	var dc = document.createElement('canvas');
	dc.width = dc.height = 40;
	var dctx = dc.getContext('2d');
	
	var drawBinaryPoint = function (context, x, y, size, alpha, color, mixing) {
		
		var shape = getBinaryShape(size);
		
		x = Math.round(x);
		y = Math.round(y);
		size = shape.size;
		
		var tlX = Math.ceil(x - size / 2),
			tlY = Math.ceil(y - size / 2);
		
		if (alpha === 1 || mixing === true) {
			dctx.globalCompositeOperation = 'copy';
			if (dctx.globalAlpha !== alpha) {
				dctx.globalAlpha = alpha;
			}
			if (dctx.fillStyle !== color) {
				dctx.fillStyle = color;
			}
			dctx.fillRect(0, 0, size, size);
			
			dctx.globalCompositeOperation = 'destination-in';
			if (alpha !== 1) {
				dctx.globalAlpha = 1;
			}
			dctx.drawImage(shape.context.canvas, 0, 0);
			
			context.drawImage(dc, 0, 0, size, size, tlX, tlY, size, size);
		} else {
			var c = parseInt(color.slice(1), 16),
				r = c >> 16,
				g = c >> 8 & 0xff,
				b = c & 0xff,
				i,
				l,
				n,
				target = context.getImageData(tlX, tlY, shape.imageData.width, shape.imageData.height);
			
			for (i = 0, l = shape.imageData.data.length / 4; i < l; i++) {
				n = i << 2;
				
				if (shape.imageData.data[n + 3] !== 0) {
					target.data[n] = r;
					target.data[n + 1] = g;
					target.data[n + 2] = b;
					target.data[n + 3] = 255 * alpha;
				}
			}
			
			context.putImageData(target, tlX, tlY);
		}
	};
	
	var pi2 = Math.PI * 2;
	
	var drawPoint = function (context, x, y, size, alpha, color, mixing) {
		
		if (size === 0 || alpha === 0) {
			return;
		}
		
		if (alpha === 1 || mixing === true) {
			context.save();
			context.beginPath();
			context.globalAlpha = alpha;
			context.fillStyle = color;
			context.arc(x + 0.5, y + 0.5, size / 2, 0, pi2, false);
			context.fill();
			context.restore();
		} else {
			dctx.globalCompositeOperation = 'copy';
			dctx.globalAlpha = alpha;
			dctx.beginPath();
			dctx.arc(size / 2 + x % 1, size / 2 + y % 1, size / 2, 0, pi2, false);
			dctx.fill();
			
			var c = parseInt(color.slice(1), 16),
				r = c >> 16,
				g = c >> 8 & 0xff,
				b = c & 0xff,
				tlX = Math.floor(x - size / 2),
				tlY = Math.floor(y - size / 2),
				s = Math.ceil(size),
				i,
				l,
				n,
				source = dctx.getImageData(0, 0, s, s),
				target = context.getImageData(tlX, tlY, s, s);
			
			for (i = 0, l = source.data.length / 4; i < l; i++) {
				n = i << 2;
				
				if (source.data[n + 3] !== 0) {
					target.data[n] = r;
					target.data[n + 1] = g;
					target.data[n + 2] = b;
					target.data[n + 3] = 255 * alpha;
				}
			}
			
			context.putImageData(target, tlX, tlY);
		}
	};
	
	brush.draw = function (context, x, y, size, alpha, color, mixing) {
		
		if (cur.type === 'binary') {
			drawBinaryPoint(context, x, y, size, alpha, color, mixing);
		} else {
			drawPoint(context, x, y, size, alpha, color, mixing);
		}
	};
}());