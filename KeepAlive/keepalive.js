var KEEPALIVE_TIME_INTERVAL = 120000;

plugin("Threads");

var KEEPALIVE = function() {
	this.threads = new Threads();
	this.add(af);
	this.start();
};

KEEPALIVE.prototype.add = function(aAF) {
	if (typeof aAF === 'undefined') aAF = af;
	this.threads.addThread(function() {
		aAF.exec("Ping", {});
	});
	print("KEEPALIVE: Added " + aAF.getURL() + ". Add more with \"keepalive.add(af)\".");
};

KEEPALIVE.prototype.start = function(atInterval) {
	if (isUnDef(atInterval)) atInterval = KEEPALIVE_TIME_INTERVAL;
	this.threads.startWithFixedRate(atInterval);
	print("KEEPALIVE: Started ping every " + (atInterval / 1000) + "s. Don't forget to stop \"keepalive.stop()\" or exit with ^C.");
};

KEEPALIVE.prototype.stop = function() {
	this.threads.stop();
};

var keepalive;
if (isUnDef(getOPackPath("OpenCli"))) {
	print("KEEPALIVE: This oPack works only in conjuction with the OpenCli opack.");
} else {
	keepalive = new KEEPALIVE(KEEPALIVE_TIME_INTERVAL);
}
