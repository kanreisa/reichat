/*jslint node:true, white:true */
'use strict';

var fs = require('fs');
var gulp = require('gulp');
var mocha = require('gulp-mocha');

gulp.task('test', function () {
    
    return gulp.src(['test/*.js'], { read: false })
               .pipe(mocha({ reporter: 'spec', timeout: 5000 }));
});

gulp.task('watch', function () {
    gulp.watch('lib/*.js', ['test']);
});

gulp.task('default', ['test']);
