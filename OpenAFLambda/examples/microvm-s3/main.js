// POST /invoke: supply either numbers or inputKey, and optionally outputKey.
// DATA_BUCKET and DATA_REGION are image configuration, never request parameters.
(function () {
  var event = __pmIn;
  if (!isMap(event)) throw new Error("Expected a JSON object.");
  var fromS3 = isDef(event.inputKey);
  var toS3 = isDef(event.outputKey);
  if (fromS3 === isDef(event.numbers)) {
    throw new Error("Supply exactly one of numbers or inputKey.");
  }
  function checkKey(key, prefix) {
    if (!isString(key) || !(new RegExp("^" + prefix + "/[A-Za-z0-9_-]+\\.json$")).test(key)) {
      throw new Error("Expected " + prefix + "/NAME.json (letters, digits, underscores or hyphens).");
    }
  }
  if (fromS3) checkKey(event.inputKey, "input");
  if (toS3) checkKey(event.outputKey, "output");

  var aws, bucket, region;
  if (fromS3 || toS3) {
    bucket = getEnv("DATA_BUCKET");
    region = getEnv("DATA_REGION");
    if (!bucket || !region) throw new Error("Set DATA_BUCKET and DATA_REGION on the image.");
    loadLib("aws_s3.js");
    // Resolve role credentials during each invocation, including after resume.
    aws = new AWS();
  }
  var input = event;
  if (fromS3) {
    var object = aws.S3_GetObject(region, bucket, event.inputKey);
    if (isMap(object) && isDef(object.error)) throw new Error("S3 input read failed.");
    // The HTTP client may already have decoded an application/json response.
    input = isString(object) ? JSON.parse(object) : object;
  }
  if (!isMap(input) || !isArray(input.numbers) || input.numbers.length === 0) {
    throw new Error("Input must contain a nonempty numbers array.");
  }
  var sum = 0;
  input.numbers.forEach(function (value) {
    if (typeof value !== "number" || !isFinite(value)) throw new Error("Expected finite numbers.");
    sum += value;
  });
  if (!isFinite(sum)) throw new Error("Sum exceeds the supported numeric range.");
  var result = { count: input.numbers.length, sum: sum, average: sum / input.numbers.length };
  if (toS3) {
    var written = aws.S3_PutObject(region, bucket, event.outputKey, JSON.stringify(result), "application/json");
    if (isMap(written) && isDef(written.error)) throw new Error("S3 output write failed.");
    __pmOut = { bucket: bucket, key: event.outputKey, result: result };
  } else {
    __pmOut = result;
  }
})();
