##gulp-enb-shim

Use your old `enb` techs with `gulp-bem`

Note #1: this shim supports only tech created with `build-flow` but most of your techs are likely to be created with `build-flow`

Note #2: yes, the usage is too verbose. But why the hell it shouldnt be?

Note #3: many techs relates to other targets. While `enb` handles this dependencies by itself, in this shim i suggest explicit providing tech dependencies. Example:
```js
var i18nKeysetsAll = enbBundleShim.tech(techs['i18n-keysets'], { lang: 'all' });
var i18nLangAll = enbBundleShim.tech(techs['i18n-lang'], { lang: 'all' }, {
    sources: {
        '?.keysets.all.js': i18nKeysetsAll
    }
});
```

Note #4: therefore `build-flow` has helpers for reading related target's source, many techs read them from fs manually. This shim cannot automatically detect such behaviour, so when providing tech deps point that the deps should be already on fs. Example:
```js
var i18nKeysetsAll = enbBundleShim.tech(techs['i18n-keysets'], { lang: 'all' });
var i18nLangAll = enbBundleShim.tech(techs['i18n-lang'], { lang: 'all' }, {
    sources: {
        '?.keysets.all.js': {
            fromFs: true,
            file: i18nKeysetsAll
        }
    }
});
```

###Example:
```js
function buildBundle(bundlePath) {
    // `gulp-bem` bundle instance
    var bemBundle = bemProject.bundle({
        path: path.relative(process.cwd(), bundlePath),
        decl: path.basename(bundlePath) + '.bemdecl.js'
    });

    // create shim instance
    var enbBundleShim = gulpEnbShim({
        bundle: bemBundle,
        langs: langs,
        cwd: process.cwd()
    });
    // here we will store all targets
    var targets = [];

    // lets create bemhtml file with depsByTech as we do it normally in `enb-make`
    var bemhtml = enbBundleShim.tech(techs.bemhtml, { target: '?.client.bemhtml.js', devMode: true }, {
        depsByTech: 'js'
    });
    // and js also
    var clientJs = enbBundleShim.tech(techs.js, { target: '?.client.js' });
    // now lets merge them and then it will become our target
    var js = es.merge([bemhtml, clientJs])
        .pipe(concat(bemBundle.name() + '.js'))
        .pipe(gulp.dest(bemBundle.path()));

    // simple css build
    var css = enbBundleShim.tech(techs.css, {
            target: '?.css',
        })
        .pipe(gulp.dest(bemBundle.path()));

    // IE css stuff
    var cssIE6 = enbBundleShim.tech(techs.css, { sourceSuffixes: ['css', 'ie.css', 'ie6.css'], target: '?.ie6.css' })
        .pipe(gulp.dest(bemBundle.path()));
    var cssIE7 = enbBundleShim.tech(techs.css, { sourceSuffixes: ['css', 'ie.css', 'ie7.css'], target: '?.ie7.css' })
        .pipe(gulp.dest(bemBundle.path()));
    var cssIE8 = enbBundleShim.tech(techs.css, { sourceSuffixes: ['css', 'ie.css', 'ie8.css'], target: '?.ie8.css' })
        .pipe(gulp.dest(bemBundle.path()));
    var cssIE9 = enbBundleShim.tech(techs.css, { sourceSuffixes: ['css', 'ie9.css'], target: '?.ie9.css' })
       .pipe(gulp.dest(bemBundle.path()));

    // ok, this is priv file wich we want to localize
    var priv = enbBundleShim.tech(techs.priv, { mode: 'development' });
    // we need BEM.I18N core
    var i18nKeysetsAll = enbBundleShim.tech(techs['i18n-keysets'], { lang: 'all' });
    // process it with another tech
    // note, this tech thought that its dependency (previous file) is already on fs
    // so we cheat and tell shim to write file on fs before execute this tech
    var i18nLangAll = enbBundleShim.tech(techs['i18n-lang'], { lang: 'all' }, {
        sources: {
            '?.keysets.all.js': {
                fromFs: true,
                file: i18nKeysetsAll
            }
        }
    });
    // now localize for all our langs
    langs.forEach(function(lang) {
        // as previously, we need lang strings
        var i18nKeysetsLang = enbBundleShim.tech(techs['i18n-keysets'], { lang: lang });
        // then process them
        // giving previous file from fs
        var i18nLangLangSources = {};
        i18nLangLangSources['?.keysets.' + lang + '.js'] = {
            fromFs: true,
            file: i18nKeysetsLang
        }
        var i18nLangLang = enbBundleShim.tech(techs['i18n-lang'], { lang: lang }, {
            sources: i18nLangLangSources
        });
        // and finally merge all three pieces together
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
```

For complete example see `example-gulpfile.js`