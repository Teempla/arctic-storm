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
    'domain',
    'log',
    'workerProcess',
    'q',
    'path',
    'config'
], function(Class, _, cluster, domain, log, WorkerProcess, Q, path, config) {

    /**
     * ProcessManager class, control the worker process execution and handle worker events.
     * Also contains GC for clearing old workers by uptime
     *
     * @class ProcessManager
     * @name ProcessManager
     */
    return Class.extend({

        /**
         * All available workers
         *
         * @property {Worker}[] - array of workers objects
         * @private
         */
        workers: null,

        /**
         * Set interval ID, for schedule event
         *
         * @property {Number}
         * @private
         */
        scheduler: null,

        /**
         * Maximum idle workers
         *
         * @property {Number}
         * @private
         */
        maximumIdleWorkersLimit: 10,

        /**
         * Maximum requests per worker
         *
         * @property {Number}
         * @private
         */
        maximumWorkerRequests: 1000,

        /**
         * Maximum idle time
         * If worker spend more maximumWorkerIdleTime in idle it will shut down
         *
         * @property {Number} - In minutes
         * @private
         */
        maximumWorkerIdleTime: 5,

        /**
         * ProcessManager constructor
         *
         * @extends {Class}
         * @public
         * @constructor
         */
        constructor: function () {

            var self = this;

            // Init worker
            self.workers = [];

            // GC scheduler
            self.scheduler = setInterval(function(){ self.clearMemory(); }, 60000);

            // Get values from settings
            this.maximumIdleWorkersLimit = config.get('application:maximumIdleWorkers');
            this.maximumWorkerRequests = config.get('application:maximumWorkerRequests');
            this.maximumWorkerIdleTime = config.get('application:maximumWorkerIdleTime');
        },

        /**
         * Get IDLE process or create if all workers are busy,
         * then send message to the worker for processing
         *
         * @param {String} abstractWorkerFilePath - Relative path to worker file
         * @param {AbstractMessage} message - Abstract message object
         * @public
         */
        execute: function(abstractWorkerFilePath, message){

            var readyWorker = this.getReadyWorker();

            log.info('Execute new task', path.basename(abstractWorkerFilePath));

            // We have unused worker, use it for request
            if(readyWorker){
                log.info('Used IDLE worker');
                readyWorker.run(abstractWorkerFilePath, message);
                return;
            }

            // Create new worker
            this.createNewWorker()
                .timeout(30000)
                .then(function(newWorker){
                    log.info('Run task on new worker');
                    newWorker.run(abstractWorkerFilePath, message);
                }).done();
        },

        /**
         * Shutdown all WorkerProcess
         *
         * @returns {Promise}
         * @public
         */
        shutdownAllWorkers: function(){

            var self = this;

            clearInterval(this.scheduler);

            var shutdownPromises = [];

            _.each(this.workers, function(worker){
                self.stopListening(worker);
                self.workers = _.without(self.workers, worker);
                shutdownPromises.push(worker.shutdown());
            });

            return Q.all(shutdownPromises);
        },

        /**
         * Create new WorkerProcess and add listeners then push crated process instance to the workers array.
         * Return promise, resolved with WorkerProcess instance.
         * @private
         * @returns {Promise|WorkerProcess}
         */
        createNewWorker: function(){

            var deferred = Q.defer();

            var worker = new WorkerProcess();

            log.info('New worker created');

            worker.once('worker:ready', function(){
                log.info('New worker ready for use');
                deferred.resolve(worker);
            });

            this.listenTo(worker, 'worker:success', this.onWorkerSuccess);
            this.listenTo(worker, 'worker:error',   this.onWorkerError);
            this.listenTo(worker, 'worker:reject',  this.onWorkerReject);
            this.listenTo(worker, 'worker:repeat',  this.onWorkerRepeat);
            this.listenTo(worker, 'worker:exit',    this.onWorkerExit);

            this.workers.push(worker);

            // Return promise
            return deferred.promise;
        },

        /**
         * Find and return IDLE WorkerProcess,
         * if worker not found return null
         *
         * @returns {WorkerProcess}
         * @private
         */
        getReadyWorker: function(){

            var result = _.where(this.workers, { status: 'ready' });
            if(_.isEmpty(result)) return null;

            return _.first(result);
        },

        /**
         * Find and shutdown old WorkerProcess
         *
         * @private
         */
        clearMemory: function(){

            var self = this;

            _.each(this.workers, function(worker){
                if(worker.getIdleTime() >= self.maximumWorkerIdleTime) {
                    log.info('Shutdown by uptime worker with pid:', worker.getPid());
                    worker.shutdown();
                }
            });
        },

        /**
         * This event fire when WorkerProcess successful done the task.
         * Message will resolved.
         * If worker in the pool more that maximumIdleWorkersLimit, worker will shutdown.
         * Otherwise worker will switched to the IDLE state
         *
         * @param {WorkerProcess} worker
         * @param {AbstractMessage} message
         * @event
         * @private
         */
        onWorkerSuccess: function(worker, message){

            log.info('Worker success done work');
            message.resolve();

            if(this.workers.length > this.maximumIdleWorkersLimit ||
                worker.requestsProcessed > this.maximumWorkerRequests){

                worker.shutdown();
            }else{
                worker.switchToReadyState();
            }
        },

        /**
         * This event fire when WorkerProcess failed on task.
         * Message will rejected
         * Worker will shutdown
         *
         * @param {WorkerProcess} worker
         * @param {AbstractMessage} message
         * @event
         * @private
         */
        onWorkerError: function(worker, message){

            log.info('Worker get error and will be closed');

            message.reject();

            // Kill bad process
            worker.shutdown();
        },

        /**
         * This event fire when WorkerProcess reject the task.
         * Message will rejected
         * Worker will switched to the IDLE state
         *
         * @param {WorkerProcess} worker
         * @param {AbstractMessage} message
         * @event
         * @private
         */
        onWorkerReject: function(worker, message){

            log.info('Worker get reject message and will go to idle');

            // No retry
            message.reject();

            if(this.workers.length > this.maximumIdleWorkersLimit){
                worker.shutdown();
            }else{
                worker.switchToReadyState();
            }
        },

        /**
         * This event fire when WorkerProcess try repeat the task.
         * Message will repeated
         * Worker will switched to the IDLE state
         *
         * @param {WorkerProcess} worker
         * @param {AbstractMessage} message
         * @event
         * @private
         */
        onWorkerRepeat: function(worker, message){

            log.info('Worker try repeat message and will go to idle');

            message.repeat();

            if(this.workers.length > this.maximumIdleWorkersLimit){
                worker.shutdown();
            }else{
                worker.switchToReadyState();
            }
        },

        /**
         * This event fire when WorkerProcess will exit.
         * Remove all listeners
         * Remove WorkerProcess fromm workers array
         *
         * @param {WorkerProcess} worker
         * @event
         * @private
         */
        onWorkerExit: function(worker){

            log.info('Worker exit');

            this.stopListening(worker);
            this.workers = _.without(this.workers, worker);
        }

    });
});
