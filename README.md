##gulp-enb-shim

Use your old `enb` techs with `gulp-bem`

Note: this shim supports only tech created with `build-flow` but most of your techs are likely to be created with `build-flow`

###Example:
```js
'use strict';

var gulp = require('gulp');
var bem = require('@bem/gulp');
var es = require('event-stream');
var concat = require('gulp-concat');

var gulpEnbShim = require('gulp-enb-shim');

// this is all your old techs from ./.enb/make.js
var techs = require('./.enb/make').techs;

// this is from gulp-bem example
var bemProject = bem({
    bemconfig: {
        'common.blocks': { scheme: 'nested' },
        'desktop.blocks': { scheme: 'nested' }
    }
});

var bemBundle = bemProject.bundle({
    path: 'desktop.bundles/index',
    decl: 'index.bemdecl.js'
});

// create shim for this bundle
var enbBundleShim = gulpEnbShim({
    path: bemBundle.path()
})

gulp.task('bem-build', function() {
    // here we get all chunks for bemhtml tech and pipe them;
    // techs.bemhtml is "require('enb-xjst/techs/bemhtml')"
    // in this case target option value is not so important
    // because later we will concat this with js
    var bemhtml = bemBundle.src({ tech: 'bemhtml', extensions: ['.bemhtml'] })
        .pipe(enbBundleShim.tech(techs.bemhtml, { target: '?.client.bemhtml.js', devMode: true }))

    // same for js
    // target value is also not so important
    var clientJs = bemBundle.src({ tech: 'js', extensions: ['.js'] })
        .pipe(enbBundleShim.tech(techs.js, { target: '?.client.js' }))

    // finally merge with event-stream
    // here we rename result file in concat helper
    var js = es.merge([bemhtml, clientJs])
        .pipe(concat(bemBundle.name() + '.js'))
        .pipe(gulp.dest(bemBundle.path()));

    // just css :)
    // here target value is actual file name
    var css = bemBundle.src({ tech: 'css', extensions: ['.css'] })
        .pipe(enbBundleShim.tech(techs.css, { target: '?.css' }))
        .pipe(gulp.dest(bemBundle.path()));

    // wait for all targets
    return es.merge([js, css]);
});
```
