// Load external JARs
var path = getOPackPath("Docker") || String((new java.io.File("")).getAbsolutePath()).replace(/\\/g, "/");
loadExternalJars(path + "/lib");

// Wrapper for https://github.com/amihaiemil/docker-java-api
//

/**
 * <odoc>
 * <key>Docker.Docker(aRemote, pathToSSL)</key>
 * If no parameters are provided it assumes that /var/run/docker.sock exists otherwise you need to provide aRemote URL and
 * the pathToSSL certificates.
 * </odoc>
 */
var Docker = function(aRemote, pathToSSL) {
   this.remote = aRemote;

   if (isUnDef(this.remote)) {
      this.docker = new Packages.com.amihaiemil.docker.LocalDocker(new java.io.File("/var/run/docker.sock"));
   } else {
      this.docker = new Packages.com.amihaiemil.docker.RemoteDocker(aRemote, pathToSSL);
   }
};

Docker.prototype.__buildObj = function(aObj) {
   return (new Packages.javax.json.Json.createReader(new java.io.StringReader(stringify(aObj, void 0, "")))).readObject();
};

Docker.prototype.__buildArray = function(aObj) {
   return (new Packages.javax.json.Json.createReader(new java.io.StringReader(stringify(aObj, void 0, "")))).readArray();
};

/**
 * <odoc>
 * <key>Docker.getContainers() : Array</key>
 * Returns an array of maps with each available containers info.
 * </odoc>
 */
Docker.prototype.getContainers = function() {
   var r = [];
   var o = this.docker.containers().all();
   while(o.hasNext()) {
      r.push(jsonParse(o.next().toString()));
   }

   return r;
};

/**
 * <odoc>
 * <key>Docker.getObj() : JavaObject</key>
 * Returns the internal Docker java object in use.
 * </odoc>
 */
Docker.prototype.getObj = function() {
   return this.docker;
};

/**
 * <odoc>
 * <key>Docker.ping() : boolean</key>
 * Tries to ping the docker daemon and returns the result.
 * </odoc>
 */
Docker.prototype.ping = function() {
   return this.docker.ping();
};

/**
 * <odoc>
 * <key>Docker.getDiskUsage() : Map</key>
 * Returns a map with docker disk usage information.
 * </odoc>
 */
Docker.prototype.getDiskUsage = function() {
   return jsonParse(this.docker.system().diskUsage());
};

/**
 * <odoc>
 * <key>Docker.getImages() : Array</key>
 * Returns an array with the current list of images in docker.
 * </odoc>
 */
Docker.prototype.getImages = function() {
   var r = [];

   var ii = this.docker.images().iterator();
   while(ii.hasNext()) {
      r.push(jsonParse(ii.next()));
   }

   return r;
};

/**
 * <odoc>
 * <key>Docker.pull(aImage, aTag) : Map</key>
 * Pulls aImage with aTag. If aTag is not provided it defaults to "latest".
 * </odoc>
 */
Docker.prototype.pull = function(aImage, aTag) {
   aTag = _$(aTag).isString().default("latest");

   return jsonParse(this.docker.images().pull(aImage, aTag));
};

/**
 * <odoc>
 * <key>Docker.prune()</key>
 * Tries to prune the current docker images.
 * </odoc>
 */
Docker.prototype.prune = function() {
   return this.docker.images().prune();
};

/**
 * <odoc>
 * <key>Docker.create(aObj) : Map</key>
 * Tries to create a docker container with the provided aObj.
 * (check https://docs.docker.com/engine/api/v1.37/#operation/ContainerCreate for more).\
 * \
 * Example: docker.create({ Cmd: "date", Image: "ubuntu", Env: [ "FOO=bar", "BAZ=quux" ], AttachStdout: true, AttachStderr: true })\
 * \
 * </odoc>
 */
Docker.prototype.create = function(aContainer) {
   return this.docker.containers().create(this.__buildObj(aContainer));
};

/**
 * <odoc>
 * <key>Docker.getContainer(aId) : JavaObject</key>
 * Returns the aId corresponding container JavaObject.
 * </odoc>
 */
Docker.prototype.getContainer = function(aId) {
   var o = this.docker.containers().all();
   while(o.hasNext()) {
      var c = o.next();
      if (c.containerId() == aId) return c;
   }

   return void 0;
};

/**
 * <odoc>
 * <key>Docker.start(aId)</key>
 * Tries to start the aId corresponding container.
 * </odoc>
 */
Docker.prototype.start = function(aId) {
   this.getContainer(aId).start();
};

/**
 * <odoc>
 * <key>Docker.stop(aId)</key>
 * Tries to stop the aId corresponding container.
 * </odoc>
 */
Docker.prototype.stop = function(aId) {
   this.getContainer(aId).stop();
};

/**
 * <odoc>
 * <key>Docker.restart(aId)</key>
 * Tries to restart the aId corresponding container.
 * </odoc>
 */
Docker.prototype.restart = function(aId) {
   this.getContainer(aId).restart();
};

/**
 * <odoc>
 * <key>Docker.kill(aId)</key>
 * Tries to kill the aId corresponding container.
 * </odoc>
 */
Docker.prototype.kill = function(aId) {
   this.getContainer(aId).kill();
};

/**
 * <odoc>
 * <key>Docker.remove(aId)</key>
 * Tries to remove the aId corresponding container.
 * </odoc>
 */
Docker.prototype.remove = function(aId) {
   this.getContainer(aId).remove();
};

/**
 * <odoc>
 * <key>Docker.logs(aId) : JavaObject</key>
 * Returns the aId corresponding container logs Java Object.
 * </odoc>
 */
Docker.prototype.logs = function(aId) {
   return this.getContainer(aId).logs();
};