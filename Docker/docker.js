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
 * <key>Docker.listImages() : Array</key>
 * Returns an array of all the available image tags.
 * </odoc>
 */
Docker.prototype.listImages = function() {
   return $from(this.getImages()).select((r) => { return (r.RepoTags != null) ? r.RepoTags.join(",") : r.RepoDigests.join(",") }).sort();
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
Docker.prototype.containerCreate = function(aContainer) {
   return this.docker.containers().create(this.__buildObj(aContainer));
};

/**
 * <odoc>
 * <key>Docker.containerCreate(aObj) : JavaObject</key>
 * Tries to create a docker container with the provided aObj returning the container java
 * object.
 * </odoc>
 */
Docker.prototype.create = function(aContainer) {
   return jsonParse(this.containerCreate(aContainer));
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
 * <key>Docker.getInfo(aId) : Map</key>
 * Returns a info map for the aID corresponding container.
 * </odoc>
 */
Docker.prototype.getInfo = function(aId) {
   return jsonParse(String(this.getContainer(aId)));
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
 * <key>Docker.containerLogs(aId) : JavaObject</key>
 * Returns the aId corresponding container logs Java Object.
 * </odoc>
 */
Docker.prototype.containerLogs = function(aId) {
   return this.getContainer(aId).logs();
};

/**
 * <odoc>
 * <key>Docker.logs(aId) : String</key>
 * Returns the aID corresponding container logs in string format.
 * </odoc>
 */
Docker.prototype.logs = function(aId) {
   var o = String(this.getContainer(aId).logs()).split(/\n/);
   var r = "";
   for(var ii in o) {
      r += o[ii].substring(8) + "\n";
   }
   return r;
};

/**
 * <odoc>
 * <key>Docker.execCmd(aImage, aCmd, aMapOfEnvs, anExtraConfigMap) : String</key>
 * Tries to execute aCmd (string or array) on aImage docker container with aMapOfEnvs. It
 * will start the container, wait for it to finish, remove the container and return the logs as a string.
 * </odoc>
 */
Docker.prototype.execCmd = function(aImage, aCmd, aEnvs, aExtra) {
   _$(aImage).isString().$_("Please provide a image.");
   _$(aCmd).$_("Please provide a command.");
   aExtra = _$(aExtra).isMap().default({});

   aEnvs = _$(aEnvs).isMap().default({});
   if (!(this.imageExists(aImage))) throw "Image '" + aImage + "' is not available.";
   if (isString(aCmd)) aCmd = String(aCmd).split(/ +/);
   var evs = [];
   if (isMap(aEnvs)) {
      Object.keys(aEnvs).forEach((k) => {
         evs.push(k + "=" + aEnvs[k]);
      });
   }

   var c = this.create(merge({ Cmd: aCmd, Image: aImage, Env: evs, AttachStdout: true, AttachStderr: true }, aExtra));
   this.start(c.Id);
   var state = this.getInfo(c.Id).State;
   if (state == "created" || state == "running") {
      while(state != "exited") {
         state = this.getInfo(c.Id).State;
         sleep(25); 
      }
   }
   var res = this.logs(c.Id);
   this.remove(c.Id);

   return res;
};

/**
 * <odoc>
 * <key>Docker.do(aImage, aCmd, aMapOfEnvs, anExtraConfigMap) : Promise</key>
 * Creates and returns a Promise to execute aCmd (string or array) on aImage docker container
 * with aMapOfEnvs. It will start the container, wait for it to finish, remove the container and pass the logs as a string.
 * </odoc>
 */
Docker.prototype.do = function(aImage, aCmd, aEnvs, aExtra) {
   var parent = this;
   return $do(() => {
      return parent.execCmd(aImage, aCmd, aEnvs, aExtra);
   }); 
};

/**
 * <odoc>
 * <key>Docker.imageExists(aImage) : Boolean</key>
 * Determines if aImage is available or not on the current docker.
 * </odoc>
 */
Docker.prototype.imageExists = function(aImage) {
   return $from(this.getImages())
          .notEquals("RepoTags", null)
          .greaterEquals(["RepoTags.indexOf", aImage], 0)
	  .any();
};