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
    'q',
    'path'
], function(Class, _, Q, path) {

    /**
     *  Wrapper for manage AbstractConnectors.
     *  Call method connect and disconnect for all enabled connectors
     *
     * @class ConnectorsManager
     * @name ConnectorsManager
     */
    return Class.extend({

        /**
         * Connectors names list
         *
         * @property {String[]}
         * @private
         */
        connectorsNames: null,

        /**
         * List of all connected connectors
         *
         * @property {AbstractConnector[]}
         * @private
         */
        connectors: null,

        /**
         * ProcessRunner constructor
         *
         * @param {String[]} connectorsNames - List of connectors names
         * @extends {Class}
         * @public
         *
         * @constructor
         */
        constructor: function (connectorsNames) {

            var self = this;

            // Init worker
            self.connectorsNames = connectorsNames || [];
        },

        /**
         * Connect all enabled connectors
         *
         * @public
         *
         * @return {Promise} - Return empty promise
         */
        connect: function(){

            var self = this;

            // Fix connectors path
            var connectorsPaths = _.map(this.connectorsNames, function(name){ return path.join('connectors', name); });

            // Load and save connector to connectors property
            return self.loadConnectors(connectorsPaths)
                .then(function(connectors){

                    var promisesArray = [];
                    self.connectors = connectors;

                    _.each(connectors, function(connector){
                        // Call abstract static connector method for init connection
                        promisesArray.push(connector.connect());
                    });

                    return Q.all(promisesArray);
                });
        },

        /**
         * Disconnect all enabled connectors
         *
         * @public
         *
         * @return {Promise} - Return empty promise
         */
        disconnect: function(){

            var promisesArray = [];

            _.each(this.connectors, function(connector){
                promisesArray.push(connector.disconnect());
            });

            return Q.all(promisesArray);
        },

        /**
         * Sync disconnect all enabled connectors
         *
         * @public
         */
        syncDisconnect: function(){

            _.each(this.connectors, function(connector){
                connector.syncDisconnect();
            });
        },

        /**
         * Dynamically load connectors by path
         *
         * @private
         * @return {Promise|AbstractConnector} - return promise with AbstractConnectors collection
         */
        loadConnectors: function(connectorsPaths){

            var deferred = Q.defer();
            var connectors = [];

            requirejs(connectorsPaths, function(){

                _.each(arguments, function(connector){
                    connectors.push(connector);
                });

                deferred.resolve(connectors);
            });

            return deferred.promise;
        }

    });
});
