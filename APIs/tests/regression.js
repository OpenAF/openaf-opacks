try {
// Run from this opack directory: oaf -f tests/regression.js
// External services are replaced with deterministic test doubles.
ow.loadObj();
function check(actual, expected, message) {
  if (stringify(actual) != stringify(expected)) throw new Error(message + ": " + stringify(actual));
}
var requests = [];
var api = {};
var codes = [0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99];
new Function("exports", "$rest", io.readFileString("apis.js"))(api, function() {
  return { get: function(url, params) {
    requests.push({ url: url, params: params });
    return { hourly: { weathercode: codes }, daily: { weathercode: codes }, current_weather: { weathercode: 1 }, results: { ok: true } };
  }};
});
var hourly = api.OpenMeteo.getHourlyForecast(0, 0);
check(hourly.hourly.weathercode.every(isString), true, "all weather codes must be translated");
api.OpenMeteo.getDailyForecast(12, 34);
api.OpenMeteo.getSunRiseSetByLatLon(12, 34);
api.SunRiseSet.getByLatLog("today", 12, 34);
check(requests.length, 4, "all coordinate helpers complete without geolocation");
check(requests[0].url.indexOf("latitude=0&longitude=0") >= 0, true, "zero coordinates retained");
check(requests[3].params.lng, 34, "longitude retained");
print("PASS APIs regression");
} catch(e) { printErr(e); exit(1); }
