# OpenAF AWS Lambda layers

In order to be able to run serveless AWS Lambda OpenAF scripts and oJobs the current container will build 3 supporting AWS Lambda layers:

  * **MiniJVM** - A small JRE.
  * **OpenAF** - The latest OpenAF runtime with the OpenAF opack to access RAID instances.
  * **OpenAFOPacks** - A configurable set of oPacks depending on each specific case needs (by default it adds oJob-Common, Kube, Notifications and ElasticSearch).

## How to build the layers

Build an AWS Lambda layers building container:

```bash
$ docker build -t openaflambdabuilder .
$ docker run -ti --rm -v $(pwd)/output:/output openaflambdabuilder
```

For ARM64 builds:

```bash
$ docker build -t openaflambdabuilder --platform linux/arm64.
$ docker run -ti --rm -v $(pwd)/output:/output -e arch=aarch64 --platform linux/arm64 openaflambdabuilder
```

If you need specific oPacks different from ElasticSearch, Notifications, Kube and oJob-common you can use the OPACKS argument to specify your own list:

```bash
$ docker run -ti --rm -v $(pwd)/output:/output openaflambdabuilder OPACKS=oJob-common,aws,Mongo
```

Note: please be aware that AWS imposes a maximum limit to the uncompressed size of each layer.

## How to build an AWS Lambda container image

The builder can instead generate a standalone Docker build context. The generated image contains the JRE, OpenAF, the selected oPacks and the OpenAF Lambda custom runtime. It does not require the layer ZIP files.

```bash
$ docker run -ti --rm -v $(pwd)/output:/output openaflambdabuilder MODE=container
$ cd output/container
$ docker build --platform linux/amd64 --provenance=false -t openaf-lambda .
```

Container mode writes `output/container` once and refuses to overwrite it. Set `OUTPUT` to use a different mounted output directory. Replace `function/main.js` with the function code before building. The default `CMD ["main.js"]` can be overridden with a JavaScript handler or an oJob definition:

```bash
$ docker build --platform linux/arm64 --provenance=false \
  --build-arg OPACKS=oJob-common,aws,Mongo \
  --build-arg OPENAFDIST=nightly \
  -t openaf-lambda:arm64 .
$ docker run --rm -p 9000:8080 openaf-lambda
$ curl -sS -X POST http://localhost:9000/2015-03-31/functions/function/invocations \
  -d '{"name":"Lambda"}'
```

Build each image for exactly one architecture: use `linux/amd64` for Lambda `x86_64` functions or `linux/arm64` for Lambda `arm64` functions. `--provenance=false` avoids publishing a multi-manifest image. At execution time the root filesystem is read-only; OpenAF’s mutable home and temporary files are placed under `/tmp`.

To publish manually, substitute your own region, account, repository, tag and execution role:

```bash
$ aws ecr create-repository --repository-name openaf-lambda --region eu-west-1
$ aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin ACCOUNT.dkr.ecr.eu-west-1.amazonaws.com
$ docker tag openaf-lambda ACCOUNT.dkr.ecr.eu-west-1.amazonaws.com/openaf-lambda:latest
$ docker push ACCOUNT.dkr.ecr.eu-west-1.amazonaws.com/openaf-lambda:latest
$ aws lambda create-function --function-name openaf-container \
  --package-type Image \
  --code ImageUri=ACCOUNT.dkr.ecr.eu-west-1.amazonaws.com/openaf-lambda:latest \
  --role arn:aws:iam::ACCOUNT:role/LambdaExecutionRole \
  --architectures x86_64 --region eu-west-1
```

The ECR repository and Lambda function must be in the same region. A Lambda function using ZIP/layer deployment cannot be converted in place to an image deployment; create a separate image-based function.

## How to add/update the layers

On your target AWS region, select the Layers screen and create a new layer or click on an existing one to update it.

*Note: if you update you will need, for each AWS Lambda function, to update the corresponding layer ARN. You should only delete an old version when you are sure that no AWS Lambda functions are using that versions ARN.*

## How to create an OpenAF AWS Lambda function

### Hello World examples

#### OpenAF

```javascript
// Receives a map with a name
var name = _$(__pmIn.name).default("world"); // default to world if not provided
__pmOut.Hello = name + "!";
```

#### oJob

```yaml
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
```

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

```javascript
getEnv("AWS_LAMBDA_FUNCTION_MEMORY_SIZE");
getEnv("AWS_SECRET_ACCESS_KEY");
getEnv("AWS_DEFAULT_REGION");
getEnv("AWS_LAMBDA_LOG_GROUP_NAME");
getEnv("AWS_SESSION_TOKEN");
getEnv("AWS_ACCESS_KEY_ID");
getEnv("AWS_REGION");
getEnv("AWS_LAMBDA_LOG_STREAM_NAME");
getEnv("AWS_LAMBDA_FUNCTION_NAME");
```

## How to create an OpenAF AWS Lambda container

Use container mode above. It produces a complete Docker context with the handler source in `function/`; a separate extension Dockerfile is not needed.
