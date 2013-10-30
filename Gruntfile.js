/*global module:false*/
module.exports = function(grunt) {
    grunt.initConfig({
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

                globals: {
                    console: true,
                    module: true,
                    require: true,
                    define: true,
                    suite: true,
                    beforeEach: true,
                    test: true
                }
            }
        },
        mochaTest: {
            test: {
                options: {
                    ui: 'qunit'
                },
                src: ['test/**/*.js']
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-test');

    grunt.registerTask('default', ['jshint', 'mochaTest']);
};
