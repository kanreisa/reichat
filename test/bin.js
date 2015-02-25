/*jslint node:true, white:true, vars:true */
/*global describe, it */
'use strict';

var child_process = require('child_process');
var should = require('should');

var cmd = process.platform === 'win32' ? 'reichat.cmd' : './bin/reichat.js';

function kill(child) {

    if (process.platform === 'win32') {
        child_process.spawn("taskkill.exe", ["/pid", child.pid, '/f', '/t']);
    } else {
        child.kill('SIGKILL');
    }
}

function closeCheck(code, signal, done) {

    if (process.platform === 'win32') {
        should.strictEqual(1, code);
        should.strictEqual(null, signal);
    } else {
        should.strictEqual(null, code);
        should.strictEqual('SIGKILL', signal);
    }

    done();
}

describe('$ reichat', function() {

    var reichat;

    it('spawn', function() {
        reichat = child_process.spawn(cmd, [], {});
    });

    it('running', function(done) {

        var stdout = '';
        var stderr = '';

        reichat.stdout.setEncoding('utf8');
        reichat.stdout.on('data', function (data) {
            stdout += data;
        });

        reichat.stderr.setEncoding('utf8');
        reichat.stderr.on('data', function (data) {
            stderr += data;
        });

        setTimeout(function () {

            should.ok(/ listening on /.test(stdout));
            should.strictEqual('', stderr);

            done();
        }, 3000);
    });

    it('kill', function(done) {

        reichat.on('close', function (code, signal) {
            closeCheck(code, signal, done);
        });

        kill(reichat);
    });
});
