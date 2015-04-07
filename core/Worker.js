/*
 *  Arctic-snowstorm
 *  (c) 2014-2015, Teempla Inc.
 *
 *  MIT License
 */
"use strict";

define([
    'class',
    'gracefulDomain',
    'connectorsManager',
    'config',
    'log'
] ,function (Class, GracefulDomain, ConnectorsManager, config, log) {

    /**
     * Worker process controller.
     *
     * @class Worker
     * @name Worker
     * @static
     * @public
     */
    return Class.extend({ /** THIS CLASS HAS ONLY STATIC METHODS **/ }, {

        /**
         * Connectors manager instance
         *
         * @property {ConnectorsManager} connectorsManager
         * @private
         */
        connectorsManager: null,

        /**
         * Run worker process
         *
         * @public
         */
        start: function(){

            var self = this;

            // Create grace instance
            var grace = new GracefulDomain();

            // Subscript for domain events
            this.listenTo(grace, 'start',    this.onStart);
            this.listenTo(grace, 'error',    this.onError);
            this.listenTo(grace, 'shutdown', this.onShutDown);
            this.listenTo(grace, 'exit',     this.onExit);
            this.listenTo(grace, 'forcedShutdown',  this.onForcedShutdown);

            // Listen commands form master
            this.listenTo(grace, 'message',  this.onMessage);

            // Emergency sync exit
            grace.onEmergencySyncExit(function(){
                self.onEmergencyExit();
            });

            // Start app
            grace.start();
        },

        /** ************************************************************************
         *
         * Worker events handlers
         *
         * ************************************************************************/

        /**
         * Worker start event
         * On this event we check all connection and send to master ready event
         *
         * @event
         * @private
         */
        onStart: function(){

            log.info("Start worker");

            var listOfConnectorsNames = config.get('application:connectors');
            this.connectorsManager = new ConnectorsManager(listOfConnectorsNames);

            // First connect to dbs, ensure connection
            this.connectorsManager.connect()
                .then(function(){

                    // Start listen queue and subscribe workers
                    process.send('ready');
                })
                .done();
        },

        /**
         * Master send message for processing by specific worker.
         * Load worker and start processing.
         *
         * @param {Object} message
         *
         * @example of message {
         *  worker: 'Path to worker',
         *  messageData: 'Data from rabbit',
         *  redelivered: 'Boolean, true if message already redelivered and tis time is last try'
         * }
         *
         * @event
         * @private
         */
        onMessage: function(message){

            // Skip other commands
            if(message.cmd !== 'execute'){ return; }

            requirejs([message.worker], function(AbstractWorker){
                var worker = new AbstractWorker();
                worker.run(message.messageData, message.redelivered);
            });
        },

        /**
         * Worker graceful exit
         *
         * @param {Function} cb callback
         * @event
         * @private
         */
        onShutDown: function(cb){

            var self = this;
            log.info('Worker graceful shutdown...');

            self.connectorsManager.disconnect()
                .then(function(){
                    cb();
                    log.info('Worker graceful shutdown DONE');
                })
                .done();
        },

        /**
         * Worker handle exception.
         * Send to master error event.
         *
         * @param {String|Error} error
         *
         * @event
         * @private
         */
        onError: function(error){
            log.error('Worker raise error: ', error);
            process.send('error');
        },

        /**
         * Emergency exit, use only sync code !!!
         *
         * @event
         * @sync
         * @private
         */
        onEmergencyExit: function(){
            if(this.connectorsManager){
                this.connectorsManager.syncDisconnect();
            }
        },

        /**
         * Exit on shutdown timeout
         *
         * @param {Number} code
         *
         * @event
         * @private
         */
        onForcedShutdown: function(code){
            log.error ("Timed out, forcing master shutdown, with code:", code);
        }
    });
});