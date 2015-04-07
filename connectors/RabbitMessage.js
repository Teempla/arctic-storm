/*
 *  Arctic-snowstorm
 *  (c) 2014-2015, Teempla Inc.
 *
 *  MIT License
 */
"use strict";

define([
    'abstractMessage',
    'log'
], function(AbstractMessage, log) {

    /**
     * This is abstract wrapper for rabbitMQ message.
     * Used by ProcessManager for managing message state
     *
     * @name RabbitMessage
     * @class RabbitMessage
     * @override AbstractMessage
     * @public
     */
    return AbstractMessage.extend({

        /**
         * Message payload
         *
         * @private
         * @property {Object}
         */
        data: null,

        /**
         * Amqp message object
         *
         * @private
         * @property {Message}
         */
        message: null,

        /**
         * RabbitMessage constructor
         *
         * @param {Object} data - Message payload
         * @param {Message} message - Amqp message object
         * @override AbstractMessage
         *
         * @constructor
         */
        constructor: function (data, message) {

            this.data = data;
            this.message = message;
        },

        /**
         * Get message data (Getter for data property)
         *
         * @override AbstractMessage
         * @public
         *
         * @return {Object}
         */
        getData: function(){
            return this.data;
        },

        /**
         * Reject this message
         *
         * @override AbstractMessage
         * @public
         */
        reject: function(){
            log.info('Message rejected');
            this.message.reject(false);
        },

        /**
         * Repeat this message
         *
         * @override AbstractMessage
         * @public
         */
        repeat: function(){
            log.info('Message will be repeated');
            this.message.reject(true);
        },

        /**
         * Resolve this message
         *
         * @override AbstractMessage
         * @public
         */
        resolve: function(){
            log.info('Message resolved');
            this.message.acknowledge();
        },

        /**
         * Is this message already redelivered
         *
         * @override AbstractMessage
         * @public
         *
         * @return {Boolean}
         */
        isRedelivered: function(){
            return this.message.redelivered;
        }

    });

});
