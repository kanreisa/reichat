/*!
 *  reichat client (l10n.js)
 *
 *  Copyright (c) 2015 Yuki KAN
 *  https://github.com/kanreisa
**/
/*jslint browser:true, nomen:true, plusplus:true, regexp:true, vars:true */
/*global flagrate, io */
window.addEventListener('DOMContentLoaded', function () {
	'use strict';

	var languages = (function () {

		var cl = document.querySelector('meta[http-equiv="Content-Language"]').getAttribute('content');

		var langs = cl.split(',');
		var i, l;
		for (i = 0, l = langs.length; i < l; i++) {
			langs[i] = langs[i].trim();
		}

		return langs;
	}());

	var language = (window.navigator.language || window.navigator.userLanguage).substr(0, 2);
	if (languages.indexOf(language) === -1) {
		language = languages[0];
	}

	var elements = document.querySelectorAll('*[lang]');
	var i, l;
	for (i = 0, l = elements.length; i < l; i++) {
		if (elements[i].getAttribute('lang') !== language) {
			flagrate.Element.hide(elements[i]);
		} else {
			flagrate.Element.addClassName(elements[i], 'visible');
		}
	}

	var dict = {};

	dict.ja = {
		'YOUR NAME': 'あなたの名前',
		'NAME': '名前',
		'JOIN': '参加',
		'CANCEL': 'キャンセル',
		'SAVE': '保存',
		'FREEHAND': 'フリーハンド',
		'BINARY PEN': '2値ペン',
		'BINARY PENCIL': '2値鉛筆',
		'BINARY BRUSH': '2値ブラシ',
		'BINARY WATER BRUSH': '2値水彩ブラシ',
		'BINARY MARKER': '2値マーカー'
	};

	String.prototype.__ = function () {

		var str = this.toString();
		if (dict[language]) {
			str = dict[language][str.toUpperCase()] || str;
		}

		var words = arguments;

		str = str.replace(/\{[0-9]+\}/, function (a) {

			var key = a;

			return words[parseInt(key.match(/\{([0-9]+)\}/)[1], 10)].__();
		});

		return str;
	};
});