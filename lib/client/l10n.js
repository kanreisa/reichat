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
		'WARNING': '警告',
		'ARE YOU SURE?': '本当に?',
		'YOUR NAME': 'あなたの名前',
		'NAME': '名前',
		'JOIN': '参加',
		'SEND': '送信',
		'EXIT': '退出',
		'YES': 'はい',
		'CANCEL': 'キャンセル',
		'LOADING': 'ロード中',
		'READY': '準備完了',
		'SAVE': '保存',
		'SIZE': 'サイズ',
		'STABILIZE': 'ブレ補正',
		'LAYER': 'レイヤー',
		'OPACITY': '不透明度',
		'FREEHAND': 'フリーハンド',
		'BINARY PEN': '2値ペン',
		'BINARY PENCIL': '2値鉛筆',
		'BINARY BRUSH': '2値ブラシ',
		'BINARY WATER BRUSH': '2値水彩ブラシ',
		'BINARY MARKER': '2値マーカー',
		'BINARY ERASER': '2値消しゴム',
		'PEN': 'ペン',
		'PENCIL': '鉛筆',
		'BRUSH': 'ブラシ',
		'WATER BRUSH': '水彩ブラシ',
		'MARKER': 'マーカー',
		'ERASER': '消しゴム',
		'RECTANGULAR COPY': '長方形コピー',
		'RECTANGULAR MOVE': '長方形移動',
		'RECTANGULAR FILL': '長方形塗りつぶし',
		'RECTANGULAR ERASER': '長方形消しゴム',
		'ENTER KEY TO FOCUS HERE': 'Enter キーでここにフォーカス',
		'CLEAR CANVAS': 'キャンバスをクリア',
		'ARE YOU SURE YOU WANT TO CLEAR THE CANVAS?': 'キャンバスをクリアしてもよろしいですか?'
	};

	dict.ko = {
		'WARNING': '경고',
		'ARE YOU SURE?': '정말?',
		'YOUR NAME': '당신의 이름',
		'NAME': '이름',
		'JOIN': '참가',
		'SEND': '보내',
		'EXIT': '퇴출',
		'YES': 'Yes',
		'CANCEL': '캔슬',
		'LOADING': '로드 중',
		'READY': '준비 완료',
		'SAVE': '저장',
		'SIZE': '사이즈',
		'STABILIZE': '손떨림 보정',
		'LAYER': '레이어',
		'OPACITY': '불투명도',
		'FREEHAND': '자유',
		'BINARY PEN': '바이너리 펜',
		'BINARY PENCIL': '바이너리 연필',
		'BINARY BRUSH': '바이너리 브러쉬',
		'BINARY WATER BRUSH': '바이너리 수채화 브러쉬',
		'BINARY MARKER': '바이너리 마커',
		'BINARY ERASER': '바이너리 지우개',
		'PEN': '펜',
		'PENCIL': '연필',
		'BRUSH': '브러쉬',
		'WATER BRUSH': '수채화 브러쉬',
		'MARKER': '마커',
		'ERASER': '지우개',
		'RECTANGULAR COPY': '사각형 카피',
		'RECTANGULAR MOVE': '사각형 이동',
		'RECTANGULAR FILL': '사각형 채우기',
		'RECTANGULAR ERASER': '사각형 지우개',
		'ENTER KEY TO FOCUS HERE': 'Enter 키를 누르면 여기에 포커스합니다',
		'CLEAR CANVAS': '캔버스를 클리어',
		'ARE YOU SURE YOU WANT TO CLEAR THE CANVAS?': '캔버스를 클리어 하시겠습니까?'
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
