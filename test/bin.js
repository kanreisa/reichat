/*jslint node:true, white:true, vars:true */
/*global describe, it */
'use strict';

var child_process = require('child_process');
var should = require('should');

describe('$ reichat', function() {

    var reichat;
    
    it('spawn', function() {
        reichat = child_process.spawn('bin/reichat.js', [], {});
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
            
            should.strictEqual(null, code);
            should.strictEqual('SIGKILL', signal);
            
            done();
        });
        
        reichat.kill('SIGKILL');
    });
});