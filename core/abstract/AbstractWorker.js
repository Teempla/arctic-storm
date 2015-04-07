/*
 *  Arctic-snowstorm
 *  (c) 2014-2015, Teempla Inc.
 *
 *  MIT License
 */
"use strict";

define([
    'class',
    'q'
], function(Class, Q) {

    /**
     * AbstractWorker class, use this class for creating your own worker
     *
     * @class AbstractWorker
     * @name AbstractWorker
     * @public
     */
    return Class.extend({

        /**
         * After this timeout task will be rejected
         *
         * @property {Number}
         * @private
         */
        timeout: null,

        /**
         * If message already rejected set this flag to true
         *
         * @property {Boolean}
         * @private
         */
        rejectSend: false,

        /**
         * AbstractWorker constructor
         *
         * Don`t override this constructor use setUp method instead
         *
         * @constructor
         */
        constructor: function () {

            this.timeout = 1000 * (60 * 20); // 10 minutes default timeout,
                                             // please set more specific timeout for task in setUp
            this.setUp();
        },

        /**
         * Start worker execution.
         * Call beforeExecute method then
         * if message not rejected call execute method
         *
         * @private
         */
        run: function(data, redelivered){

            var self = this;

            self.beforeExecute(data, redelivered)
                .then(function(){
                    if(!self.rejectSend){
                        self.execute(data, redelivered);
                    }
                }).done();
        },

        /**
         * Abstract method for message processing
         *
         * Please implement this method
         *
         * @param {Object} data - Message payload object
         * @param {Boolean} redelivered - True if message already redelivered
         */
        execute: function(data, redelivered){
            throw new Error('Please implement execute method');
        },

        /**
         * Send success event to master process.
         *
         * Call this method if you successful processed current message,
         * this will init acknowledge event for queue
         *
         * @public
         */
        success: function(){
            process.send('success');
        },

        /**
         * Send repeat event to master process
         *
         * Call this method if you got error on processing current message,
         * and want get this message again.
         *
         * Be careful you may block message processing by calling this method without any counters and checks.
         * For most case "redelivered" helps solve this problems.
         *
         * @example
         *  if(redelivered){
         *      this.reject();
         *  }else{
         *      this.repeat();
         *  }
         *
         * If you don`t want get this message again use reject method.
         *
         * @public
         */
        repeat: function(){

            // Do not send error if reject signal send
            if(this.rejectSend) return;

            // Give time for saving error
            process.send('repeat');
        },

        /**
         * Send reject event to master process
         *
         * Use this method if you want remove current message from queue.
         *
         * @public
         */
        reject: function(){
            this.rejectSend = true;
            process.send('reject');
        },

        /**
         * Use this method instead constructor.
         *
         * @public
         */
        setUp: function(){},

        /**
         * This method will be called before execute event.
         * In this method you able to reject the message before execution.
         *
         * You must return empty promise
         *
         * @param {Object} data
         * @param {Boolean} redelivered
         * @returns {Promise}
         */
        beforeExecute: function(data, redelivered){
            return Q();
        }
    });

});