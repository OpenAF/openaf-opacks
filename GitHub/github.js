/**
 * <odoc>
 * <key>GitHub.GitHub(aRepo) : GitHub</key>
 * GitHub constructor for a specific aRepo.
 * </odoc>
 */
var GitHub = function(aRepo) {
    this.repo = aRepo;
};
 
/**
 * <odoc>
 * <key>GitHub.getReleases() : Array</key>
 * Retrieves the public releases.
 * </odoc>
 */
GitHub.prototype.getReleases = function() {
    var o = $rest().get("https://api.github.com/repos/" + this.repo + "/releases");

    return o;
};

/**
 * <odoc>
 * <key>GitHub.getReleasesURLs() : Array</key>
 * Retrieves a list of maps with each release url.
 * </odoc>
 */
GitHub.prototype.getReleasesURLs = function() {
    var ar = [];
    this.getReleases(this.repo).map(y => { 
        y.assets.map(r => {
            ar.push({ 
                mname: y.name, 
                date: y.published_at, 
                name: r.name, 
                url: r.browser_download_url 
            });
        });
    });      
    return ar;
};

/**
 * <odoc>
 * <key>GitHub.getBranches() : Array</key>
 * Retrieves a list of branche names.
 * </odoc>
 */
GitHub.prototype.getBranches = function() {
    var o = $rest().get("https://api.github.com/repos/" + this.repo + "/branches");

    return o.map(r => r.name);
};

/**
 * <odoc>
 * <key>GitHub.getTags() : Array</key>
 * Retrieves a list of branche names.
 * </odoc>
 */
GitHub.prototype.getTags = function() {
    var o = $rest().get("https://api.github.com/repos/" + this.repo + "/tags");

    return o.map(r => r.name);
};