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
    'cluster',
    'domain',
    'log'
], function(Class, _, cluster, Domain, log) {

    /**
     * GracefulDomain class, for graceful handle application flow events
     *
     * @class GracefulDomain
     * @name GracefulDomain
     */
    return Class.extend({

        /**
         * Max execution time for exit callback
         * @private
         * @const
         */
        MAX_EXIT_TIME: 5000,

        /**
         * Domain reference
         * @property {domain}
         * @private
         */
        domain: null,

        /**
         * Exit from application in exit event, exit work only in sync mode
         * @property {Boolean}
         * @private
         */
        syncExit: null,

        /**
         * If application exit by SIGTERM or SIGINT we may execute async operation
         * but in some cases exit with out this signals. On this case we have only
         * exit event, but in exit event we may execute only sync code.
         * This property indicate if exiting is graceful and we don`t ned run emergency exit.
         *
         * @property {Boolean}
         * @private
         */
        gracefulExit: null,

        /**
         * Before application exit we generate shutdown event with callback,
         * on callback we call process exit and application will stop.
         * We need prevent callback stack, so we create on shutdown
         * timer for limit execution callback time
         *
         * @property {Number}
         * @private
         */
        forceShutdownTimer: null,

        /**
         * Domain constructor
         *
         * @constructor
         * @extends {Class}
         */
        constructor: function (){

            var self = this;
            self.syncExit = function(){};

            var domain = Domain.create();

            // You must always exit on ERROR event !!!!!!
            domain.on('error', function(error){
                self.trigger('error', error, self);
            });

            // listen for TERM signal .e.g. kill
            process.on ('SIGTERM',  function (){
                self.gracefulExit = true;
                self.shutdown(1);
            });

            // user terminated app by ctrl+c
            process.on ("SIGINT", function (){
                self.gracefulExit = true;
                self.shutdown(0);
            });

            // You must always exit on ERROR event !!!!!!
            process.on('uncaughtException', function(error) {
                self.trigger('error', error);
            });

            // Handle exit event
            process.on('exit', function(code) {

                self.trigger('exit', code);

                // Exit was not graceful ((
                if(!self.gracefulExit){
                    self.syncExit();
                }
            });

            process.on('message', function(msg) {

                if(msg == 'shutdown'){
                    self.gracefulExit = true;
                    self.shutdown(0);
                }

                self.trigger('message', msg);
            });

            self.domain = domain;
        },

        /**
         * Emergency exit event use only sync code
         *
         * @param {Function} cb
         * @public
         */
        onEmergencySyncExit: function(cb){
            this.syncExit = cb;
        },

        /**
         * Run process
         *
         * @public
         */
        start: function(){

            var self = this;

            // Handle sync exception for domain run
            try{
                self.domain.run(function(){
                    self.trigger('start');
                });
            }catch (error){
                self.trigger('error', error);
            }
        },

        /**
         * Shutdown process
         *
         * @param {Number} code
         * @public
         */
        shutdown: function(code){

            var self = this;

            // Set max execution for exit callback
            self.forceShutdownTimer = setTimeout(function(){
                self.trigger('forcedShutdown', code);
                log.warn('forcedShutdown');
                self.exit(code);
            }, self.MAX_EXIT_TIME);

            self.trigger('shutdown', function() { self.exit(code); });
        },

        /**
         * Process exit
         *
         * @param {Number} code
         * @private
         */
        exit: function(code){

            clearTimeout(this.forceShutdownTimer);
            process.exit(code);
        }
    });

});
