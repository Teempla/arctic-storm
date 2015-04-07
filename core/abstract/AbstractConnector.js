/*
 *  Arctic-snowstorm
 *  (c) 2014-2015, Teempla Inc.
 *
 *  MIT License
 */
"use strict";

define([
    'class'
], function(Class) {

    /**
     * AbstractConnector class
     *
     * @class AbstractConnector
     * @name AbstractConnector
     * @static
     * @public
     */
    return Class.extend({ /** THIS CLASS HAS ONLY STATIC METHODS **/  }, {

        /**
         * Override this method in your connector.
         * Connector must return promise.
         * Resolve promise when connection to become established or reject if you can`t connect
         *
         * @public
         * @return {Promise} return empty promise
         */
        connect: function(){ throw new Error('You must implement connect method'); },

        /**
         * Override this method in your connector.
         * Connector must return promise.
         * Resolve promise when connection to become closed or reject if you can`t close connection
         *
         * @public
         * @return {Promise} return empty promise
         */
        disconnect: function(){ throw new Error('You must implement disconnect method'); },

        /**
         * Override this method in your connector if connector support async disconnect.
         * Use only sync code.
         *
         * @public
         * @return {Promise} return empty promise
         */
        syncDisconnect: function(){}

    });
});