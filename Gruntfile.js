/*global module:false*/
var path = require('path');
var mockery = require('mockery');
mockery.enable({
    warnOnReplace: false,
    warnOnUnregistered: false
});
var resolve = path.resolve;
/**
 * resolve, require and return the indicated file module
 */
var _fileMod = function(mod){
    mod = resolve(mod);
    return require(mod);
};

module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            files: ['grunt.js', '*.js', 'test/test-backbone-nestify.js'],
            options: {
                curly: false,
                eqeqeq: true,
                immed: true,
                latedef: true,
                newcap: true,
                noarg: true,
                sub: true,
                undef: true,
                boss: true,
                eqnull: true,
                expr: true,

                globals: {
                    console: true,
                    module: true,
                    require: true,
                    define: true,
                    beforeEach: true,
                    test: true,
                    describe: true,
                    it: true
                }
            }
        },
        mochaTest: {
            test_backbone_1_0_0: {
                options: {
                    ui: 'bdd',
                    clearRequireCache: true,
                    require: [
                        /**
                         * Hack to plug into 'mockery' and force the
                         * use of specific versions of underscore and
                         * backbone during test run
                         */
                        function(){
                            var test_ = _fileMod('test/vendor/underscore-1.5.2.min.js'),
                                testBB = _fileMod('test/vendor/backbone-1.0.0.min.js');
                            mockery.registerMock('underscore', test_);
                            mockery.registerMock('backbone', testBB);
                        }
                    ]
                },
                src: ['test/*.js']
            },
            test_backbone_1_1_2: {
                options: {
                    ui: 'bdd',
                    clearRequireCache: true,
                    require: [
                        /**
                         * Hack to plug into 'mockery' and force the
                         * use of specific versions of underscore and
                         * backbone during test run
                         */
                        function(){
                            var test_ = _fileMod('test/vendor/underscore-1.6.0.min.js'),
                                testBB = _fileMod('test/vendor/backbone-1.1.2.min.js');
                            mockery.registerMock('underscore', test_);
                            mockery.registerMock('backbone', testBB);
                        }
                    ]
                },
                src: ['test/*.js']
            }
        },
        concat: {
            options: {
                banner: '/* <%= pkg.name %> <%= pkg.version %> <%= grunt.template.today("yyyy-mm-dd") %>' +
                    '\n * <%= pkg.homepage %>' +
                    '\n * <%= pkg.copyright %> */\n'
            },
            dist: {
                src: ['backbone-nestify.js'],
                dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.js'
            }            
        },
        uglify: {
            options: {
                banner: '/* <%= pkg.name %> <%= pkg.version %> <%= grunt.template.today("yyyy-mm-dd") %>' +
                    '\n * <%= pkg.homepage %>' +
                    '\n * <%= pkg.copyright %> */\n'
            },
            dist: {
                files: {
                    'dist/<%= pkg.name %>-<%= pkg.version %>.min.js': ['backbone-nestify.js']
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.registerTask('default', ['jshint', 'mochaTest']);
    grunt.registerTask('dist', ['jshint', 'mochaTest', 'concat', 'uglify']);
};
