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
		preset: 'binary-circle'
	};
	
	var getShape = function (size) {
		
		var preset = brush.preset[cur.preset];
		
		if (preset.shapes) {
			var shape;
			
			size = Math.round(size) - 1;
			
			if (preset.shapes[size]) {
				shape = preset.shapes[size];
			} else {
				shape = preset.shapes[preset.shapes.length - 1];
			}
			
			return shape;
		}
	};
	
	brush.setPreset = function (presetName) {
		
		cur.preset = presetName;
	};
	
	var dc = document.createElement('canvas');
	dc.width = dc.height = 40;
	var dctx = dc.getContext('2d');
	
	brush.draw = function (context, x, y, size, alpha, color, mixing) {
		
		var shape = getShape(size);
		
		if (brush.preset[cur.preset].binary === true) {
			x = Math.round(x);
			y = Math.round(y);
			size = shape.size;
		}
		
		var tlX = Math.round(x - size * 0.5),
			tlY = Math.round(y - size * 0.5);
		
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
			dctx.globalAlpha = 1;
			dctx.drawImage(shape.context.canvas, 0, 0);
			
			context.drawImage(dc, 0, 0, size, size, tlX, tlY, size, size);
		} else {
			var c = parseInt(color.slice(1), 16),
				r = c & 0xff0000 >> 16,
				g = c & 0xff00 >> 8,
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
					target.data[n + 3] = shape.imageData.data[n + 3] * alpha;
				}
			}
			
			context.putImageData(target, tlX, tlY);
		}
	};
	
	var createBinaryShape = function (size, data) {
		
		var canvas = document.createElement('canvas');
		canvas.width = canvas.height = size;
		var context = canvas.getContext('2d');
		
		var imageData = context.createImageData(size, size);
		
		var i, l, n;
		for (i = 0, l = data.length; i < l; i++) {
			n = i << 2;
			
			imageData.data[n + 3] = data[i] * 255;
		}
		
		context.putImageData(imageData, 0, 0);
		
		return {
			size: size,
			context: context,
			imageData: imageData
		};
	};
	
	brush.preset = {
		'binary-circle': {
			binary: true,
			shapes: [
				createBinaryShape(1, [1]),
				createBinaryShape(2, [
					1, 1,
					1, 1
				]),
				createBinaryShape(3, [
					0, 1, 0,
					1, 1, 1,
					0, 1, 0
				]),
				createBinaryShape(4, [
					0, 1, 1, 0,
					1, 1, 1, 1,
					1, 1, 1, 1,
					0, 1, 1, 0
				]),
				createBinaryShape(5, [
					0, 1, 1, 1, 0,
					1, 1, 1, 1, 1,
					1, 1, 1, 1, 1,
					1, 1, 1, 1, 1,
					0, 1, 1, 1, 0
				]),
				createBinaryShape(6, [
					0, 0, 1, 1, 0, 0,
					0, 1, 1, 1, 1, 0,
					1, 1, 1, 1, 1, 1,
					1, 1, 1, 1, 1, 1,
					0, 1, 1, 1, 1, 0,
					0, 0, 1, 1, 0, 0
				]),
				createBinaryShape(7, [
					0, 0, 1, 1, 1, 0, 0,
					0, 1, 1, 1, 1, 1, 0,
					1, 1, 1, 1, 1, 1, 1,
					1, 1, 1, 1, 1, 1, 1,
					1, 1, 1, 1, 1, 1, 1,
					0, 1, 1, 1, 1, 1, 0,
					0, 0, 1, 1, 1, 0, 0
				])
			]
		}
	};
	
	brush._bcscm = function (size) {
		
		var x,
			y,
			s = '[\n',
			r = size / 2;
		
		for (y = 0; y < size; y++) {
			if (y !== 0) {
				s += ',\n';
			}
			
			for (x = 0; x < size; x++) {
				if (x !== 0) {
					s += ', ';
				}
				
				if (r * r >= (x - r) * (x - r) + (y - r) * (y - r)) {
					s += '1';
				} else {
					s += '0';
				}
			}
		}
		
		return s + '\n]';
	};
}());