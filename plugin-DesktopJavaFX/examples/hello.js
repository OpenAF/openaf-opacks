ow.loadDesktop();
var win = ow.desktop.window({
  title: "OpenAF Desktop example", width: 900, height: 600,
  file: "index.html", assetRoot: "examples/assets",
  messaging: { types: ["clicked", "status", "close"], schemas: {
    clicked: { type: "object", required: ["id"], properties: { id: { type: "string" } }, additionalProperties: false }
  } }
});
win.on("message", function(event) {
  if (event.message.type == "clicked") win.send("status", { text: "OpenAF received " + event.message.payload.id });
  if (event.message.type == "close") win.close();
});
win.on("error", function(event) { logErr(event.error.message); });
win.show();
ow.desktop.wait();
