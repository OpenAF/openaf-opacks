// Author: nuno.aguiar@wedotecnologies.com
// USAGE:
//    opack exec Tunnels
//   OR
//    opack exec Tunnels -arg clientXPTO.json
//

// Start
plugin("SSH");
log("Init");

var tunnels;
var filename = "tunnels.json";

// Search for alternative file on arguments
var params = __expr.split(/ +/);
if (params.length > 1) {
   var readNext = false;
   for(i in params) {
      if (params[i] === "") continue;

      if (readNext) {
         filename = params[i];
         readNext = false;
         continue;
      }

      if (params[i].match(/Tunnels/i)) readNext = true;
   }
} else {
   if (params.length == 1 && params[0] !== "") filename = params[0];
}

// Get opack path and determine filepath for the
var packPath = (typeof getOPackPath("Tunnels") === "undefined") ? "" : getOPackPath("Tunnels") + "/";
var tunnelsFile = (packPath + filename).replace(/\\/g, "/");
log("Reading " + tunnelsFile);

// Try to read file
try {
  tunnels = io.readFile(tunnelsFile);
} catch(e) {
  logErr("Can't read " + tunnelsFile);
  java.lang.System.exit(0);
}

// Go from all hosts defined
var sshs = {};
for(hostname in tunnels) {
  var host = tunnels[hostname];

  log("[" + hostname + "] Connecting...");
  sshs[hostname] = new SSH(host.host, host.port, host.user, host.pass, "", true);

  // Go from all tunnels defined
  log("[" + hostname + "] Creating tunnels");
  for(i in host.tunnels) {
     var tunnel = host.tunnels[i];

     // Check if it's a local or remote tunnel and connect
     if(typeof tunnel.localHost === 'undefined') {
       log("[" + hostname + ":" + i + "] " + tunnel.remoteHost + ":" + tunnel.remotePort + " -> local port " + tunnel.localPort);
       sshs[hostname].tunnelLocal(tunnel.localPort, tunnel.remoteHost, tunnel.remotePort);
     } else {
       log("[" + hostname + ":" + i + "] " + tunnel.localHost + ":" + tunnel.localPort + " <- from remote " + host.host + ":" + tunnel.remotePort);
       sshs[hostname].tunnelRemoteBind(tunnel.remoteHost, tunnel.remotePort, tunnel.localHost, tunnel.localPort);
     }
  }
}

// Script won't exit until tunnels or connection is dropped
log("Ready to use.");
log("To exit kill this process (" + java.lang.management.ManagementFactory.getRuntimeMXBean().getName() + ") or Ctrl-C.");
