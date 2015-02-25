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
var opts = require('opts');
var reichatServer = require('reichat-server');

opts.parse([
	{
		short: 'v',
		long: 'version',
		description: 'Show version and exit',
		callback: function () {
			
			console.log(pkg.version);
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
		long: 'redis-key-prefix',
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
		long: 'max-paint-log-count',
		value: true
	},
	{
		long: 'max-chat-log-count',
		value: true
	},
	{
		long: 'forwarded-header',
		value: true
	}
].reverse(), true);

var config = opts.get('config') ? require(opts.get('config')) : {};

config.host = opts.get('host') || config.host || process.env.HOST || '0.0.0.0';
config.port = opts.get('port') || config.port || process.env.PORT || 10133;
config.title = opts.get('title') || config.title || process.env.TITLE || 'PaintChat';

config.canvasWidth = parseInt(opts.get('canvas-width') || config.canvasWidth || process.env.CANVAS_WIDTH || 1920, 10);
config.canvasHeight = parseInt(opts.get('canvas-height') || config.canvasHeight || process.env.CANVAS_HEIGHT || 1080, 10);
config.redisHost = opts.get('redis-host') || config.redisHost || process.env.REDIS_HOST || '';
config.redisPort = parseInt(opts.get('redis-port') || config.redisPort || process.env.REDIS_PORT || 6379, 10);
config.redisPassword = opts.get('redis-password') || config.redisPassword || process.env.REDIS_PASSWORD || '';
config.redisKeyPrefix = opts.get('redis-key-prefix') || config.redisKeyPrefix || process.env.REDIS_KEY_PREFIX || '';
config.dataDir = opts.get('data-dir') || config.dataDir || process.env.DATA_DIR || require('os').tmpdir();
config.dataFilePrefix = opts.get('data-file-prefix') || config.dataFilePrefix || process.env.DATA_FILE_PREFIX || 'reichat_';
config.maxPaintLogCount = parseInt(opts.get('max-paint-log-count') || config.maxPaintLogCount || process.env.MAX_PAINT_LOG_COUNT || 2000, 10);
config.maxChatLogCount = parseInt(opts.get('max-chat-log-count') || config.maxChatLogCount || process.env.MAX_CHAT_LOG_COUNT || 100, 10);
config.forwardedHeaderType = opts.get('forwarded-header') || config.forwardedHeader || process.env.FORWARDED_HEADER || '';

config.layerCount = 3;
config.clientDir = [__dirname, 'client'].join(path.sep);
config.clientVersion = pkg.version;

reichatServer.createServer(config).once('ready', function () {
	
	process.title = 'reichat server - ' + this.id;
	
	this.listen(config.port, config.host, null, function () {
		util.log(util.format('listening on %s:%s', config.host, config.port));
	});

	util.log(util.format('created server id: %s', this.id));
});
