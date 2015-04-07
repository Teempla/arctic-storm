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
     * AbstractMessage class
     * Abstract wrapper for queue messages
     *
     * @class AbstractMessage
     * @name AbstractMessage
     * @public
     */
    return Class.extend({

        /**
         * Message constructor
         *
         * @param {Object} data - Message payload
         * @param {Object} message - Queue specific message
         *
         * @constructor
         */
        constructor: function (data, message) {
            throw new Error('You must implement constructor method for AbstractMessage');
        },

        /**
         * Get message data (Getter for data property)
         *
         * @public
         *
         * @return {Object}
         */
        getData: function(){
            throw new Error('You must implement getData method for AbstractMessage');
        },

        /**
         * Reject message method
         *
         * @public
         */
        reject: function(){
            throw new Error('You must implement reject method for AbstractMessage');
        },

        /**
         * Repeat message method
         *
         * @override AbstractMessage
         * @public
         */
        repeat: function(){
            throw new Error('You must implement repeat method for AbstractMessage');
        },

        /**
         * Resolve message method
         *
         * @public
         */
        resolve: function(){
            throw new Error('You must implement resolve method for AbstractMessage');
        },

        /**
         * Return true if message already redelivered
         *
         * @public
         *
         * @return {Boolean}
         */
        isRedelivered: function(){
            throw new Error('You must implement isRedelivered method for AbstractMessage');
        }

    });

});