// Author: Nuno Aguiar
// Events

loadLib("aws_core.js");

/**
 * <odoc>
 * <key>AWS.EVENTS_PutEvents(aRegion, aArrayEntries) : Map</key>
 * Puts events from aArrayEntries on the EventBridge of aRegion. Each entry should have:\
 * \
 *    Source       (String)\
 *    DetailType   (String)\
 *    Detail       (String with JSON)\
 *    EventBusName (String)\
 *    Resources    (Array of strings)\
 *    Time         (Number)\
 * \
 * </odoc>
 */
AWS.prototype.EVENTS_PutEvents = function(aRegion, aArrayEntries) {
    aRegion = _$(aRegion).isString().default(this.region);
    aArrayEntries = _$(aArrayEntries).isArray().default([]);
 
    var res = this.post("events", aRegion, void 0, "", {
       Entries: aArrayEntries
    }, {
       "X-Amz-Target": "AWSEvents.PutEvents"
    }, void 0, "application/x-amz-json-1.1");
 
    return res;
 }; 