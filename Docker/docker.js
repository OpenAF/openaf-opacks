// Load external JARs
var path = getOPackPath("Docker") || String((new java.io.File("")).getAbsolutePath()).replace(/\\/g, "/");
loadExternalJars(path + "/lib");

// Wrapper for https://github.com/amihaiemil/docker-java-api
//

/**
 * <odoc>
 * <key>Docker.Docker(aRemote, auth)</key>
 * If no parameters are provided it assumes that /var/run/docker.sock exists otherwise you need to provide aRemote URL and
 * the an auth class.
 * </odoc>
 */
var Docker = function(aRemote, authC) {
   this.remote = aRemote;

   if (isUnDef(this.remote)) {
      this.docker = new Packages.com.amihaiemil.docker.UnixDocker(new java.io.File("/var/run/docker.sock"));
   } else {
      if (isUnDef(authC)) {
         this.docker = new Packages.com.amihaiemil.docker.TcpDocker(new java.net.URI(aRemote));
      } else {
         this.docker = new Packages.com.amihaiemil.docker.TcpDocker(new java.net.URI(aRemote), authC);
      }
   }

   this._useCmdForLogs = false;
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
 * <key>Docker.getNetworks() : Array</key>
 * Returns an array of maps with each available networks info.
 * </odoc>
 */
Docker.prototype.getNetworks = function() {
   var r = []
   var o = this.docker.networks().iterator()
   while(o.hasNext()) {
      r.push(jsonParse(o.next().toString()))
   }

   return r
}

/**
 * <odoc>
 * <key>Docker.getVolumes() : Array</key>
 * Returns an array of maps with each available networks info.
 * </odoc>
 */
 Docker.prototype.getVolumes = function() {
   var r = []
   var o = this.docker.volumes().iterator()
   while(o.hasNext()) {
      r.push(jsonParse(o.next().toString()))
   }

   return r
}


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
 * <key>Docker.getVersion() : Map</key>
 * Returns a map with docker version information.
 * </odoc>
 */
Docker.prototype.getVersion = function() {
   return jsonParse(this.docker.version());
};

/**
 * <odoc>
 * <key>Docker.inspect(aId) : Map</key>
 * Returns an inspect map for the aID corresponding container.
 * </odoc>
 */
Docker.prototype.inspect = function(aId) {
   var res = this.getContainer(aId);
   if (isUnDef(res)) 
      return void 0;
   else
      return jsonParse(String(res.inspect()));
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
 * <key>Docker.create(aObj, aName) : Map</key>
 * Tries to create a docker container (with optional aName) with the provided aObj.
 * (check https://docs.docker.com/engine/api/v1.37/#operation/ContainerCreate for more).\
 * \
 * Example: docker.create({ Cmd: "date", Image: "ubuntu", Env: [ "FOO=bar", "BAZ=quux" ], AttachStdout: true, AttachStderr: true })\
 * \
 * </odoc>
 */
Docker.prototype.containerCreate = function(aContainer, aName) {
   if (isDef(aName) && isString(aName)) {
      return this.docker.containers().create(aName, this.__buildObj(aContainer));
   } else {
      return this.docker.containers().create(this.__buildObj(aContainer));
   }
};

/**
 * <odoc>
 * <key>Docker.containerCreate(aObj, aName) : JavaObject</key>
 * Tries to create a docker container (with optional aName) with the provided aObj returning the container java
 * object.
 * </odoc>
 */
Docker.prototype.create = function(aContainer, aName) {
   return jsonParse(this.containerCreate(aContainer, aName));
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
   var res = this.getContainer(aId);
   if (isUnDef(res)) 
      return void 0;
   else
      return jsonParse(String(res));
};

/**
 * <odoc>
 * <key>Docker.start(aId)</key>
 * Tries to start the aId corresponding container.
 * </odoc>
 */
Docker.prototype.start = function(aId) {
   var c = this.getContainer(aId);
   if (isUnDef(c)) throw("Container " + aId + " not found.");
   c.start();
};

/**
 * <odoc>
 * <key>Docker.stop(aId)</key>
 * Tries to stop the aId corresponding container.
 * </odoc>
 */
Docker.prototype.stop = function(aId) {
   var c = this.getContainer(aId);
   if (isUnDef(c)) throw("Container " + aId + " not found.");
   c.stop();
};

/**
 * <odoc>
 * <key>Docker.restart(aId)</key>
 * Tries to restart the aId corresponding container.
 * </odoc>
 */
Docker.prototype.restart = function(aId) {
   var c = this.getContainer(aId);
   if (isUnDef(c)) throw("Container " + aId + " not found.");
   c.restart();
};

/**
 * <odoc>
 * <key>Docker.waitForNotRunning(aId) : Number</key>
 * Waits for container aId to be "not running". Returns the exit code.
 * </odoc>
 */
Docker.prototype.waitForNotRunning = function(aId) {
   var c = this.getContainer(aId);
   if (isUnDef(c)) throw("Container " + aId + " not found.");
   return c.waitOn("not-running");
};

/**
 * <odoc>
 * <key>Docker.waitForNextExit(aId) : Number</key>
 * Waits for container aId to be "next-exit". Returns the exit code.
 * </odoc>
 */
Docker.prototype.waitForNextExit = function(aId) {
   var c = this.getContainer(aId);
   if (isUnDef(c)) throw("Container " + aId + " not found.");
   return c.waitOn("next-exit");
};

/**
 * <odoc>
 * <key>Docker.waitForRemoved(aId) : Number</key>
 * Waits for container aId to be "removed". Returns the exit code.
 * </odoc>
 */
Docker.prototype.waitForRemoved = function(aId) {
   var c = this.getContainer(aId);
   if (isUnDef(c)) throw("Container " + aId + " not found.");
   return c.waitOn("removed");
};

/**
 * <odoc>
 * <key>Docker.kill(aId)</key>
 * Tries to kill the aId corresponding container.
 * </odoc>
 */
Docker.prototype.kill = function(aId) {
   var c = this.getContainer(aId);
   if (isUnDef(c)) throw("Container " + aId + " not found.");
   c.kill();
};

/**
 * <odoc>
 * <key>Docker.remove(aId)</key>
 * Tries to remove the aId corresponding container.
 * </odoc>
 */
Docker.prototype.remove = function(aId) {
   var c = this.getContainer(aId);
   if (isUnDef(c)) throw("Container " + aId + " not found.");
   c.remove();
};

/**
 * <odoc>
 * <key>Docker.containerLogs(aId) : JavaObject</key>
 * Returns the aId corresponding container logs Java Object.
 * </odoc>
 */
Docker.prototype.containerLogs = function(aId) {
   var c = this.getContainer(aId);
   if (isUnDef(c)) return void 0;
   return c.logs();
};

/**
 * <odoc>
 * <key>Docker.logs(aId, aPrefix) : String</key>
 * Returns the aID corresponding container logs in string format.
 * </odoc>
 */
Docker.prototype.logs = function(aId, aPrefix) {
   var c = this.getContainer(aId);
   aPrefix = _$(aPrefix, "prefix").isString().default("");

   if (isDef(c)) {
      var o = String(c.logs().fetch()).split(/\n/);
      var r = "";
      for(var ii in o) {
         r += aPrefix + o[ii] + "\n";
      }
      return r.substring(0, r.length-1); 
   } else {
      return void 0;
   }
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

/**
 * <odoc>
 * <key>Docker.extraBind(aExtraMap, aBindExpression) : Map</key>
 * Utility function to add a bind expression (e.g. "/host/folder:/container/folder:rw") to 
 * aExtraMap to be used with create container. Returns the modify aExtraMap.
 * </odoc>
 */
Docker.prototype.extraBind = function(aExtra, aBindExpression) {
   if (isUnDef(aExtra)) aExtra = {};
   if (isUnDef(aExtra.Binds) || (!(isArray(aExtra.Binds)))) aExtra.Binds = [];
   aExtra.Binds.push(aBindExpression);

   return aExtra;
};

/**
 * <odoc>
 * <key>Docker.extraNetwork(aExtraMap, aNetwork) : Map</key>
 * Utility function to add a network to aExtraMap to be used with create container.
 * Returns the modify aExtraMap.
 * </odoc>
 */
Docker.prototype.extraNetwork = function(aExtra, aNetwork) {
   if (isUnDef(aExtra)) aExtra = {};
   if (isUnDef(aExtra.NetworkingConfig) || (!(isArray(aExtra.NetworkingConfig)))) aExtra.NetworkingConfig = {};
   if (isUnDef(aExtra.NetworkingConfig.EndpointsConfig) || (!(isMap(aExtra.NetworkingConfig.EndpointsConfig)))) aExtra.NetworkingConfig.EndpointsConfig = {};
   
   args.extra.NetworkingConfig.EndpointsConfig[aNetwork] = {};

   return aExtra;
};

/**
 * <odoc>
 * <key>Docker.runOJob(args)</key>
 * Tries to run an oJob in an openaf docker image with the provided args maps. The args map expects:\
 * \
 *    image            (String)  The openaf image to use (defaults to openaf/openaf:nightly)\
 *    shouldWait       (String)  A boolean string to determine if it should wait for the container execution end (defaults to "true")\
 *    shouldRemove     (String)  A boolean string to determine if the container should be remove after execution end (defaults to "true")\
 *    shouldShowLogs   (String)  A boolean string to determine if the logs of container execution should be output\
 *    shouldLog        (String)  A boolean string to determine if the logs of container execution should be made available on args.logs (defaults to "false")\
 *    envs             (Map)     A map of environment variables for container execution\
 *    binds            (Array)   Array of strings in the form "localPath:dockerPath" or "volumeName:dockerPath" to use\
 *    cmd              (String)  An optional command string\
 *    hostname         (String)  An optional hostname to use\
 *    domainname       (String)  An optional domain name to use\
 *    user             (String)  Optional user that commands are run as inside the container\
 *    healthcheck      (Map)     A map with { Test: ["cmd1", "cmd2", ...], Interval: 123, Timeout: 123, Retries: 3, StartPeriod: 123 }\
 *    exposedPorts     (Map)     A map of { "&lt;port&gt;/&lt;tcp|udp|sctp&gt;": {} }\
 *    volumes          (Map)     A map of volumes to use\
 *    workingDir       (String)  The working directory for commands to run in\
 *    entrypoint       (String)  The entry point for the container as a string or an array of strings\
 *    networkDisabled  (Boolean) Disable networking for the container\
 *    macAddress       (String)  A MAC address of the container\
 *    labels           (Map)     Optional labels\
 *    stopSignal       (String)  Signal to stop a container as a string or unsigned integer\
 *    stopTimeout      (Number)  Timeout to stop a container in second\
 *    hostConfig       (Map)     The container host config (see Docker's ContainerCreate documentation)\
 *    networkingConfig (Map)     The container networking config (see Docker's ContainerCreate documentation)\
 *    ojob             (String)  The full path to the ojob to execute on the container\
 *    name             (String)  The container name\
 *    nameSuffix       (String)  A boolean string to determine if the container name should be suffixed with nowUTC()\
 * \
 * </odoc>
 */
Docker.prototype.runOJob = function(args) {
   // Argument checking
   args.image          = _$(args.image, "image").default("openaf/openaf:nightly");
   args.shouldWait     = _$(args.shouldWait, "shouldWait").default("true");
   args.shouldRemove   = _$(args.shouldRemove, "shouldRemove").default("true");
   args.shouldShowLogs = _$(args.shouldShowLogs, "shouldShowLogs").default("true");
   args.shouldLog      = _$(args.shouldLog, "shouldLog").default("true");
   _$(args.ojob, "ojob").$_();
   args.envs   = _$(args.envs, "envs").isMap().default({});

   // Set oJob
   args.envs.OJOB = args.ojob;

   // Prepare envs
   var envs = [];
   Object.keys(args.envs).forEach(k => {
      envs.push(k + "=" + args.envs[k]);
   });

   // Go
   var origName = String(args.name);
   if (isDef(args.nameSuffix) && String(args.nameSuffix).toLowerCase() == "true") {
      args.name = args.name  + "-" + String(nowUTC());
   }
   var container = this.create({
         Image           : args.image,
         Env             : envs,
         AttachStdout    : true,
         AttachStderr    : true,
         Binds           : args.binds,
         Cmd             : args.cmd,
         Hostname        : args.hostname,
         Domainname      : args.domainname,
         User            : args.user,
         Healthcheck     : args.healthcheck,
         ExposedPorts    : args.exposedPorts,
         Volumes         : args.volumes,
         WorkingDir      : args.workingDir,
         Entrypoint      : args.entrypoint,
         NetworkDisabled : args.networkDisabled,
         MacAddress      : args.macAddress,
         Labels          : args.labels,
         StopSignal      : args.stopSignal,
         StopTimeout     : args.stopTimeout,
         HostConfig      : args.hostConfig,
         NetworkingConfig: args.networkingConfig
   }, args.name);
   this.start(container.Id);

   if(isDef(args.useCmdForLogs)) this._useCmdForLogs = args.useCmdForLogs;

   // Wait for it
   if (String(args.shouldWait).toLowerCase() == "true") {
      var info;
      if (String(args.shouldShowLogs).toLowerCase() == "true") {
	if (this._useCmdForLogs) {
	 $sh("docker logs -f " + container.Id)
	 .prefix(origName)
	 .get(0);
	} else {
         info = this.getInfo(container.Id);
         if (isDef(info)) {
            var state = info.State;
            if (state == "created" || state == "running") {
               var logPos = 0, tmp = "";
               while (isDef(info) && state != "exited") {
                  info = this.getInfo(container.Id);
                  if (isDef(info)) {
                     state = info.State;
                     
                     try { tmp = String(this.logs(container.Id, "[" + origName + "] ")); } catch(e) { sprintErr(e) };
                     if (isDef(tmp) && tmp.length > 0) {
                        if ((tmp.length - 1) > logPos) printnl(tmp.substr(logPos));
                        logPos = tmp.length - 1;
                     }
                     
                     sleep(500, true);
                  }
               }
            }
         }
	}
      } 
      this.waitForNotRunning(container.Id);
      info = this.getInfo(container.Id);

      // Done with it
      if (isDef(info)) {
         if (String(args.shouldLog).toLowerCase() == "true")    {
	    if (this._useCmdForLogs) {
		args.logs = $sh("docker logs " + container.Id).get(0).stdout;
	    } else {
            	try { args.logs = String(this.containerLogs(container.Id).fetch()); } catch(e) { sprintErr(e); };
            }
	 }
         if (String(args.shouldRemove).toLowerCase() == "true") this.remove(container.Id);
      } else {
         throw "Container no longer found.";
      }

      return {
         id: container.Id,
         logs: args.logs,
         info: info
      };
   }
};

/**
 * <odoc>
 * <key>Docker.runContainer(args)</key>
 * Tries to run an oJob in an openaf docker image with the provided args maps. The args map expects:\
 * \
 *    image            (String) The openaf image to use (defaults to openaf/openaf:nightly)\
 *    shouldWait       (String) A boolean string to determine if it should wait for the container execution end (defaults to "true")\
 *    shouldRemove     (String) A boolean string to determine if the container should be remove after execution end (defaults to "true")\
 *    shouldShowLogs   (String) A boolean string to determine if the logs of container execution should be output\
 *    shouldLog        (String)  A boolean string to determine if the logs of container execution should be made available on args.logs (defaults to "false")\* 
 *    envs             (Map)    A map of environment variables for container execution\
 *    binds            (Array)  Array of strings in the form "localPath:dockerPath" or "volumeName:dockerPath" to use\
 *    cmd              (String) An optional command string\
 *    hostname         (String)  An optional hostname to use\
 *    domainname       (String)  An optional domain name to use\
 *    user             (String)  Optional user that commands are run as inside the container\
 *    healthcheck      (Map)     A map with { Test: ["cmd1", "cmd2", ...], Interval: 123, Timeout: 123, Retries: 3, StartPeriod: 123 }\
 *    exposedPorts     (Map)     A map of { "&lt;port&gt;/&lt;tcp|udp|sctp&gt;": {} }\
 *    volumes          (Map)     A map of volumes to use\
 *    workingDir       (String)  The working directory for commands to run in\
 *    entrypoint       (String)  The entry point for the container as a string or an array of strings\
 *    networkDisabled  (Boolean) Disable networking for the container\
 *    macAddress       (String)  A MAC address of the container\
 *    labels           (Map)     Optional labels\
 *    stopSignal       (String)  Signal to stop a container as a string or unsigned integer\
 *    stopTimeout      (Number)  Timeout to stop a container in second\
 *    hostConfig       (Map)     The container host config (see Docker's ContainerCreate documentation)\
 *    networkingConfig (Map)     The container networking config (see Docker's ContainerCreate documentation)\ 
 *    name             (String) The container name\
 *    nameSuffix       (String) A boolean string to determine if the container name should be suffixed with nowUTC()\
 * \
 * </odoc>
 */
Docker.prototype.runContainer = function(args) {
   // Argument checking
   args.image          = _$(args.image, "image").default("openaf/openaf:nightly");
   args.shouldWait     = _$(args.shouldWait, "shouldWait").default("true");
   args.shouldRemove   = _$(args.shouldRemove, "shouldRemove").default("true");
   args.shouldShowLogs = _$(args.shouldShowLogs, "shouldShowLogs").default("true");
   args.shouldLog      = _$(args.shouldLog, "shouldLog").default("true");
   args.envs   = _$(args.envs, "envs").isMap().default({});

   // Prepare envs
   var envs = [];
   Object.keys(args.envs).forEach(k => {
      envs.push(k + "=" + args.envs[k]);
   });

   // Go
   var origName = String(args.name);
   if (isDef(args.nameSuffix) && String(args.nameSuffix).toLowerCase() == "true") {
      args.name = args.name  + "-" + String(nowUTC());
   }
   var container = this.create({
         Image           : args.image,
         Env             : envs,
         AttachStdout    : true,
         AttachStderr    : true,
         Binds           : args.binds,
         Cmd             : args.cmd,
         Hostname        : args.hostname,
         Domainname      : args.domainname,
         User            : args.user,
         Healthcheck     : args.healthcheck,
         ExposedPorts    : args.exposedPorts,
         Volumes         : args.volumes,
         WorkingDir      : args.workingDir,
         Entrypoint      : args.entrypoint,
         NetworkDisabled : args.networkDisabled,
         MacAddress      : args.macAddress,
         Labels          : args.labels,
         StopSignal      : args.stopSignal,
         StopTimeout     : args.stopTimeout,
         HostConfig      : args.hostConfig,
         NetworkingConfig: args.networkingConfig         
   }, args.name);
   this.start(container.Id);

   if(isDef(args.useCmdForLogs)) this._useCmdForLogs = args.useCmdForLogs;

   // Wait for it
   if (String(args.shouldWait).toLowerCase() == "true") {
      var info;
      if (String(args.shouldShowLogs).toLowerCase() == "true") {
        if (this._useCmdForLogs) {
         $sh("docker logs -f " + container.Id)
         .prefix("origName")
	 .get(0);
	} else {
         info = this.getInfo(container.Id);
         if (isDef(info)) {
            var state = info.State;
            if (state == "created" || state == "running") {
               var logPos = 0, tmp = "";
               while(isDef(info) && state != "exited") {
                  info = this.getInfo(container.Id);
                  if (isDef(info)) {
                     state = info.State;
                  
                     try { tmp = String(this.logs(container.Id, "[" + origName + "] ")); } catch(e) { sprintErr(e); }
                     if (isDef(tmp) && tmp.length > 0) {
                        if ((tmp.length-1) > logPos) printnl(tmp.substr(logPos));
                        logPos = tmp.length-1;
                     } 
                     
                     sleep(500, true); 
                  }
               }
            }
         }
        }
      } 
      this.waitForNotRunning(container.Id);
      info = this.getInfo(container.Id);

      // Done with it
      if (isDef(info)) {
         if (String(args.shouldLog).toLowerCase() == "true") {
	    if (this._useCmdForLogs) {
		args.logs = $sh("docker logs " + container.Id).get(0).stdout;
	    } else {
	    	try { args.logs = String(this.containerLogs(container.Id).fetch()); } catch(e) { sprintErr(e); };
	    }
	 }
         if (String(args.shouldRemove).toLowerCase() == "true") this.remove(container.Id);
      } else {
         throw "Container no longer found.";
      }

      return {
         id: container.Id,
         logs: args.logs,
         info: info
      };
   }
};
