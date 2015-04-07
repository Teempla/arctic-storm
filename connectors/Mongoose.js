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
    'mongoose',
    'config'
],function (AbstractConnector, Q, log, _, mongoose, config) {

    /**
     * Mongoose connector static class
     * Used for connecting mongoose to MongoDB
     *
     * @name Mongoose
     * @class Mongoose
     * @override AbstractConnector
     * @static
     * @public
     */
    return AbstractConnector.extend({ /** THIS CLASS HAS ONLY STATIC METHODS **/ }, {

        /**
         * Mongoose instance.
         * Use this property for working with mongoose
         *
         * @property {Mongoose}
         * @public
         */
        mongoose: null,

        /**
         * Counter of failed connection attempts
         *
         * @property {Number}
         * @private
         */
        errorsCounter: 0,

        /**
         * How many times try connect to mongoDB before application shutdown
         *
         * @property {Number}
         * @private
         */
        maxErrorsBeforeExit: 7,

        /**
         * Connect to mongo db, used by ConnectorsManager
         *
         * @override AbstractConnector
         * @public
         * @return {Promise} return empty promise
         */
        connect: function(){

            var deferred = Q.defer();
            var self = this;

            // Get config from configs/default
            var connectionConfig = config.get('application:Mongoose');

            // Create connection
            this.mongoose = mongoose.connect(connectionConfig.url, connectionConfig.options);
            var connection = mongoose.connection;

            // Start connecting
            connection.on('connecting', function () {
                log.info('Try connect to MongoDB...');
            });

            connection.on('connected', function () {
                log.info('Connected to MongoDB');
                self.errorsCounter = 0;
            });

            // Wait for connection to become established.
            connection.on('open', function () {
                log.info('Connection to MongoDB ready');
                deferred.resolve();
            });

            connection.on('disconnecting', function () {
                log.info('Disconnecting from MongoDB...');
            });

            connection.on('disconnected', function () {
                log.warn('Disconnected from MongoDB');
            });

            connection.on('close', function () {
                log.warn('Close MongoDB connection');
            });

            connection.on('reconnected', function () {
                log.warn('Successful reconnected to MongoDB');
            });

            // Try to reconnect
            connection.on('error', function (error) {

                deferred.reject(error.message);

                if(self.errorsCounter > self.maxErrorsBeforeExit){
                    throw new Error('MongoDB reconnection failed after 7 attempts, close application');
                }

                self.errorsCounter += 1;
                log.error('Error MongoDB: ' + error.message);
            });

            // Save connection
            this.mongoose = mongoose;

            // Return promise
            return deferred.promise;
        },

        /**
         * Disconnect form mongo db, used by ConnectorsManager
         *
         * @override AbstractConnector
         * @public
         * @return {Promise} return empty promise
         */
        disconnect: function(){

            var deferred = Q.defer();

            // If connection not created at this moment
            if(!this.mongoose) {
                deferred.resolve();

                // Return promise
                return deferred.promise;
            }

            this.mongoose.disconnect(function(){
                deferred.resolve();
            });

            // Return promise
            return deferred.promise;
        }

    });
});