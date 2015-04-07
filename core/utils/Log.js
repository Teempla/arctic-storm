/*
 *  Arctic-snowstorm
 *  (c) 2014-2015, Teempla Inc.
 *
 *  MIT License
 */
"use strict";

define(['log4js', 'cluster', 'path'], function (log4js, cluster, path) {

    var __dirname = require.toUrl('logs/');
    var category;
    var appendersArray = [];
    var fileAppender;

    appendersArray.push({ type: 'console' });

    fileAppender = {
        type: 'file',
        absolute: true,
        // Logs will saves to logs/ dir
        filename: path.join(__dirname, 'service.log'),
        maxLogSize: 20480,
        backups: 10,
        pollInterval: 15
    };

    // This need for handle multi process logs
    if(cluster.isMaster){
        category = 'master';
        appendersArray.push({
            "type": "multiprocess",
            "mode": "master",
            "loggerPort": 5001,
            "loggerHost": "localhost",
            "appender": fileAppender
        });
    }else{
        category = 'worker';
        appendersArray.push({
            "type": "multiprocess",
            "mode": "worker",
            "loggerPort": 5001,
            "loggerHost": "localhost",
            "appender": fileAppender
        });
    }

    log4js.configure({
        appenders: appendersArray
    });

    return log4js.getLogger(category);
});

