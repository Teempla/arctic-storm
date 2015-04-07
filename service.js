/*
 *  Arctic-snowstorm
 *  (c) 2014-2015, Teempla Inc.
 *
 *  MIT License
 */
"use strict";

var requirejs = require('requirejs');

// Setup require js
requirejs.config({

    nodeRequire: require,
    baseUrl: __dirname + '/',
    waitSeconds: 5,

    /**
     * Define main core classes shortcuts
     */
    paths: {

        class:  'core/utils/Class',
        config: 'core/utils/Config',
        log:    'core/utils/Log',
        events: 'core/utils/Events',

        gracefulDomain:     'core/services/GracefulDomain',
        connectorsManager:  'core/services/ConnectorsManager',
        queueBroker:        'core/services/QueueBroker',

        processManager:     'core/process/ProcessManager',
        workerProcess:      'core/process/WorkerProcess',

        abstractWorker:     'core/abstract/AbstractWorker',
        abstractConnector:  'core/abstract/AbstractConnector',
        abstractMessage:    'core/abstract/AbstractMessage',
        abstractQueue:      'core/abstract/AbstractQueue',


        master:    'core/Master',
        worker:    'core/Worker'
    }
});

/**
 * Start application
 *
 * This is entry point of our service, here we choose what process type to run.
 */
requirejs(['config', 'cluster', 'log'], function(config, cluster, log) {

    // Set configs dir
    config.setConfigPath(__dirname + '/configs');
    config.setModulesPath(__dirname + '/modules');

    // Load env and arg config vars
    config.argv();
    config.env();

    // Hierarchical load config, load default config than override default conf by production config (if exist)
    config.add('application', 'default.yml', 'production.yml');

    // Set global log level
    log.setLevel(config.get('application:logLevel'));

    // By default run master node
    var processType = 'master';

    // If it`s worker switch to worker mode
    if(cluster.isWorker){
        processType = 'worker';
    }

    // Load application only after configs
    requirejs([processType], function(application){
        application.start();
    });
});
