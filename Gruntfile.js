/*global module:false*/
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
            test: {
                options: {
                    ui: 'bdd'
                },
                src: ['test/**/*.js']
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
