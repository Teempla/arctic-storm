/*
 *  Arctic-snowstorm
 *  (c) 2014-2015, Teempla Inc.
 *
 *  MIT License
 */
"use strict";

define([
    'abstractConnector'
], function(AbstractConnector) {

    /**
     * AbstractQueue class
     *
     * @class AbstractQueue
     * @name AbstractQueue
     *
     * @override AbstractConnector
     * @static
     * @public
     */
    return AbstractConnector.extend({ /** THIS CLASS HAS ONLY STATIC METHODS **/ },{

        /**
         * Batch subscription for workers
         * Must return promise
         *
         * @param {Object} workersConfigs
         * @example of workersConfigs {
         *          'queueName': { file: 'path/to/worker', options: {} }
         *      , ... }
         *
         * @public
         *
         * @return {Promise} return empty promise
         */
        subscribeWorkers: function(workersConfigs){
            throw new Error('You must implement subscribeWorkers method for AbstractQueue');
        }

    });

});