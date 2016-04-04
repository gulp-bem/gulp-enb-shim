'use strict';

var path = require('path');
var gulp = require('gulp');
var bem = require('@bem/gulp');
var es = require('event-stream');
var concat = require('gulp-concat');
var clone = require('gulp-clone');

var gulpEnbShim = require('gulp-enb-shim');
var techs = require('./.enb/make').techs;
var desktopLevels = require('./.enb/make').desktopLevels;
var langs = ['ru', 'en'];
var bemconfig = {};
desktopLevels.forEach(function(level) {
    bemconfig[level.path] = { scheme: 'nested' }
});
var bemProject = bem({
    bemconfig: bemconfig
});

function buildBundle(bundlePath) {
    var bemBundle = bemProject.bundle({
        path: path.relative(process.cwd(), bundlePath),
        decl: path.basename(bundlePath) + '.bemdecl.js'
    });

    var enbBundleShim = gulpEnbShim({
        bundle: bemBundle,
        langs: langs,
        cwd: process.cwd()
    });
    var targets = [];

    var bemhtml = enbBundleShim.tech(techs.bemhtml, { target: '?.client.bemhtml.js', devMode: true }, {
        depsByTech: 'js'
    });
    var clientJs = enbBundleShim.tech(techs.js, { target: '?.client.js' });
    var js = es.merge([bemhtml, clientJs])
        .pipe(concat(bemBundle.name() + '.js'))
        .pipe(gulp.dest(bemBundle.path()));
    var css = enbBundleShim.tech(techs.css, {
            target: '?.css',
        })
        .pipe(gulp.dest(bemBundle.path()));

    var cssIE6 = enbBundleShim.tech(techs.css, { sourceSuffixes: ['css', 'ie.css', 'ie6.css'], target: '?.ie6.css' })
        .pipe(gulp.dest(bemBundle.path()));
    var cssIE7 = enbBundleShim.tech(techs.css, { sourceSuffixes: ['css', 'ie.css', 'ie7.css'], target: '?.ie7.css' })
        .pipe(gulp.dest(bemBundle.path()));
    var cssIE8 = enbBundleShim.tech(techs.css, { sourceSuffixes: ['css', 'ie.css', 'ie8.css'], target: '?.ie8.css' })
        .pipe(gulp.dest(bemBundle.path()));
    var cssIE9 = enbBundleShim.tech(techs.css, { sourceSuffixes: ['css', 'ie9.css'], target: '?.ie9.css' })
       .pipe(gulp.dest(bemBundle.path()));

    var priv = enbBundleShim.tech(techs.priv, { mode: 'development' });
    var i18nKeysetsAll = enbBundleShim.tech(techs['i18n-keysets'], { lang: 'all' });
    var i18nLangAll = enbBundleShim.tech(techs['i18n-lang'], { lang: 'all' }, {
        sources: {
            '?.keysets.all.js': {
                fromFs: true,
                file: i18nKeysetsAll
            }
        }
    });
    langs.forEach(function(lang) {
        var i18nKeysetsLang = enbBundleShim.tech(techs['i18n-keysets'], { lang: lang });
        var i18nLangLangSources = {};
        i18nLangLangSources['?.keysets.' + lang + '.js'] = {
            fromFs: true,
            file: i18nKeysetsLang
        }
        var i18nLangLang = enbBundleShim.tech(techs['i18n-lang'], { lang: lang }, {
            sources: i18nLangLangSources
        });
        var privI18NSources = {};
        privI18NSources['?.lang.all.js'] = { fromFs: true, file: i18nLangAll.pipe(clone()) };
        privI18NSources['?.lang.' + lang + '.js'] = { fromFs: true, file: i18nLangLang };
        privI18NSources['?.priv.js'] = { fromFs: true, file: priv.pipe(clone()) };
        var privI18N = enbBundleShim.tech(techs['i18n-priv'], { lang: lang }, {
            sources: privI18NSources
        })
        .pipe(gulp.dest(bemBundle.path()));
        targets.push(privI18N);
    });

    targets = targets.concat([js, css, cssIE6, cssIE7, cssIE8, cssIE9]);

    return es.merge(targets);
}

var through2 = require('through2');

gulp.task('bem-build', function() {
    return gulp.src('*.bundles/*')
        .pipe(through2.obj(function(chunk, enc, cb) {
            this.push(buildBundle(chunk.path))
            cb();
        }));
});
