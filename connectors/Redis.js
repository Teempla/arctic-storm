/*
 *  Arctic-snowstorm
 *  (c) 2014-2015, Teempla Inc.
 *
 *  MIT License
 */
"use strict";

define([
    'abstractConnector',
    'q',
    'log',
    'lodash',
    'redis',
    'config'
],function (AbstractConnector, Q, log, _, redis, config) {

    /**
     * Redis connector static class
     * Used for connecting redis client to redis server
     *
     * @name Redis
     * @class Redis
     * @override AbstractConnector
     * @static
     * @public
     */
    return AbstractConnector.extend({ /** THIS CLASS HAS ONLY STATIC METHODS **/  }, {

        /**
         * Redis client instance.
         * Use this property for working with redis
         *
         * @property {redis}
         * @public
         */
        client: null,

        /**
         * Connect to redis server, used by ConnectorsManager
         *
         * @override AbstractConnector
         * @public
         * @return {Promise} return empty promise
         */
        connect: function(){

            var deferred = Q.defer();

            var connectionConfig = config.get('application:Redis');

            // Create connection
            var client = redis.createClient(connectionConfig.port, connectionConfig.host, connectionConfig.options);

            // Stream is connected, and then you are free to try to send commands
            client.on('connect', function () {
                log.info('Connected to Redis');
            });

            // Ready to receive commands
            client.on('ready', function () {
                log.info('Connection to Redis is ready');
                deferred.resolve();
            });

            // Established Redis server connection has closed.
            client.on('reconnecting', function (info) {

                var maxAttempt = connectionConfig.options.max_attempts ? connectionConfig.options.max_attempts : 7;

                if(info.attempt >= maxAttempt) {
                    client.end();
                    throw new Error('Redis connection is failed, after ' + maxAttempt + 'attempts reconnect');
                }

                log.info('Redis reconnecting:', info);
            });

            // Established Redis server connection has closed.
            client.on('end', function () {
                log.info('Disconnected from Redis');
            });

            client.on('error', function (error) {
                deferred.reject(error.message);
                log.error('Error Redis: ' + error.message);
            });

            // Save client reference
            this.client = client;

            // Return promise
            return deferred.promise;
        },

        /**
         * Disconnect form redis server, used by ConnectorsManager
         *
         * @override AbstractConnector
         * @public
         * @return {Promise} return empty promise
         */
        disconnect: function(){

            var deferred = Q.defer();

            log.info('Try disconnect from Redis... ');

            this.client.quit(function(){
                log.info('Quit command done Redis');
                deferred.resolve();
            });

            // Return promise
            return deferred.promise;
        },

        /**
         * Publish message to redis
         *
         * @param {String} channel - Redis chanel name
         * @param {Object} message - Message object will be encoded to json
         * @public
         *
         * @return {Promise} return empty promise
         */
        publish: function(channel, message){

            var deferred = Q.defer();

            this.client.publish(channel, JSON.stringify(message), function(error){

                if(error){
                    log.error('Redis publish error:', error);
                    deferred.reject(error);
                    return;
                }

                deferred.resolve();
                log.info('Redis publish:', channel);
            });

            return deferred.promise;
        },

        /**
         * Get json object by key
         *
         * @param {String} key
         * @public
         *
         * @return {Promise|Object|null} return promise with result object or null in not found
         */
        getJson: function(key){

            return Q.ninvoke(this.client, 'get', key)
                .then(function(result){
                    if(!result) return null;
                    return JSON.parse(result);
                });
        },

        /**
         * Save json object to db
         *
         * @param {String} key
         * @param {Object} object - object will encoded to json
         * @public
         *
         * @return {Promise|Object|null} return promise with new object or null in not found
         */
        setJson: function(key, object){
            var self = this;

            return Q.ninvoke(this.client, 'set', key,  JSON.stringify(object))
                .then(function(){
                    return self.getJson(key);
                });
        },

        /**
         * Delete key from redis
         *
         * @param {String} key
         *
         * @return {Promise} return empty promise
         */
        'delete': function(key){
            return Q.ninvoke(this.client, 'del', key);
        }

    });
});