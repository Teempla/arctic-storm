/*
 *  Arctic-snowstorm
 *  (c) 2014-2015, Teempla Inc.
 *
 *  MIT License
 */
"use strict";

define([
    'abstractWorker',
    'log',
    'config',
    'q',
    'lodash'
], function(AbstractWorker, log, config, Q, _) {

    /**
     * This worker demonstrating to you the message processing workflow
     *
     * @class ExampleWorker
     */
    return AbstractWorker.extend({

        /**
         * Use this method instead constructor
         */
        setUp: function(){
            this.timeout =  1000 * (60 * 2); // 2 minutes timeout for this work
        },

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

            log.info('This method fire before every message');

            if(data && data.rejectMe === true){
                log.warn('You rejected this message, execute won`t be call');
                this.reject();
            }

            return Q();
        },

        /**
         * This method will be called for processing message,
         * if beforeExecute not rejected this message before
         */
        execute: function(data, redelivered){

            // Start time
            var startTime = new Date();
            var self = this;

            log.info('Start example worker', data);

            // Do some hard work
            Q.delay(1000)
                .then(function(){


                    if(_.isEmpty(data)){
                        // This exception will be handled by catch
                        throw new Error('Worker needs some data');
                    }

                    log.info('Worker say: ', data.say);

                    // Success means that message was successful processed
                    self.success();
                })
                .catch(function(error){

                    log.error('Worker say error:', error);

                    // If we already repeated this message, probably we should reject this message
                    if(redelivered){
                        // If we call reject, message will be rejected from queue
                        self.reject();
                    }else{
                        // If we call repeat, message will be redelivered again
                        self.repeat();
                    }

                })
                .done(function(){
                    log.info('Worker done:', (new Date() - startTime) / 1000, 'sec');
                });
        }

    });

});
