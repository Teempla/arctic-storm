/*
 *  Arctic-snowstorm
 *  (c) 2014-2015, Teempla Inc.
 *
 *  MIT License
 */
"use strict";

define([
    'class',
    'nconf',
    'fs',
    'js-yaml',
    'path',
    'log'
], function(Class, nconf, fs, yaml, path, log) {

    /**
     * Config class
     *
     * Add log namespace:
     * config.add('MyNamespace', 'path/to/default/config.yml', 'path/to/production/config.yml');
     * (Path must by relative to "configs" dir)
     *
     * Get value from namespace:
     * config.get('MyNamespace:object:property')
     *
     * If you what get all configs value for namespace try: config.get('MyNamespace'),
     * this will return all values in this namespace
     *
     * @class Config
     * @name Config
     * @static
     * @public
     */
    return Class.extend({ /** THIS CLASS HAS ONLY STATIC METHODS **/ }, {

        /**
         * Base config path
         *
         * @property {String}
         */
        configPath: '/',

        /**
         * Base module path
         *
         * @property {String}
         */
        modulesPath: '/',

        /**
         * Set base configuration path, this path will be base for add() method
         *
         * @param {String} configPath
         * @public
         */
        setConfigPath: function (configPath) {

            log.info('Set base dir for config file:', configPath);
            this.configPath = configPath;
        },

        /**
         * Set base configuration path for modules, this path will be base for addModuleConfig() method
         *
         * @param {String} modulesPath
         * @public
         */
        setModulesPath: function (modulesPath) {

            log.info('Set base dir for modules:', modulesPath);
            this.modulesPath = modulesPath;
        },

        /**
         * Add config file
         *
         * @param {String} namespace - This will be prefix for config
         * @param {String} defaultConfig
         * @param {String} specificConfig - Values from this config will override default values
         *
         * @public
         */
        add: function(namespace, defaultConfig, specificConfig){

            var defaultConfigPath = path.join(this.configPath, defaultConfig);
            var specificConfigPath = path.join(this.configPath, specificConfig);

            this.loadConfig(namespace, defaultConfigPath, specificConfigPath);
        },

        /**
         * Add module config file.
         *
         * For example you have module "test", after call: addModuleConfig('test')
         * config service will search default config file at the "modules/test/config.yml" and
         * production config file at the "/configs/test.yml"
         *
         * @param {String} moduleName - Module folder name at the "modules" directory
         *
         * @public
         */
        addModuleConfig: function(moduleName){

            var defaultConfigPath =  path.join(this.modulesPath, moduleName, 'config.yml');
            var specificConfigPath =  path.join(this.configPath,  moduleName+'.yml');

            this.loadConfig(moduleName, defaultConfigPath, specificConfigPath);
        },

        /**
         * Load config function fro internal use
         *
         * @param namespace
         * @param defaultConfigPath
         * @param specificConfigPath
         * @private
         */
        loadConfig: function(namespace, defaultConfigPath, specificConfigPath){

            nconf.add(namespace + '-production',   { type: 'file',
                file: specificConfigPath,
                format: {
                    parse: function(data){
                        var result = {};
                        result[namespace] = yaml.safeLoad(data);
                        return result;
                    },
                    stringify: yaml.safeDump
                }
            });

            nconf.add(namespace + '-default',  { type: 'file',
                file: defaultConfigPath,
                format: {
                    parse: function(data){
                        var result = {};
                        result[namespace] = yaml.safeLoad(data);
                        return result;
                    },
                    stringify: yaml.safeDump
                }
            });

            fs.exists(defaultConfigPath, function(exists) {
                log.info('Try load config:' , defaultConfigPath , 'is loaded:' , exists);
            });

            fs.exists(specificConfigPath, function(exists) {
                log.info('Try load config:' , specificConfigPath , 'is loaded:' , exists);
            });
        },

        /**
         * Get value form config by key
         *
         * @param {String} key - For separating namespaces use ":"
         * @example config.get('MyNamespace:object:property')
         * @public
         *
         * @return {Object|undefined}
         */
        get: function(key){
            return nconf.get(key);
        },

        /**
         * Override default configs vars by values from ARGV
         *
         * @example:
         *      node service.js  --application:environment production
         *      config.get('application:environment') --> production
         *
         * @public
         *
         * @return {nconf}
         */
        argv: function(){
            return nconf.argv();
        },

        /**
         * Override default configs vars by values from environment
         *
         * @example:
         *      NODE_ENV=production node service.js
         *      config.get('NODE_ENV') --> production
         *
         * @public
         *
         * @return {nconf}
         */
        env: function(){
            return nconf.env();
        }
    });

});