/*
 *  Arctic-snowstorm
 *  (c) 2014-2015, Teempla Inc.
 *
 *  MIT License
 */
"use strict";

define([
    'abstractQueue',
    'config',
    'amqp',
    'q',
    'log',
    'lodash',
    './RabbitMessage'
], function(AbstractQueue, config, amqp, Q, log, _, Message) {

    /**
     * RabbitMQ connector static class
     * Provide abstract queue API for QueueBroker
     *
     * @name RabbitMQ
     * @class RabbitMQ
     * @override AbstractConnector, AbstractQueue
     * @static
     * @public
     */
    return AbstractQueue.extend({ /** THIS CLASS HAS ONLY STATIC METHODS **/ }, {

        /**
         * Connection for RabbitMQ
         *
         * @property {Object}
         * @private
         */
        connection: null,

        /**
         * Cache of exchange channels
         *
         * @property {Object} - {exchangeName: <Promise|Exchange>, ... }
         * @private
         */
        openedExchanges: null,

        /**
         * Cache of opened queues
         *
         * @property {Object} - {queueName: <Promise|Queue>, ... }
         * @private
         */
        queueConnections: null,

        /**
         * Connect to rabbitMQ server, used by QueueBroker
         *
         * @override AbstractConnector
         * @public
         *
         * @return {Promise} return empty promise
         */
        connect: function(){

            this.queueConnections = {};
            this.openedExchanges = {};
            var deferred = Q.defer();

            var connectionConfig = config.get('application:RabbitMQ');

            // Create connection
            var connection = amqp.createConnection({
                host:     connectionConfig.host,
                port:     connectionConfig.port,
                login:    connectionConfig.login,
                password: connectionConfig.password
            });

            log.info('Try connect to RabbitMQ...');

            // Wait for connection to become established.
            connection.on('ready', function () {
                log.info('Connection to RabbitMQ ready');
                deferred.resolve(connection);
            });

            connection.on('error', function (error) {

                // Prevent error on end connection,
                // see issue https://github.com/postwait/node-amqp/issues/300
                if(error.message == 'read ECONNRESET'){
                    log.warn('Warn RabbitMQ: ' + error.message);
                    return;
                }

                deferred.reject(error.message);
                log.error('Error RabbitMQ:', error);
            });

            connection.on('end', function () {
                log.warn('RabbitMQ connection is ended, try reconnect...');
                connection.reconnect();
            });

            this.connection =  connection;

            // Return promise
            return deferred.promise;
        },

        /**
         * Stop listen queue
         *
         * @override AbstractConnector
         * @public
         *
         * @return {Promise} return empty promise
         */
        disconnect: function(){

            var deferred = Q.defer();

            if(!this.connection){
                log.warn('Queue not inited');
                deferred.resolve();
                return deferred.promise;
            }

            log.warn("RabbitMQ disconnecting...");

            // Prevent reconnecting
            this.connection.removeAllListeners('end');

            this.connection.end();

            this.connection.on('close', function () {
                log.warn('RabbitMQ connection is closed');
                deferred.resolve();
            });

            return deferred.promise;
        },

        /**
         * Async disconnect, for emergency exit
         *
         * @override AbstractConnector
         * @public
         */
        syncDisconnect: function(){

            if(this.connection){
                this.connection.disconnect();
                log.warn("Emergency queue exit");
            }
        },

        /**
         * Publish message
         *
         * @param {String} queueName - Target queue name
         * @param {Object} message - Message object to send, will encoded to json
         * @param {String} [exchange] - Optional, exchange name, by default used amq.default
         *
         * @return {Promise}
         *
         * @public
         */
        publish: function(queueName, message, exchange){

            var self = this;
            var queue = null;

            // Set default exchange
            exchange = exchange || 'amq.default';

            // Get queue object
            return self.getQueue(queueName)
                .then(function(result){
                    queue = result;

                    // Open exchange
                    return self.openExchange(exchange);
                })
                .then(function(exchange){

                    // Bind queue to exchange
                    queue.bind(exchange, queueName);

                    // Publish message to queue over exchange
                    exchange.publish(queueName,
                        JSON.stringify(message),
                        { contentType: 'text/json',  deliveryMode: 2 }
                    );
                });
        },

        /**
         * Batch subscription for workers
         *
         * @param {Object} workersConfig - { 'queueName': { file: 'path/to/worker', options: {} }, ... }
         * @override AbstractQueue
         * @public
         *
         * @return {Promise}
         */
        subscribeWorkers: function(workersConfig){

            var self = this;
            var promisesArray = [];

            // Subscribe workers
            _.each(workersConfig, function(workerConfig, queueName){
                promisesArray.push(self.subscribe(queueName, workerConfig));
            });

            return Q.all(promisesArray);
        },

        /**
         * Open exchange or get from cache
         *
         * @param {String} exchangeName
         * @private
         *
         * @returns {Promise|Exchange}
         */
        openExchange: function(exchangeName){

            var deferred = Q.defer();

            // Cache exchange section
            if(this.openedExchanges[exchangeName]) return this.openedExchanges[exchangeName];
            this.openedExchanges[exchangeName] = deferred.promise;

            log.info('Try open exchange', exchangeName);

            // Get exchange object
            this.connection.exchange(exchangeName, { type: 'direct' }, function (exchange) {
                log.info('Exchange opened:', exchangeName);
                deferred.resolve(exchange);
            });

            return deferred.promise;
        },

        /**
         * Open queue connection or get from cache
         *
         * @param {String} queueName
         * @param {Object} [options]
         * @private
         *
         * @returns {Promise|Queue}
         */
        getQueue: function(queueName, options){

            var deferred = Q.defer();

            // Default queue settings
            options = options ||  { "durable": true,  "autoDelete": false };

            // Cache queue section
            if(this.queueConnections[queueName]) return this.queueConnections[queueName];
            this.queueConnections[queueName] = deferred.promise;

            log.info('Try connect to queue', queueName);

            // Get queue object
            this.connection.queue(queueName, options, function(queue){
                log.info('Connect to queue', queueName);
                deferred.resolve(queue);
            });

            return deferred.promise;
        },

        /**
         * Subscribe for events, will emit message:spawn event
         *
         * @param {String} queueName
         * @param {Object} config
         *
         * @example of config object
         * {
         *   "file":     "folder/to/ExampleWorker",
         *   "options": {
         *       "queue": { "durable": true,  "autoDelete": false },
         *       "subscription": {"ack": true, "prefetchCount": 10 }
         *   }
         * }
         *
         * @private
         *
         * @returns {Promise|Queue}
         */
        subscribe: function(queueName, config){

            var self = this;

            // Set default queue settings
            config.options =  config.options || {};
            var queueConfig = _.extend({ durable: true,  autoDelete: false }, config.options.queue);
            var subscriptionConfig = _.extend({ ack: true,  prefetchCount: 1 }, config.options.subscription);

            log.info('Try subscribe worker: ' + config.file + ' to ' + queueName);

            return this.getQueue(queueName, queueConfig).then(function(queue){

                log.info('Worker: ' + config.file + ' successful subscribed to ' + queueName);

                queue.subscribe(subscriptionConfig, function(data, headers, deliveryInfo, message){

                    // This object will emit message:spawn event
                    self.trigger('message:spawn', config.file, new Message(data, message));
                });

            });
        }

    });
});