// Author: Helder Marques
// EventBridge Scheduler minimal state toggle helper (corrected).
//
// Public API:
//   AWS.SCHEDULER_EnableSchedule(aRegion, aName, aOptions?)
//   AWS.SCHEDULER_DisableSchedule(aRegion, aName, aOptions?)
//
// aOptions (all optional):
//   {
//     groupName: "default",        // Scheduler group
//     clientToken: "idempotency",  // Provide to control idempotency; auto-generated if absent
//     verify: true|false           // If true performs a second Get to confirm final state (adds VerifiedState)
//   }


loadLib("aws_core.js");

/**
 * <odoc>
 * <key>AWS.SCHEDULER_GetSchedule(aRegion, aName, aGroupName) : Map</key>
 * Retrieves an EventBridge Scheduler schedule.\
 * aRegion optional (defaults to this.region).\
 * aName required.\
 * aGroupName optional (if omitted, default group is assumed).\
 * Returns the raw response or { error: ... }.\
 * </odoc>
 */
AWS.prototype.SCHEDULER_GetSchedule = function(aRegion, aName, aGroupName) {
  aRegion    = _$(aRegion, "aRegion").isString().default(this.region);
  aName      = _$(aName, "aName").isString().$_("Please provide a schedule name.");
  aGroupName = _$(aGroupName, "aGroupName").isString().default(void 0);

  try {
    var url = "https://scheduler." + aRegion + ".amazonaws.com/schedules/" + encodeURIComponent(aName);
    if (isDef(aGroupName)) url += "?groupName=" + encodeURIComponent(aGroupName);

    var pre = this.restPreActionAWSSign4({
      region: aRegion,
      service: "scheduler",
      contentType: "application/json; charset=utf-8"
    });

    var res = $rest({ preAction: pre }).get(url);
    if (res && res.error) return res;
    return res;
  } catch(e) {
    return { error: String(e) };
  }
};

// Internal whitelist, UpdateSchedule requires resending mandatory fields (FlexibleTimeWindow, Target, ScheduleExpression). 
AWS.prototype.__SCHEDULER_FIELD_WHITELIST = {
  required: [
    "FlexibleTimeWindow",
    "Target",
    "ScheduleExpression"
  ],
  optional: [
    "ScheduleExpressionTimezone",
    "Description",
    "StartDate",
    "EndDate",
    "KmsKeyArn",
    "GroupName",
    "RetryPolicy",
    "DeadLetterConfig"
  ]
};

// Internal: helper function to build UpdateSchedule body
AWS.prototype.__SCHEDULER_buildUpdateBody = function(existing, newState, clientToken) {
  if (!isMap(existing)) return { error: "Invalid existing schedule object." };

  var wl = this.__SCHEDULER_FIELD_WHITELIST;
  var body = { State: newState, ClientToken: clientToken };

  for (var i = 0; i < wl.required.length; i++) {
    var f = wl.required[i];
    if (isUnDef(existing[f])) return { error: "Missing required field in existing schedule: " + f };
    body[f] = existing[f];
  }
  for (var j = 0; j < wl.optional.length; j++) {
    var of = wl.optional[j];
    if (isDef(existing[of])) body[of] = existing[of];
  }
  return body;
};

// Internal: PUT UpdateSchedule call
AWS.prototype.__SCHEDULER_putUpdate = function(region, name, groupName, body) {
  var url = "https://scheduler." + region + ".amazonaws.com/schedules/" + encodeURIComponent(name);
  if (isDef(groupName)) url += "?groupName=" + encodeURIComponent(groupName);

  var pre = this.restPreActionAWSSign4({
    region: region,
    service: "scheduler",
    contentType: "application/json; charset=utf-8"
  });

  return $rest({ preAction: pre }).put(url, body);
};

// Internal: Orchestrate state change
AWS.prototype.__SCHEDULER_setState = function(aRegion, aName, aState, aOptions) {
  aRegion  = _$(aRegion, "aRegion").isString().default(this.region);
  aName    = _$(aName, "aName").isString().$_("Please provide a schedule name.");
  aState   = _$(aState, "aState").isString().$_("Please provide a state (ENABLED|DISABLED).");
  aOptions = _$(aOptions, "aOptions").isMap().default({});

  var groupName   = _$(aOptions.groupName, "aOptions.groupName").isString().default(void 0);
  var clientToken = _$(aOptions.clientToken, "aOptions.clientToken").isString().default(genUUID());
  var verify      = _$(aOptions.verify, "aOptions.verify").isBoolean().default(false);

  aState = aState.toUpperCase();
  if (["ENABLED", "DISABLED"].indexOf(aState) < 0) {
    return { error: "Invalid state. Use ENABLED or DISABLED." };
  }

  // GET existing schedule definition
  var existing = this.SCHEDULER_GetSchedule(aRegion, aName, groupName);
  if (existing && existing.error) return existing;

  // Build body
  var body = this.__SCHEDULER_buildUpdateBody(existing, aState, clientToken);
  if (body.error) return body;

  try {
    // PUT update call 
    var upd = this.__SCHEDULER_putUpdate(aRegion, aName, groupName, body);
    if (upd && upd.error) return upd;

    var result = {
      ScheduleArn: upd.ScheduleArn,
      RequestedState: aState
    };

    // Optional verification GET
    if (verify) {
      var after = this.SCHEDULER_GetSchedule(aRegion, aName, groupName);
      if (after && after.error) {
        result.VerifyError = after.error;
      } else {
        result.VerifiedState = after.State;
      }
    }
    return result;
  } catch(e) {
    return { error: String(e) };
  }
};

/**
 * <odoc>
 * <key>AWS.SCHEDULER_EnableSchedule(aRegion, aName, aOptions) : Map</key>
 * Enables an EventBridge Scheduler schedule.\
 * aRegion optional (defaults to this.region).\
 * aName required.\
 * aOptions optional map: { groupName, clientToken, verify }.\
 * Returns { ScheduleArn, RequestedState, (VerifiedState?) } or { error: ... }.\
 * </odoc>
 */
AWS.prototype.SCHEDULER_EnableSchedule = function(aRegion, aName, aOptions) {
  return this.__SCHEDULER_setState(aRegion, aName, "ENABLED", aOptions);
};

/**
 * <odoc>
 * <key>AWS.SCHEDULER_DisableSchedule(aRegion, aName, aOptions) : Map</key>
 * Disables an EventBridge Scheduler schedule.\
 * aRegion optional (defaults to this.region).\
 * aName required.\
 * aOptions optional map: { groupName, clientToken, verify }.\
 * Returns { ScheduleArn, RequestedState, (VerifiedState?) } or { error: ... }.\
 * </odoc>
 */
AWS.prototype.SCHEDULER_DisableSchedule = function(aRegion, aName, aOptions) {
  return this.__SCHEDULER_setState(aRegion, aName, "DISABLED", aOptions);
};