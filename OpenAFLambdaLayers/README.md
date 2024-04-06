# OpenAF AWS Lambda layers

In order to be able to run serveless AWS Lambda OpenAF scripts and oJobs the current container will build 3 supporting AWS Lambda layers:

  * **MiniJVM** - A small JRE.
  * **OpenAF** - The latest OpenAF runtime with the OpenAF opack to access RAID instances.
  * **OpenAFOPacks** - A configurable set of oPacks depending on each specific case needs (by default it adds oJob-Common, Kube, Notifications and ElasticSearch).

## How to build the layers

Build an AWS Lambda layers building container:

````
$ docker build -t openaflambdabuilder .
$ docker run -ti --rm -v /mydir:/output openaflambdabuilder
````

If you need specific oPacks different from ElasticSearch, Notifications, Kube and oJob-common you can use the OPACKS argument to specify your own list:

````
$ docker run -ti --rm -v /mydir:/output openaflambdabuilder OPACKS=oJob-common,aws,Mongo
````

Note: please be aware that AWS imposes a maximum limit to the uncompressed size of each layer.

## How to add/update the layers

On your target AWS region, select the Layers screen and create a new layer or click on an existing one to update it.

*Note: if you update you will need, for each AWS Lambda function, to update the corresponding layer ARN. You should only delete an old version when you are sure that no AWS Lambda functions are using that versions ARN.*

## How to create an OpenAF AWS Lambda function

### Hello World examples

#### OpenAF

````javascript
// Receives a map with a name
var name = _$(__pmIn.name).default("world"); // default to world if not provided
__pmOut.Hello = name + "!";
````

#### oJob

````yaml
# Receives a map with a name
todo:
  - Hello world!

ojob:
  sequential: true
  conAnsi   : false   # disable any ansi processing, not needed and faster

jobs:
  - name: Hello world!
    exec: |
      args.name = _$(args.name).default("world"); // default to world if not provided
      __pm.Hello = args.name + "!";
````

### Handling arguments and output

In a plain OpenAF script:
* the map input will be available in the global variables __pmIn and __pm.
* the map output will be sent based on the global variables __pmOut or __pm.

In an oJob yaml/json definition:
* the map input will be available in the global variables __pmIn, __pm and args.
* the map output will be sent based on the global variables __pmOut or __pm.

### Using the GUI

1. Go to the AWS Lambda create function screen (author from scratch), specify the name you want and select on Runtime: Custom runtime / Provide your own bootstrap.
2. After creation select layers.
3. On the layers panel add, using each layer ARN identified, the three generated layers by merge order: (1) minijvm, (2) OpenAF and (3) OpenAFOpacks.
4. Click on the function name where you clicked to select layers on step 2.
5. On the function code panel you can delete all default files and add your own OpenAF js file(s) or yaml file(s).
6. On the handler field write the name of the openaf script (e.g. myscript.js) or ojob yaml/json (e.g. myojob.yaml OR myojob.json).
7. Fill out any other panels needed (e.g. network, tags, environment variables, etc...).
8. On "Basic settings" you will need to test how much memory and timeout you need for your script/ojob. Depending on the case you might have to increase to 256MB and 5 seconds timeout, for example.
9. And you are set to test and run it.

### Using the AWS CLI

*tbc*

### Acessing AWS Lambda environment variables 

You can get a list with getEnvs() or access it directly:

````javascript
getEnv("AWS_LAMBDA_FUNCTION_MEMORY_SIZE");
getEnv("AWS_SECRET_ACCESS_KEY");
getEnv("AWS_DEFAULT_REGION");
getEnv("AWS_LAMBDA_LOG_GROUP_NAME");
getEnv("AWS_SESSION_TOKEN");
getEnv("AWS_ACCESS_KEY_ID");
getEnv("AWS_REGION");
getEnv("AWS_LAMBDA_LOG_STREAM_NAME");
getEnv("AWS_LAMBDA_FUNCTION_NAME");
````

## How to create an OpenAF AWS Lambda container

1. Use the output _Dockerfile_ and zip files to build the base container.
2. Extend the Dockerfile image by copying your code and artifacts to /var/task on the _Dockerfile_
3. Add, on the CMD override, the main handler (e.g. main.js or main.yaml or alike).
