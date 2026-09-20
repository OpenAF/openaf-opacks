// Used only by genStaticVersion; all bundled Markdown is served from memory.
(function() {
  var NativeXHR = window.XMLHttpRequest;
  var documents = window.__docsifyStaticDocuments;
  var base = new URL(".", window.location.href);
  window.XMLHttpRequest = function() {
    var xhr = new NativeXHR();
    var open = xhr.open;
    var send = xhr.send;
    var setRequestHeader = xhr.setRequestHeader;
    var entry;
    xhr.open = function(method, url) {
      entry = undefined;
      var target = new URL(url, base);
      var path = target.pathname;
      if (target.origin === base.origin && path.indexOf(base.pathname) === 0) {
        path = path.substring(base.pathname.length);
        entry = documents["/" + path] || documents[path];
      }
      if (method !== "GET") entry = undefined;
      if (!entry) return open.apply(xhr, arguments);
    };
    xhr.send = function() {
      if (!entry) return send.apply(xhr, arguments);
      Object.defineProperties(xhr, {
        status: { value: 200 },
        readyState: { value: 4 },
        response: { value: entry.content },
        responseText: { value: entry.content }
      });
      xhr.getResponseHeader = function() { return null; };
      setTimeout(function() {
        xhr.dispatchEvent(new Event("load"));
        xhr.dispatchEvent(new Event("loadend"));
      }, 0);
    };
    xhr.setRequestHeader = function() {
      if (!entry) return setRequestHeader.apply(xhr, arguments);
    };
    return xhr;
  };
  window.XMLHttpRequest.prototype = NativeXHR.prototype;
})();
