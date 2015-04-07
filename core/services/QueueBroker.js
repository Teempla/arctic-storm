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
    'config',
    'q',
    'log',
    'processManager',
    'path'
], function(Class, _, config, Q, log, ProcessManager, path) {

    /**
     * Wrapper for working with AbstractQueue and process manager
     * Listen queue "message:spawn" event then send this event to process manager
     *
     *  @class QueueBroker
     *  @name QueueBroker
     */
    return Class.extend({

        /**
         * Workers configs
         *
         * @property {Array<Object>} queue
         *
         * @example of workersConfigs
         * [{
         *      'example.worker': { path: 'ExampleWorker', options: [Object] },
                'example.workerInFolder': { path: 'folder/ExampleWorker', options: [Object] } },
                'test.worker': { path: 'TestWorker', options: [Object] },
                'test.workerInFolder': { path: 'folder/TestWorker', options: [Object] } }
         *}]
         * @private
         */
        workerConfig: null,

        /**
         * Keep reference to process manager
         *
         * @property {ProcessManager}
         * @private
         */
        processManager: null,

        /**
         * Abstract queue class name
         *
         * @property {String}
         * @private
         */
        abstractQueueName: null,

        /**
         * List of modules names
         *
         * @property {Array<String>}
         * @private
         */
        modules: null,

        /**
         * Abstract queue reference
         *
         * @property {AbstractQueue}
         * @private
         */
        queue: null,

        /**
         * QueueBroker constructor
         *
         * @param {String} abstractQueueName
         * @param {Array<String>} modules
         *
         * @constructor
         */
        constructor: function (abstractQueueName, modules) {

            this.workerConfig = [];
            this.processManager = new ProcessManager();
            this.abstractQueueName = abstractQueueName;
            this.modules = modules;
        },

        /**
         * Connect AbstractQueue and subscribe workers
         *
         * @public
         *
         * @return {Promise} - Return empty promise
         */
        start: function(){

            var self = this;

            log.info('Broker start');

            return self.loadAbstractQueue(self.abstractQueueName)
                .then(function(queue) {

                    log.info('Broker use', self.abstractQueueName, 'queue provider');

                    self.queue = queue;
                    self.listenTo(queue, 'message:spawn', self.processMessage);

                    log.info('Broker subscribe workers');

                    return self.queue.connect();
                })
                .then(function(){
                    return self.loadModules(self.modules);
                })
                .then(function(workerConfig){
                    return self.queue.subscribeWorkers(workerConfig);
                });
        },

        /**
         * Disconnect from AbstractQueue, shut down all process
         *
         * @public
         * @return {Promise} - Return empty promise
         */
        stop: function(){

            var disconnectQueue = Q();
            var disconnectProcessManager = Q();

            if(this.queue){
                disconnectQueue = this.queue.disconnect();
            }

            if(this.processManager){
                disconnectProcessManager = this.processManager.shutdownAllWorkers();
            }

            return Q.all([disconnectQueue, disconnectProcessManager]);
        },

        /**
         * Start new message processing worker
         *
         * @param {String} workerFilePath - path to worker file
         * @param {AbstractMessage} message
         * @public
         */
        processMessage: function(workerFilePath, message){
            this.processManager.execute(workerFilePath, message);
        },

        /**
         * Start new message processing worker
         *
         * @param {String} abstractQueueName
         * @private
         *
         * @return {Promise} - Return empty promise
         */
        loadAbstractQueue: function(abstractQueueName){

            var deferred = Q.defer();

            requirejs(['connectors/' + abstractQueueName], function(abstractQueue){
                deferred.resolve(abstractQueue);
            });

            return deferred.promise;
        },

        /**
         * Start new message processing worker
         *
         * @param {Array<String>} modules
         * @private
         *
         * @return {Object} - Return workers configs
         */
        loadModules: function(modules){

            var workers = {};

            // Load configs
            _.each(modules, function(module){
                config.addModuleConfig(module);

                var workerSubscribe = config.get(module + ':subscribe');

                _.each(workerSubscribe, function(config){
                    config.file = path.join('modules', module, config.file);
                });

                workers = _.extend(workers, workerSubscribe);
            });

            return workers;
        }

    });
});