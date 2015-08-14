/*global module:false*/
var path = require('path'),
    mockery = require('mockery'),
    resolve = path.resolve;

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

        mockery: {
            enable: "",
            disable: ""
        },

        mochaTest: {
            test_nestify: {
                options: {
                    ui: 'bdd',
                    clearRequireCache: true
                },
                src: ['test/*.js']
            }
        },

        "mochaTestWith": {
            backbone1_2_1: {
                underscore: 'test/vendor/underscore-1.8.3.min.js',
                backbone: 'test/vendor/backbone-1.2.1.min.js'
            },
            backbone1_1_2: {
                underscore: 'test/vendor/underscore-1.6.0.min.js',
                backbone: 'test/vendor/backbone-1.1.2.min.js'
            },
            backbone1_0_0: {
                underscore: 'test/vendor/underscore-1.5.2.min.js',
                backbone: 'test/vendor/backbone-1.0.0.min.js'
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

    grunt.registerMultiTask('mockery', 'enable/disable mockery',
                            function(){
                                if ('enable' === this.target){
                                    mockery.enable({
                                        warnOnReplace: false,
                                        warnOnUnregistered: false
                                    });
                                } else {
                                    mockery.disable();
                                }
                            });

    grunt.registerTask('test-modules', 
                       'Fix the version of underscore and backbone to be tested with',
                       function(ver_, verBB){
                           var test_ = _fileMod(ver_),
                               testBB = _fileMod(verBB);
                           mockery.registerMock('underscore', test_);
                           mockery.registerMock('backbone', testBB);
                       });

    grunt.registerMultiTask('mochaTestWith',
                            'mochaTest with specific test modules',
                            function(){
                                var u = this.data.underscore,
                                    b = this.data.backbone;
                                grunt.task.run('mockery:enable');
                                grunt.task.run('test-modules:'+u+':'+b);
                                grunt.task.run('mochaTest');
                            });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.registerTask('default', ['jshint', 'mockery:enable', 'mochaTestWith', 'mockery:disable']);
    grunt.registerTask('dist', ['jshint', 'mockery:enable', 'mochaTestWith', 'mockery:disable', 'concat', 'uglify']);

};
