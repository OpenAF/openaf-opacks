# oPackServer

oPackServer is a simple private opack server that will serve opacks from a provided folder. These opacks can be in the form of opack files or folders. It can be useful to add your own private opacks or to act as an internal opack central server in networks without internet access (you can copy the public opacks you need to it).

## Install it as a docker container

### Build the container

To build the container:

````bash
docker build -t opackserver .
````

To run the container:

````bash
docker run -ti -p 8090:8090 -p 8100:8100 -v /my/opacks/folder:/data opackserver -e OPACKSERVER_INITRELOAD='true' -e OPACKSERVER_URL='http://my.server:8090'
````

You can change the default behaviour by adding/changing the following environment variables either from the command-line or on the Dockerfile:

````dockerfile
# Where the opack.db and opacks folder is located in the container
ENV OPACKSERVER_PATH /data
# The external endpoint on which the opack content will be available
ENV OPACKSERVER_URL http://127.0.0.1:8090
# Don't reload opack.db on startup
ENV OPACKSERVER_INITRELOAD false
````

Note: If you have more than one opackserver container only one should have the OPACKSERVER_INITRELOAD variable to true or all at false and you provide the reload command manually as detailed below.

## Install it as an oJob

After installing this opack simply execute:

````bash
opack exec oPackServer OPACKSERVER_INITRELOAD=true  OPACKSERVER_URL=http://127.0.0.1:8090 OPACKSERVER_PATH=/my/opacks/folder
````

## Operating

The folder OPACKSERVER_PATH should contain an "opacks" sub-folder (if it doesn't exist it will be created) where you can add either .opack files or opack folders. 

The port 8090 (PORT in the main.yaml if running outside a container) will serve any files under the OPACKSERVER_PATH/opacks sub-folder and OPACKSERVER_PATH/.opack.db.

The port 8100 (MPORT in the main.yaml if running outside a container) will server the "/ops" OpenAF channel for operational/managements proposes.

During startup if OPACKSERVER_INITRELOAD is defined as true (defaults to false) the oPackServer will perform a reload operation (detailed below).

### Reload

The reload operation scans the opacks sub-folder and builds an opack central database in OPACKSERVER_PATH/opack.db. The .package.yaml/json of each .opack file or opack folder will be changed so the repository url points to right URL to download the package from this server (using the provided OPACKSERVER_URL).

### Using the ops channel

To use the ops channel remotely connect to it:

````javascript
> $ch("ops").createRemote("http://ops:ops@my.server:8100/ops");
````

Note: you can change the main.yaml to add your own authentication & authorization mechanism for the ops channel.

#### Reload operation

Execute the reload operation on demand:

````javascript
> $ch("ops").set({ op: "reload" }, {});
````

## Using it from OpenAF

On OpenAF on newer versions you can simply execute or add to your **[home folder]/.openaf_profile**:

````javascript
addOPackRemoteDB("http://my.server:8090/opack.db");
````

On older versions (<= 20181225) you will need to manually add it to the internal __opackCentral array.

Now you can execute any opack command and it will use your private opack repository.