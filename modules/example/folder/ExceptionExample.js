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
     * This worker demonstrating to you how worker process will handle exception
     *
     *  @class ExceptionExample
     */
    return AbstractWorker.extend({

        /**
         * Abstract method for settings worker
         */
        setUp: function(){
            this.timeout =  1000 * (60 * 2); // 2 minutes timeout for this work
        },

        /**
         * Do work
         */
        execute: function(data, redelivered){

            log.info('This worker throws exception, and this won`t crash service');

            setTimeout(function(){

                throw new Error('Oh, no!!');

            }, 5000);
        }

    });

});