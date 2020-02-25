# Docker oPack

Wrapper to access local or remote docker functionality using the [docker-java-api](https://github.com/amihaiemil/docker-java-api) library.

## Install

With OpenAF installed:

````bash
opack install docker
````

You can test the installation on openaf-console:

````javascript
> loadLib("docker.js");
> var docker = new Docker();
> docker.listImages();
````

## Using the Docker oPack in a docker container

````sh
docker run -ti -e OPACKS=Docker -v /var/run/docker.sock:/var/run/docker.sock --rm openaf/openaf:nightly
````

## Examples

### Creating and running a docker container

````javascript
loadLib("docker.js");
var docker = new Docker();

var container = docker.create({
    Cmd: [ "/openaf/openaf", "-h" ],
    Image: "openaf/openaf",
    Env: [ ],
    AttachStdout: true,
    AttachStderr: true
});

docker.start(container.Id);
print(docker.logs(container.Id));
docker.remove(container.Id);
````

### Mouting a bind volume when creating a docker container

````javascript
loadLib("docker.js");
var docker = new Docker();

var container = docker.create({
    Image: "openaf/openaf",
    Env: [ "OJOB=/ojob/main.yaml" ],
    AttachStdout: true,
    AttachStderr: true,
    Binds: [ "/my/source/dir:/ojob" ]
});

docker.start(container.Id);
print(docker.logs(container.Id));
docker.remove(container.Id);
````