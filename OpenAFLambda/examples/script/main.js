__pmOut = {
  message: "Hello " + _$(__pmIn.name).default("Lambda"),
  requestId: __lambdaContext.awsRequestId,
  remainingTimeMs: __lambdaContext.getRemainingTimeInMillis()
};
