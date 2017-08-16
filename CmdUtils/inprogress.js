/**
 * Builds a graphical representation of a command in progress
 *
 * @param {Number} aSize     The size of the progress slide
 * @param {Number} aSpeed    The animation speed (less is quicker)
 * @param {String} aCharBack The background character (only 1 char)
 * @param {String} aCharPos  The slider string
 * @param {Number} aMode     Either InProgress.MODE_BIDIRECTIONAL or InProgress.MODE_FORWARD or InProgress.MODE_REVERSE
 * @param {String} okString  The string to show after stopping
 * @param {Number} aPadding  A space padding for slide alignment
 */
var InProgress = function(aSize, aSpeed, aCharBack, aCharPos, aMode, okString, aPadding) {
	plugin("Threads");
	plugin("Console");

	this.t = new Threads();
	con = new Console();

	this.charBack   = (isUndefined(aCharBack)) ? "-" : aCharBack;
	this.charPos    = (isUndefined(aCharPos)) ? "o" : aCharPos;
	this.asize      = (isUndefined(aSize)) ? con.getConsoleReader().getTerminal().getWidth() : aSize;
	this.timeToWait = (isUndefined(aSpeed)) ? 20 : aSpeed;
	this.okstring   = (isUndefined(okString)) ? "" : okString;
	this.mode       = (isUndefined(aMode)) ? 0 : aMode;
	this.padding    = (isUndefined(aPadding)) ? 0 : aPadding;
	this.canStop    = false;
}

InProgress.MODE_BIDIRECTIONAL = 0;
InProgress.MODE_FORWARD = 1;
InProgress.MODE_REVERSE = 2;

InProgress.prototype.setCharBack    = function(aCharBack) { this.charBack = aCharBack.substr(0, 1); }
InProgress.prototype.setCharPos     = function(aCharPos)  { this.charPos = aCharPos; }
InProgress.prototype.setSize        = function(aSize)     { this.asize = aSize; }
InProgress.prototype.setTimeToWait  = function(aSpeed)    { this.timeToWait = aSpeed; }
InProgress.prototype.setOKString    = function(okString)  { this.okstring = okString; }
InProgress.prototype.setMode        = function(aMode)     { this.mode = aMode; }
InProgress.prototype.setPadding     = function(aPadding)  { this.padding = aPadding; }
InProgress.prototype.getScreenWidth = function()          { return con.getConsoleReader().getTerminal().getWidth(); }

/**
 * Internal function to check if it can stop
 * @return {Boolean} True if it can stop
 */
InProgress.prototype.checkCanStop = function() {
	return this.canStop;
}

InProgress.prototype.print = function(i) {
	var charpossize = this.charPos.length -2;

	var before = ((i > charpossize) ? repeat(i - charpossize, this.charBack) : "" );
	var on = this.charPos;
	var after = repeat(this.asize - (before.length + on.length), this.charBack);

	printnl("\r" + repeat(this.padding, ' ') + before + on + after);
}

InProgress.prototype.printFinal = function() {
	var s = this.asize - this.okstring.length +1;
	if (s < 0) s = 0;
	print("\r" + this.okstring + repeat(this.padding, ' ') + repeat(s, ' '));	
}

/**
 * Start the slider animation
 *
 */
InProgress.prototype.start = function() {
	var parent = this;
	this.t = new Threads();
	this.t.addThread(function() {
		var stop = parent.checkCanStop();
		var charpossize = parent.charPos.length -2;

		while(!stop) {

			if (parent.mode == InProgress.MODE_BIDIRECTIONAL || parent.mode == InProgress.MODE_FORWARD) {
				for(i = 0; i < parent.asize-1; i++) {
					var before = ((i > charpossize) ? repeat(i - charpossize, parent.charBack) : "" );
					var on = parent.charPos;
					var after = repeat(parent.asize - (before.length + on.length), parent.charBack);

					printnl("\r" + repeat(parent.padding, ' ') + before + on + after);
					if(parent.checkCanStop()) { print("\r" + parent.okstring + repeat(parent.padding, ' ') + repeat(parent.asize - parent.okstring.length +1, ' ')); return; }
					sleep(parent.timeToWait);
				}
			}
			if (parent.mode == InProgress.MODE_BIDIRECTIONAL || parent.mode == InProgress.MODE_REVERSE) {
				for(i = parent.asize-2; i >= 0; i--) {
					var before = ((i > charpossize) ? repeat(i - charpossize, parent.charBack) : "" );
					var on = parent.charPos;
					var after = repeat(parent.asize - (before.length + on.length), parent.charBack);

					printnl("\r" + repeat(parent.padding, ' ') + before + on + after);
					if(parent.checkCanStop()) { print("\r" + parent.okstring + repeat(parent.padding, ' ') + repeat(parent.asize - parent.okstring.length +1, ' ')); return; }
					sleep(parent.timeToWait);
				}
			}
			stop = parent.checkCanStop();
		}
	});
	this.t.startNoWait();
}

/**
 * Stop the slider animation
 *
 */
InProgress.prototype.stop = function() {
	this.canStop = true;
	this.t.stop();
	//this.t.waitForThreads(1000);
	sleep(200);
	print("");
}


// --------------------------------------------
// Example
// --------------------------------------------
//
// var pb = new InProgress();
// pb.setMode(InProgress.MODE_BIDIRECTIONAL);
// pb.setOKString("It's all done!");
// pb.setTimeToWait(20);
// pb.setCharPos("WeDoING");
// pb.setSize(pb.getScreenWidth()-80);
// pb.setPadding(40);

// pb.start();
// sleep(10000);
// pb.stop();
