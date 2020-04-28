// Author: Nuno aguiar
// EC2

loadLib("aws_core.js");

/**
 * <odoc>
 * <key>AWS.EC2_getInternalInfo(allVersions) : Map</key>
 * Retrieves the internal meta-data info from within an EC2 instance. Optionally if allVersions = true
 * all available versions of meta-data info will be retrieved.
 * </odoc>
 */
AWS.prototype.EC2_getInternalInfo = function(allVersions) {
   ow.loadObj();
   var res = {}, cpath = "/";

   var fn = (path, e) => {
      path = path.replace(/\/+/g, "/");
      var isV = false; 
      if (!path.endsWith("/")) isV = true; 

      var r = $rest().get("http://169.254.169.254" + path);
      if (isV) return r;
      if (isString(r)) {
         return r.split(/\n/);   
      } else {
         return r;
      }
   };

   var versions;
   if (!allVersions) 
      versions = [ "latest" ];
   else
      versions = fn(cpath, 9);
  
   if (isMap(versions) && isDef(versions.error)) throw "Can't access the EC2 internal info (are you running inside an EC2 instance?)";

   for(var vv in versions) {
      res[versions[vv]] = {
         "meta-data": {},
         "dynamic"  : {}
      };

      for(var yy in res[versions[vv]]) {
         var r = fn(cpath + "" + versions[vv] + "/" + yy + "/", 3);
         if (isMap(r) && isDef(r.error) && r.error.responseCode == 404) { continue; }

         do {
            var p = r.shift();
            var q = fn(cpath + "" + versions[vv] + "/" + yy + "/" + p, 1);

            if (isArray(q)) {
               for(var ii in q) {
                  if (q[ii].indexOf("\n") < 0 && q[ii].endsWith("/")) {
                     r.push(p + q[ii]);
                  } else {
                     var o = fn(cpath + "" + versions[vv] + "/" + yy + "/" + p + "" + q[ii], 2);
                     if (!String(o).match(/^<\?xml/)) 
                        ow.obj.setPath(res[versions[vv]][yy], p.replace(/\/$/, "").replace(/\//g, ".") + "." + q[ii], o);
                     else
                        ow.obj.setPath(res[versions[vv]][yy], p.replace(/\/$/, "").replace(/\//g, "."), q[ii]);
                  }
               }
            } else {
	       ow.obj.setPath(res[versions[vv]][yy], p.replace(/\/$/, "").replace(/\//g, "."), q);
            }
         } while(r.length > 1);
      }

      res[versions[vv]]["user-data"] = fn(cpath + "" + versions[vv] + "/user-data", 0);
   }

   return res;
};