'use strict';

module.exports = function (grunt) {

    grunt.initConfig({

        forever: {
            service: {
                options: {
                    index: 'service.js',
                    logDir: 'logs'
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-babe');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-forever');

    grunt.registerTask('build', [

    ]);

    grunt.registerTask('default', [
        'start'
    ]);

    grunt.registerTask('start', [
        'forever:service:start'
    ]);
};