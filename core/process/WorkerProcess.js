/*
 *  Arctic-snowstorm
 *  (c) 2014-2015, Teempla Inc.
 *
 *  MIT License
 */
"use strict";

define([
    'class',
    'lodash',
    'cluster',
    'q',
    'log',
    'config'
], function(Class, _, cluster, Q, log, config) {

    /**
     * WorkerProcess class, wrapper over node cluster.worker.
     * Handle standard worker events and add custom events.
     * Provide interface for controlling life cycle of worker.
     *
     *  @class WorkerProcess
     *  @name WorkerProcess
     */
    return Class.extend({

        /**
         * List of worker available states
         *
         * @private
         */
        STATUS_WAIT_READY: 'waitReady',
        STATUS_READY: 'ready',
        STATUS_SUCCESS: 'success',
        STATUS_ERROR: 'error',
        STATUS_EXIT: 'exit',
        STATUS_BUSY: 'busy',

        /**
         * Current worker status
         *
         * @property {String}
         * @private
         */
        status: null,

        /**
         * Worker reference
         *
         * @property {cluster.workers}
         * @private
         */
        worker: null,

        /**
         * Current message if worker in STATUS_BUSY
         *
         * @property {Message}
         * @private
         */
        message: null,

        /**
         * How long process with out work
         *
         * @property {Date}
         * @private
         */
        idleTime: null,

        /**
         * Run timer ID
         *
         * @property {Number}
         * @private
         */
        runTimer: 0,

        /**
         * How many request processed by this worker
         *
         * @property {Number}
         * @public
         */
        requestsProcessed: null,

        /**
         * If worker spend more that maximumExecutionTime
         * on processing one message it will forced shut down
         *
         * @property {Number}
         * @public
         */
        maximumExecutionTime: 150000, // 25 minutes

        /**
         * Process constructor
         *
         * @constructor
         * @extends {Class}
         */
        constructor: function () {

            // Fork process
            this.worker = cluster.fork();

            // Start with ready state
            this.status = this.STATUS_WAIT_READY;

            // Need for calculating uptime
            this.idleTime = new Date();

            // Count processed messages
            this.requestsProcessed = 0;

            // Add process listeners
            this.listenWorkerEvents();

            // Get from app config global timeout interval
            this.maximumExecutionTime = config.get('application:maximumExecutionTime') * 60 * 1000;
        },

        /**
         * Listen standard worker process events
         *
         * @private
         */
        listenWorkerEvents: function(){

            var self = this;

            // Listen standard worker events
            self.worker.on('message', function(msg){
                if(msg === 'ready') {   self.onReady(); }
                if(msg === 'success') { self.onSuccess(); }
                if(msg === 'error') {   self.onError(); }
                if(msg === 'reject') {  self.onReject(); }
                if(msg === 'repeat') {  self.onRepeat(); }
            });

        },

        /**
         * Worker ready event
         *
         * @event
         * @private
         */
        onReady: function(){
            this.idleTime = new Date();
            this.status = this.STATUS_READY;
            this.trigger('worker:ready', this);
        },

        /**
         * Worker on success event
         *
         * @event
         * @private
         */
        onSuccess: function(){

            if(this.status != this.STATUS_BUSY){
                log.warn('Worker spawn success not from BUSY state, worker status was:', this.status);
                return;
            }

            this.stopRunTimer();

            this.idleTime = new Date();
            this.requestsProcessed += 1;
            this.status = this.STATUS_SUCCESS;
            this.trigger('worker:success', this, this.message);
        },

        /**
         * Worker on error event
         *
         * @event
         * @private
         */
        onError: function(){

            if(this.status != this.STATUS_BUSY){
                log.warn('Worker spawn error not from BUSY state, worker status was:', this.status);
                return;
            }

            this.stopRunTimer();

            this.status = this.STATUS_ERROR;
            this.requestsProcessed += 1;
            this.trigger('worker:error', this, this.message);
        },

        /**
         * Worker on reject event
         *
         * @event
         * @private
         */
        onReject: function(){

            if(this.status != this.STATUS_BUSY){
                log.warn('Worker spawn reject not from BUSY state, worker status was:', this.status);
                return;
            }

            this.stopRunTimer();

            this.idleTime = new Date();
            this.requestsProcessed += 1;
            this.status = this.STATUS_SUCCESS;
            this.trigger('worker:reject', this, this.message);
        },

        /**
         * Worker on repeat even
         *
         * @event
         * @private
         */
        onRepeat: function(){

            if(this.status != this.STATUS_BUSY){
                log.warn('Worker spawn repeat not from BUSY state, worker status was:', this.status);
                return;
            }

            this.stopRunTimer();

            this.idleTime = new Date();
            this.requestsProcessed += 1;
            this.status = this.STATUS_SUCCESS;
            this.trigger('worker:repeat', this, this.message);
        },

        /**
         * Switch worker to idle state
         *
         * @event
         * @public
         */
        switchToReadyState: function(){

            if(this.status == this.STATUS_BUSY){
                throw new Error('You cannot change state for busy worker');
            }

            this.idleTime = new Date();
            this.status = this.STATUS_READY;
            this.trigger('worker:ready', this);
        },

        /**
         * Run job on worker
         *
         * @param {String} abstractWorkerFilePath
         * @param {AbstractMessage} message
         * @public
         * @see core/Worker.js
         */
        run: function(abstractWorkerFilePath, message){

            this.idleTime = new Date();
            this.status = this.STATUS_BUSY;
            this.message = message;

            this.worker.send({
                cmd: 'execute',
                worker: abstractWorkerFilePath,
                messageData:  message.getData(),
                redelivered:  message.isRedelivered()
            });

            this.trigger('worker:run', this, message);

            this.startRunTimer();
        },

        /**
         * Fire on if message execution take more time than maximumExecutionTime
         *
         * @event
         * @private
         */
        onRunTimeout: function() {
            log.error('Worker process execution timed out after ' + this.maximumExecutionTime + 'ms');

            this.onError();
        },

        /**
         * Start execution timer on worker run event
         *
         * @private
         */
        startRunTimer: function() {
            var self = this;

            this.runTimer = setTimeout(function() {
                self.onRunTimeout();
            }, this.maximumExecutionTime);
        },

        /**
         * Message successful processed
         *
         * @private
         */
        stopRunTimer: function() {
            clearTimeout(this.runTimer);
        },

        /**
         * Shutdown worker
         *
         * @public
         */
        shutdown: function(){

            var deferred = Q.defer();

            var self = this;
            var timeout;

            self.status = self.STATUS_EXIT;

            self.worker.send('shutdown');
            //self.worker.disconnect();

            timeout = setTimeout(function() {
                deferred.resolve();
                self.worker.kill();
                self.trigger('worker:exit', self);
            }, 2000);

            self.worker.on('disconnect', function() {
                clearTimeout(timeout);
                deferred.resolve();
                self.trigger('worker:exit', self);
            });

            // Return promise
            return deferred.promise;
        },

        /**
         * Get idle time for this worker
         *
         * @returns {Number} - minutes
         */
        getIdleTime: function(){

            var startTime = this.idleTime.getTime();
            var endTime = new Date().getTime();

            var uptime = Math.floor((endTime - startTime) / 1000);

            // minutes
            return Math.floor(uptime / 60);
        },

        /**
         * Get pid for current worker
         *
         * @returns {pid|ChildProcess.pid}
         */
        getPid: function(){
            return this.worker.process.pid;
        }

    });
});
