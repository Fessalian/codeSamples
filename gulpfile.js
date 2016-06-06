var gulp            = require('gulp'),
    gulputils       = require('gulp-util'),
    plumber         = require('gulp-plumber'),
    sass            = require('gulp-sass'),
    requirejs       = require('requirejs'),
    preprocess      = require('gulp-preprocess'),
    templateCache   = require('gulp-angular-templatecache'),
    minifyHtml      = require('gulp-minify-html'),
    rename          = require('gulp-rename'),
    nodemon         = require('gulp-nodemon'),
    argv            = require('yargs').argv,
    haml            = require('gulp-haml'),
    notify          = require('gulp-notify'),
    gulpif          = require('gulp-if'),
    htmlify         = require('gulp-angular-htmlify'),
    del             = require('del'),
    replace         = require('gulp-replace');

var env, isDev, isProduction;
env             = ( argv.env || 'dev' ).toLowerCase();
isDev           = env.indexOf('dev') != -1;
isProduction    = env.indexOf('production') != -1;

var API_URL = process.env.API_URL || false;

//global configuration
var config = {
    port: 3000,
    localFolder: 'app',
    buildFolder: 'build',
    templates: [
        './app/views/**/*.tmpl.haml',
        '!./app/views/index.tmpl.html'
    ],
    scripts: {
        local: './app/**/*.js'
    },
    styles: {
        local: './app/assets/styles/**/*.sass'
    },
    indexFile: './app/views/index.haml',
    resourcesToMove: [
        './app/assets/images/**/*.*',
        './app/assets/fonts/**/*.*',
        './app/vendors/**/*.js',
        './app/lib/images/*.png'
    ],
    requirejs: {
        baseUrl:          function () { return config.buildFolder; },
        getOutPath:       function () { return config.buildFolder + '/index.min.js'; },
        configFile:       function () { return config.buildFolder + '/index.js'; },
        includeFiles:     function () { return ['lib/require.js']; }
    },
    errorHandler:         notify.onError( function ( iError ) {
        gulputils.beep();
        gulputils.log(  gulputils.colors.white.bgRed.bold(' ERROR '), '\n', iError.message || iError );
        return "ERROR!!!!";
    }),
    version: (new Date()).getTime(),
    poeditor: {
        token:      '3bf36dda21ca6dc552499eb385e3437d',
        filePath:   'build/translations',
        url:        'https://poeditor.com/api/',
        project:    '43852'
    }
};

/**
 * clean build folder
 */
gulp.task('clean-build', function( callback ) {
    del.sync( [config.buildFolder], callback);
});

/**
 * copying assets files to build folder
 */
gulp.task('copy-assets', function () {
    gulp.src( config.resourcesToMove, { base: config.localFolder } )
        .pipe( gulp.dest( config.buildFolder ) );
});

/**
 * SASS and compressing styles
 */
gulp.task( 'styles', function () {
    gulp.src( config.styles.local )
        .pipe( plumber( { errorHandler: config.errorHandler } ) )
        .pipe( sass({
            outputStyle:        'compressed' ,
            sourceComments:     false,
            errLogToConsole:    true
        }))
        .pipe( rename('index.css') )
        .pipe( gulp.dest( config.buildFolder ) );
});

/**
 * preprocessing index file
 */
gulp.task( 'preprocess', function () {
    gulp.src( config.indexFile )
        .pipe( plumber( { errorHandler: config.errorHandler } ) )
        .pipe( preprocess({
            context: {
                isDev:          isDev,
                isProduction:   isProduction,
                apiURL:         API_URL
            }
        }))
        .pipe( haml() )
        .pipe( replace('{version}', config.version ) )
        .pipe( gulpif( isProduction, minifyHtml ( {
            empty:  true,
            spare:  true,
            quotes: true
        })))
        .pipe( htmlify() )
        .pipe( rename( 'index.html' ) )
        .pipe( gulp.dest( config.buildFolder ) );
});


/**
 * copying scripts to build folder
 */
gulp.task( 'copy-scripts', function () {
    gulp.src( config.scripts.local, { base: config.localFolder } )
        .pipe( gulp.dest( config.buildFolder ) );
});

/**
 * optimize and minification scripts
 */
gulp.task( 'compile-scripts', function () {
    function optimize () {
        requirejs.optimize({
            baseUrl:                  config.requirejs.baseUrl(),
            name:                     'index',
            out:                      config.requirejs.getOutPath(),
            mainConfigFile:           config.requirejs.configFile(),
            include:                  [config.requirejs.includeFiles()],
            optimize:                 'uglify2', // change it to uglify2 back again, after fixing angular DI
            removeCombined:           true,
            keepBuildDir:             true,
            preserveLicenseComments:  false,
            useStrict:                true,
            waitSeconds:              90
        });
    };
    setTimeout( optimize, 5000 );
});


/**
 * converting haml templates to js type
 */
gulp.task( 'templates2js' , function () {
    gulp.src( config.templates )
        .pipe( plumber( { errorHandler: config.errorHandler } ) )
        .pipe( haml() )
        .pipe( htmlify() )
        .pipe( minifyHtml({
            empty:  true,    // do not remove empty attributes
            spare:  true,    // do not remove redundant attributes
            quotes: true     // do not remove arbitrary quotes
        }))
        .pipe( templateCache( {
            standalone: true
        }))
        .pipe( gulp.dest( config.buildFolder ) );
});

/**
 * watching
 */
gulp.task( 'watch', function () {
    gulp.watch( config.templates,       ['templates2js'] );
    gulp.watch( config.scripts.local,   ['copy-scripts'] );
    gulp.watch( config.styles.local,    ['styles'] );
    gulp.watch( config.indexFile,       ['preprocess'] );
});

gulp.task( 'server', ( )=> {
    nodemon({
        script:     'index.js',
        env:        { 'NODE_ENV': isProduction ? 'production' : 'development' },
        watch:      [''],
        ext:        'html,js',
        delay:      200
    })
        .on('start', function () {
            console.log('START');
        })
        .on('restart', function () {
            console.log('RESTART');
        });
});

/**
 * preparing data
 */
gulp.task( 'prepare-data',
    ['clean-build', 'styles', 'copy-assets', 'preprocess', 'copy-scripts', 'templates2js', 'compile-scripts']);

/**
 * default task
 */
gulp.task( 'default', ['prepare-data', 'watch', 'server'] );

gulp.task( 'set-production', () => {
    isDev = false;
    isProduction = true;
});

gulp.task( 'production', ['set-production', 'default'] );
});
