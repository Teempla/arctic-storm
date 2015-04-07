# Arctic storm

Arctic storm is a simple Node Js framework for queueing jobs and processing them in the background with workers.
Framework allows you to work with the RabbitMQ or another queues engine in safe and easy way.

## What are the advantages:

Multiprocessing(Cluster API) - allows you use all available CPU of your server and accurately control the memory usage. 

All worker runs in the a separate system process and when the work is done frees allocated memory, this allow you run a heavy background job without worry about memory leaks

Don't worry about exception, unhandled exception in the worker will not crash your main process and will not affect others running workers, because all workers runs in the separate process and if worker got an exception it will be graceful shutdown.

You get many things from the box like: logs, configs, queue API etc.

## Installation

Install RabbitMQ, see https://www.rabbitmq.com/download.html for more details.

Clone repository to a convenient folder for you, for example lеt it be /home/arctic-storm:   

````sh
git clone git@github.com:Teempla/arctic-storm.git /home/arctic-storm
````

Then install all reuquirements by npm:
````sh
cd /home/arctic-storm
npm install
````

Check config settings for RabbitMQ(default queue service) in the configs/default.yml.
If you want change some setting I recommend you to create configs/production.yml and override setting there.
But for first time you can just fix default config.

After all preparation run node service:

````sh
cd /home/arctic-storm
node service.js
````

If you see green messages all works fine. See example module for understanding message processing workflow.

## Create module

First, create module folder, let's call it "test":

````sh
cd /home/arctic-storm/modules
mkdir test
````

Place in this folder config.yml:

````sh
cd /home/arctic-storm/modules/test
touch config.yml
````

Put to config.yml something like this:

````yaml
name: 'My firs test module'
subscribe: {}
````

Now add module to application config, go to /home/arctic-storm/configs/ and edit default.yml.
Find section that looks like: 
````yaml
modules: [example]
````
Then add your module name to the modules array, you will get something like this:
````yaml
modules: [example,test]
````

That's all, you created your first module, see next paragraph about workers.

## Workers

After we creatred module let's create your first worker:
````sh
cd /home/arctic-storm/modules/test
touch MyFirstWorker.js
````

Put to MyFirstWorker.js code:
````javascript
"use strict";

define([
    'abstractWorker',
    'log',
    'config',
    'q',
    'lodash'
], function(AbstractWorker, log, config, Q, _) {

    /**
     *  @class MyFirstWorker
     */
    return AbstractWorker.extend({

        /**
         * Do work
         */
        execute: function(data, redelivered){

            log.info('My first worker say: Hello word!');
            this.success();
        }
    });
});
````

Now subscribe our worker to "test.queue" events.
Put to module config(/home/arctic-storm/modules/test/config.yml) this code: 
````yaml
name: 'My firs test module'
subscribe:
  test.queue:
    file: MyFirstWorker
````

Start service.js and try to send message to your worker:
````sh
rabbitmqadmin publish exchange=amq.default routing_key=test.queue payload="hello, world"
````

That is all, now you can do something useful. For more advanced usage see example module.

## More documentation

Comming soon...

## Tests

Comming soon...
