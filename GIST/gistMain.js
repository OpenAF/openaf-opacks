var GIST_FILE = (getOPackPath("GIST") || ".") + "/.gist.yaml";
loadLib("gist.js");

// Verify GIST access
var gist;
if (!io.fileExists(GIST_FILE)) {
    var gistFile = {
        user: "Your GitHub user",
        token: "Your GitHub token"
    };
    io.writeFileYAML(GIST_FILE, gistFile);
    throw "Please complete " + GIST_FILE + " with your GitHub details to access GISTs";
} else {
    var creds = io.readFileYAML(GIST_FILE);
    gist = new GIST({ user: creds.user, token: creds.token });
}

var params = __expr.split(/ +/);
if (isDef(gist)) {
    var showList = true;
    if (isDef(params[0]) && params[0].length == 32 &&
        isDef(params[1]) && params[1].length > 0) {
        showList = false;
        var out = gist.getClip(params[0], params[1]);
        if (isObject(out)) sprint(out); else print(out);
    }

    if (showList) {
        $from(gist.getClips()).select((r) => {
            for(let i in r.files) {
                tprint("{{id}} {{file}} ", merge(r, { file: r.files[i] }));
            }
        });
    }
}