/**
 * D3SVG — server-side SVG chart and diagram generation for OpenAF
 *
 * Inspired by d3.js but designed for static, standalone SVG output
 * compatible with JSVG. No browser DOM required.
 *
 * License: same as openaf-opacks repository
 */

var D3SVG = (function() {

  // ─── XML / SVG utilities ────────────────────────────────────────────────────

  function _escapeXml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function _attrs(obj) {
    if (!obj) return '';
    var out = '';
    var keys = Object.keys(obj).sort();
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (obj[k] !== null && obj[k] !== undefined) {
        out += ' ' + k + '="' + _escapeXml(obj[k]) + '"';
      }
    }
    return out;
  }

  function _tag(name, attrs, children) {
    var a = _attrs(attrs);
    if (children === null || children === undefined || children === '') {
      return '<' + name + a + '/>';
    }
    return '<' + name + a + '>' + children + '</' + name + '>';
  }

  // ─── SVG node model ─────────────────────────────────────────────────────────

  /**
   * Lightweight SVG document builder.
   *
   * @param {Object} opts - width, height, viewBox, title, desc
   */
  function SVG(opts) {
    opts = opts || {};
    this._width   = opts.width   || 800;
    this._height  = opts.height  || 400;
    this._viewBox = opts.viewBox || ('0 0 ' + this._width + ' ' + this._height);
    this._title   = opts.title   || '';
    this._desc    = opts.desc    || '';
    this._defs    = [];
    this._nodes   = [];
    this._idSeq   = 0;
  }

  SVG.prototype._uid = function(prefix) {
    this._idSeq++;
    return (prefix || 'id') + '_' + this._idSeq;
  };

  SVG.prototype.addDef = function(content) {
    this._defs.push(content);
    return this;
  };

  SVG.prototype.addRaw = function(content) {
    this._nodes.push(content);
    return this;
  };

  SVG.prototype.g = function(attrs, children) {
    this._nodes.push(_tag('g', attrs, children || ''));
    return this;
  };

  SVG.prototype.rect = function(attrs) {
    this._nodes.push(_tag('rect', attrs, null));
    return this;
  };

  SVG.prototype.circle = function(attrs) {
    this._nodes.push(_tag('circle', attrs, null));
    return this;
  };

  SVG.prototype.line = function(attrs) {
    this._nodes.push(_tag('line', attrs, null));
    return this;
  };

  SVG.prototype.path = function(attrs) {
    this._nodes.push(_tag('path', attrs, null));
    return this;
  };

  SVG.prototype.text = function(attrs, content) {
    var a = merge({}, attrs);
    var txt = _escapeXml(content || a._text || '');
    delete a._text;
    this._nodes.push(_tag('text', a, txt));
    return this;
  };

  SVG.prototype.toString = function() {
    var defs = '';
    if (this._defs.length > 0) {
      defs = '<defs>' + this._defs.join('') + '</defs>';
    }
    var meta = '';
    if (this._title) meta += _tag('title', null, _escapeXml(this._title));
    if (this._desc)  meta += _tag('desc',  null, _escapeXml(this._desc));

    var svgAttrs = {
      xmlns  : 'http://www.w3.org/2000/svg',
      width  : this._width,
      height : this._height,
      viewBox: this._viewBox
    };

    var body = meta + defs + this._nodes.join('');
    return _tag('svg', svgAttrs, body);
  };

  // ─── Scale helpers ───────────────────────────────────────────────────────────

  /**
   * Creates a linear scale mapping a continuous [domainMin, domainMax] to
   * a continuous [rangeMin, rangeMax].
   */
  function scaleLinear() {
    var _domain = [0, 1];
    var _range  = [0, 1];

    function scale(value) {
      var d0 = _domain[0], d1 = _domain[1];
      var r0 = _range[0],  r1 = _range[1];
      if (d1 === d0) return r0;
      return r0 + (value - d0) / (d1 - d0) * (r1 - r0);
    }

    scale.domain = function(d) {
      if (!arguments.length) return _domain.slice();
      _domain = d.slice();
      return scale;
    };

    scale.range = function(r) {
      if (!arguments.length) return _range.slice();
      _range = r.slice();
      return scale;
    };

    scale.ticks = function(count) {
      count = count || 5;
      return _linearTicks(_domain[0], _domain[1], count);
    };

    scale.tickFormat = function(count, specifier) {
      return function(v) { return _formatNum(v, specifier); };
    };

    scale.nice = function() {
      var step = _niceStep(_domain[0], _domain[1], 10);
      _domain[0] = Math.floor(_domain[0] / step) * step;
      _domain[1] = Math.ceil(_domain[1]  / step) * step;
      return scale;
    };

    scale.copy = function() {
      return scaleLinear().domain(_domain).range(_range);
    };

    return scale;
  }

  /**
   * Creates a band scale for ordinal/categorical data.
   */
  function scaleBand() {
    var _domain  = [];
    var _range   = [0, 1];
    var _padding = 0.1;
    var _paddingInner = null;
    var _paddingOuter = null;

    function _compute() {
      var n = _domain.length;
      if (n === 0) return { bandwidth: 0, step: 0, positions: {} };
      var r0 = _range[0], r1 = _range[1];
      var totalWidth = r1 - r0;
      var inner = _paddingInner !== null ? _paddingInner : _padding;
      var outer = _paddingOuter !== null ? _paddingOuter : _padding / 2;
      var step = totalWidth / (n + (n - 1) * inner / (1 - inner) + 2 * outer / (1 - inner));
      // simpler direct formula
      var bandwidth = (totalWidth - 2 * outer * step / (1 - inner)) / (n + (n - 1) * inner / (1 - inner));
      // Use the standard d3 band formula
      var paddingInner = Math.min(1, inner);
      var paddingOuter = Math.min(1, _paddingOuter !== null ? _paddingOuter : _padding / 2);
      step = (r1 - r0) / Math.max(1, n - paddingInner + 2 * paddingOuter);
      bandwidth = step * (1 - paddingInner);
      var start = r0 + step * paddingOuter;
      var positions = {};
      for (var i = 0; i < n; i++) {
        positions[_domain[i]] = start + step * i;
      }
      return { bandwidth: bandwidth, step: step, positions: positions };
    }

    function scale(value) {
      return _compute().positions[value];
    }

    scale.bandwidth = function() {
      return _compute().bandwidth;
    };

    scale.step = function() {
      return _compute().step;
    };

    scale.domain = function(d) {
      if (!arguments.length) return _domain.slice();
      _domain = d.slice();
      return scale;
    };

    scale.range = function(r) {
      if (!arguments.length) return _range.slice();
      _range = r.slice();
      return scale;
    };

    scale.padding = function(p) {
      if (!arguments.length) return _padding;
      _padding = p;
      _paddingInner = p;
      _paddingOuter = p / 2;
      return scale;
    };

    scale.paddingInner = function(p) {
      if (!arguments.length) return _paddingInner !== null ? _paddingInner : _padding;
      _paddingInner = p;
      return scale;
    };

    scale.paddingOuter = function(p) {
      if (!arguments.length) return _paddingOuter !== null ? _paddingOuter : _padding / 2;
      _paddingOuter = p;
      return scale;
    };

    scale.copy = function() {
      return scaleBand().domain(_domain).range(_range).padding(_padding);
    };

    return scale;
  }

  // ─── Tick generation ─────────────────────────────────────────────────────────

  function _linearTicks(start, stop, count) {
    if (start === stop) return [start];
    var step = _niceStep(start, stop, count);
    var ticks = [];
    var first = Math.ceil(start / step) * step;
    var last  = Math.floor(stop  / step) * step;
    for (var t = first; t <= last + step * 0.5; t += step) {
      ticks.push(_round(t, step));
    }
    return ticks;
  }

  function _niceStep(start, stop, count) {
    var span = Math.abs(stop - start);
    if (span === 0) return 1;
    var rawStep = span / (count || 5);
    var mag = Math.pow(10, Math.floor(Math.log(rawStep) / Math.LN10));
    var err = rawStep / mag;
    var step;
    if (err < 1.5)      step = mag;
    else if (err < 3)   step = 2 * mag;
    else if (err < 7.5) step = 5 * mag;
    else                step = 10 * mag;
    return step;
  }

  function _round(value, step) {
    var digits = Math.max(0, -Math.floor(Math.log(step) / Math.LN10));
    return parseFloat(value.toFixed(digits));
  }

  function _formatNum(v, specifier) {
    if (v === null || v === undefined) return '';
    if (typeof v !== 'number') return String(v);
    if (specifier) {
      // minimal format support: .Nf, .Ns, d, %
      var m = String(specifier).match(/^\.(\d+)([fse%]?)$/);
      if (m) {
        var prec = parseInt(m[1], 10);
        var type = m[2];
        if (type === '%') return (v * 100).toFixed(prec) + '%';
        if (type === 'e') return v.toExponential(prec);
        return v.toFixed(prec);
      }
    }
    // default: trim trailing zeros
    return v % 1 === 0 ? String(v) : String(parseFloat(v.toPrecision(6)));
  }

  // ─── Path generators ─────────────────────────────────────────────────────────

  /**
   * Generates a polyline "d" path string from an array of [x, y] pairs.
   * @param {Array} points  Array of {x, y} or [x, y]
   * @param {Object} opts   { curve: 'linear'|'monotone' }
   */
  function linePath(points, opts) {
    opts = opts || {};
    var pts = _normalizePoints(points);
    if (!pts || pts.length === 0) return '';
    if (pts.length === 1) return 'M ' + _p(pts[0].x) + ',' + _p(pts[0].y);
    if (opts.curve === 'monotone') {
      return _monotonePath(pts);
    }
    var d = 'M ' + _p(pts[0].x) + ',' + _p(pts[0].y);
    for (var i = 1; i < pts.length; i++) {
      d += ' L ' + _p(pts[i].x) + ',' + _p(pts[i].y);
    }
    return d;
  }

  function _monotonePath(pts) {
    if (pts.length < 2) return linePath(pts);
    // Catmull-Rom inspired monotone cubic
    var n = pts.length;
    var tangents = [];
    var deltas = [];
    for (var i = 0; i < n - 1; i++) {
      var dx = pts[i + 1].x - pts[i].x;
      var dy = pts[i + 1].y - pts[i].y;
      deltas.push({ dx: dx, dy: dy, slope: dx !== 0 ? dy / dx : 0 });
    }
    tangents.push(deltas[0].slope);
    for (var j = 1; j < n - 1; j++) {
      if (deltas[j - 1].slope * deltas[j].slope <= 0) {
        tangents.push(0);
      } else {
        var h = deltas[j - 1].dx + deltas[j].dx;
        tangents.push(3 * h / ((2 * deltas[j - 1].dx + deltas[j].dx) / deltas[j - 1].slope + (deltas[j - 1].dx + 2 * deltas[j].dx) / deltas[j].slope));
      }
    }
    tangents.push(deltas[n - 2].slope);
    var d = 'M ' + _p(pts[0].x) + ',' + _p(pts[0].y);
    for (var k = 0; k < n - 1; k++) {
      var x1 = pts[k].x, y1 = pts[k].y;
      var x2 = pts[k + 1].x, y2 = pts[k + 1].y;
      var dx2 = (x2 - x1) / 3;
      d += ' C ' + _p(x1 + dx2) + ',' + _p(y1 + dx2 * tangents[k]) +
           ' '   + _p(x2 - dx2) + ',' + _p(y2 - dx2 * tangents[k + 1]) +
           ' '   + _p(x2) + ',' + _p(y2);
    }
    return d;
  }

  function _normalizePoints(points) {
    if (!points) return [];
    return points.map(function(p) {
      if (Array.isArray(p)) return { x: p[0], y: p[1] };
      return { x: p.x, y: p.y };
    }).filter(function(p) {
      return p.x !== null && p.x !== undefined && p.y !== null && p.y !== undefined &&
             !isNaN(p.x) && !isNaN(p.y);
    });
  }

  function _p(v) {
    return parseFloat(v.toFixed(3));
  }

  /**
   * Generates an SVG arc "d" path string.
   * @param {Object} opts - cx, cy, r (or innerRadius/outerRadius), startAngle, endAngle (radians)
   */
  function arcPath(opts) {
    opts = opts || {};
    var cx = opts.cx || 0;
    var cy = opts.cy || 0;
    var r  = opts.r  || opts.outerRadius || 100;
    var ir = opts.innerRadius || 0;
    var sa = opts.startAngle || 0;
    var ea = opts.endAngle   || (2 * Math.PI);

    return _arc(cx, cy, r, ir, sa, ea);
  }

  function _arc(cx, cy, outerR, innerR, startAngle, endAngle) {
    var start = _polarToXY(cx, cy, outerR, startAngle);
    var end   = _polarToXY(cx, cy, outerR, endAngle);
    var large = (endAngle - startAngle) > Math.PI ? 1 : 0;

    if (innerR <= 0) {
      if (Math.abs(endAngle - startAngle - 2 * Math.PI) < 1e-6) {
        // full circle
        var mid = _polarToXY(cx, cy, outerR, startAngle + Math.PI);
        return 'M ' + _p(start.x) + ',' + _p(start.y) +
               ' A ' + _p(outerR) + ',' + _p(outerR) + ' 0 1,1 ' + _p(mid.x) + ',' + _p(mid.y) +
               ' A ' + _p(outerR) + ',' + _p(outerR) + ' 0 1,1 ' + _p(start.x) + ',' + _p(start.y) + ' Z';
      }
      return 'M ' + _p(cx) + ',' + _p(cy) +
             ' L ' + _p(start.x) + ',' + _p(start.y) +
             ' A ' + _p(outerR) + ',' + _p(outerR) + ' 0 ' + large + ',1 ' + _p(end.x) + ',' + _p(end.y) +
             ' Z';
    } else {
      var iStart = _polarToXY(cx, cy, innerR, startAngle);
      var iEnd   = _polarToXY(cx, cy, innerR, endAngle);
      if (Math.abs(endAngle - startAngle - 2 * Math.PI) < 1e-6) {
        var omid = _polarToXY(cx, cy, outerR, startAngle + Math.PI);
        var imid = _polarToXY(cx, cy, innerR, startAngle + Math.PI);
        return 'M ' + _p(start.x) + ',' + _p(start.y) +
               ' A ' + _p(outerR) + ',' + _p(outerR) + ' 0 1,1 ' + _p(omid.x) + ',' + _p(omid.y) +
               ' A ' + _p(outerR) + ',' + _p(outerR) + ' 0 1,1 ' + _p(start.x) + ',' + _p(start.y) +
               ' M ' + _p(iStart.x) + ',' + _p(iStart.y) +
               ' A ' + _p(innerR) + ',' + _p(innerR) + ' 0 1,0 ' + _p(imid.x) + ',' + _p(imid.y) +
               ' A ' + _p(innerR) + ',' + _p(innerR) + ' 0 1,0 ' + _p(iStart.x) + ',' + _p(iStart.y) + ' Z';
      }
      return 'M ' + _p(start.x) + ',' + _p(start.y) +
             ' A ' + _p(outerR) + ',' + _p(outerR) + ' 0 ' + large + ',1 ' + _p(end.x) + ',' + _p(end.y) +
             ' L ' + _p(iEnd.x) + ',' + _p(iEnd.y) +
             ' A ' + _p(innerR) + ',' + _p(innerR) + ' 0 ' + large + ',0 ' + _p(iStart.x) + ',' + _p(iStart.y) +
             ' Z';
    }
  }

  function _polarToXY(cx, cy, r, angle) {
    // angle 0 = top (north), increases clockwise
    return {
      x: cx + r * Math.sin(angle),
      y: cy - r * Math.cos(angle)
    };
  }

  // ─── Axis renderers ──────────────────────────────────────────────────────────

  var _AXIS_TICK_SIZE  = 6;
  var _AXIS_TICK_PAD   = 3;
  var _AXIS_FONT_SIZE  = 11;
  var _AXIS_FONT_FAM   = 'sans-serif';

  /**
   * Renders a bottom axis as an SVG string.
   * @param {Function} scale  a scaleLinear or scaleBand instance
   * @param {Object}   opts   tickCount, tickSize, label, fontSize, fontFamily
   * @returns {String}        SVG group markup
   */
  function axisBottom(scale, opts) {
    opts = opts || {};
    var tickSize  = opts.tickSize  !== undefined ? opts.tickSize  : _AXIS_TICK_SIZE;
    var tickPad   = opts.tickPad   !== undefined ? opts.tickPad   : _AXIS_TICK_PAD;
    var fontSize  = opts.fontSize  || _AXIS_FONT_SIZE;
    var fontFam   = opts.fontFamily|| _AXIS_FONT_FAM;
    var color     = opts.color     || '#333';
    var ticks     = _getScaleTicks(scale, opts.tickCount || 5);
    var items     = [];

    for (var i = 0; i < ticks.length; i++) {
      var t   = ticks[i];
      var pos = typeof scale.bandwidth === 'function'
        ? (scale(t) + scale.bandwidth() / 2)
        : scale(t);
      if (pos === undefined || isNaN(pos)) continue;
      var label = opts.tickFormat ? opts.tickFormat(t) : _formatNum(t);
      items.push(
        '<g transform="translate(' + _p(pos) + ',0)">' +
          '<line y2="' + tickSize + '" stroke="' + color + '"/>' +
          '<text y="' + (tickSize + tickPad + fontSize) + '"' +
                ' text-anchor="middle"' +
                ' font-family="' + fontFam + '"' +
                ' font-size="' + fontSize + '"' +
                ' fill="' + color + '">' +
            _escapeXml(label) +
          '</text>' +
        '</g>'
      );
    }

    if (opts.label) {
      var range   = scale.range();
      var midX    = (range[0] + range[1]) / 2;
      var labelY  = tickSize + tickPad + fontSize * 2 + 8;
      items.push(
        '<text x="' + _p(midX) + '" y="' + _p(labelY) + '"' +
              ' text-anchor="middle"' +
              ' font-family="' + fontFam + '"' +
              ' font-size="' + (fontSize + 1) + '"' +
              ' fill="' + color + '">' +
          _escapeXml(opts.label) +
        '</text>'
      );
    }

    var domainRange = scale.range();
    var domainLine = '<line x1="' + _p(domainRange[0]) + '" x2="' + _p(domainRange[1]) + '" stroke="' + color + '"/>';

    return '<g class="axis axis-bottom" fill="none" stroke="none">' +
             domainLine + items.join('') +
           '</g>';
  }

  /**
   * Renders a left axis as an SVG string.
   * @param {Function} scale  a scaleLinear instance
   * @param {Object}   opts   tickCount, tickSize, label, fontSize, fontFamily
   * @returns {String}        SVG group markup
   */
  function axisLeft(scale, opts) {
    opts = opts || {};
    var tickSize  = opts.tickSize  !== undefined ? opts.tickSize  : _AXIS_TICK_SIZE;
    var tickPad   = opts.tickPad   !== undefined ? opts.tickPad   : _AXIS_TICK_PAD;
    var fontSize  = opts.fontSize  || _AXIS_FONT_SIZE;
    var fontFam   = opts.fontFamily|| _AXIS_FONT_FAM;
    var color     = opts.color     || '#333';
    var ticks     = _getScaleTicks(scale, opts.tickCount || 5);
    var items     = [];

    for (var i = 0; i < ticks.length; i++) {
      var t   = ticks[i];
      var pos = scale(t);
      if (pos === undefined || isNaN(pos)) continue;
      var label = opts.tickFormat ? opts.tickFormat(t) : _formatNum(t);
      items.push(
        '<g transform="translate(0,' + _p(pos) + ')">' +
          '<line x2="' + (-tickSize) + '" stroke="' + color + '"/>' +
          '<text x="' + (-(tickSize + tickPad)) + '"' +
                ' dy="0.32em"' +
                ' text-anchor="end"' +
                ' font-family="' + fontFam + '"' +
                ' font-size="' + fontSize + '"' +
                ' fill="' + color + '">' +
            _escapeXml(label) +
          '</text>' +
        '</g>'
      );
    }

    if (opts.label) {
      var range  = scale.range();
      var midY   = (range[0] + range[1]) / 2;
      var labelX = -(tickSize + tickPad + fontSize * 5);
      items.push(
        '<text transform="rotate(-90)"' +
              ' x="' + _p(-midY) + '"' +
              ' y="' + _p(labelX) + '"' +
              ' text-anchor="middle"' +
              ' font-family="' + fontFam + '"' +
              ' font-size="' + (fontSize + 1) + '"' +
              ' fill="' + color + '">' +
          _escapeXml(opts.label) +
        '</text>'
      );
    }

    var domainRange = scale.range();
    var domainLine = '<line y1="' + _p(domainRange[0]) + '" y2="' + _p(domainRange[1]) + '" stroke="' + color + '"/>';

    return '<g class="axis axis-left" fill="none" stroke="none">' +
             domainLine + items.join('') +
           '</g>';
  }

  function _getScaleTicks(scale, count) {
    if (typeof scale.ticks === 'function') {
      return scale.ticks(count);
    }
    if (typeof scale.domain === 'function') {
      return scale.domain();
    }
    return [];
  }

  // ─── Theme / color helpers ───────────────────────────────────────────────────

  var THEMES = {
    'default': {
      background : '#ffffff',
      gridColor  : '#e0e0e0',
      axisColor  : '#333333',
      textColor  : '#333333',
      fontFamily : 'sans-serif',
      fontSize   : 12,
      titleSize  : 16,
      colors     : ['#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f',
                    '#edc948','#b07aa1','#ff9da7','#9c755f','#bab0ac']
    },
    'dark': {
      background : '#1e1e2e',
      gridColor  : '#44475a',
      axisColor  : '#cdd6f4',
      textColor  : '#cdd6f4',
      fontFamily : 'sans-serif',
      fontSize   : 12,
      titleSize  : 16,
      colors     : ['#89b4fa','#fab387','#f38ba8','#94e2d5','#a6e3a1',
                    '#f9e2af','#cba6f7','#f2cdcd','#b5c1ff','#eba0ac']
    },
    'minimal': {
      background : '#ffffff',
      gridColor  : '#f0f0f0',
      axisColor  : '#666666',
      textColor  : '#555555',
      fontFamily : 'sans-serif',
      fontSize   : 11,
      titleSize  : 14,
      colors     : ['#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd',
                    '#8c564b','#e377c2','#7f7f7f','#bcbd22','#17becf']
    }
  };

  function getTheme(name) {
    return merge({}, THEMES[name] || THEMES['default']);
  }

  function merge(target) {
    for (var i = 1; i < arguments.length; i++) {
      var src = arguments[i];
      if (src) {
        for (var k in src) {
          if (Object.prototype.hasOwnProperty.call(src, k)) {
            target[k] = src[k];
          }
        }
      }
    }
    return target;
  }

  function _color(theme, idx) {
    var colors = theme.colors || THEMES['default'].colors;
    return colors[idx % colors.length];
  }

  // ─── Grid lines helper ───────────────────────────────────────────────────────

  function _gridLines(yScale, width, opts) {
    opts = opts || {};
    var color  = opts.color || '#e0e0e0';
    var ticks  = yScale.ticks ? yScale.ticks(opts.count || 5) : [];
    var lines  = [];
    for (var i = 0; i < ticks.length; i++) {
      var y = yScale(ticks[i]);
      lines.push('<line x1="0" y1="' + _p(y) + '" x2="' + _p(width) + '" y2="' + _p(y) + '" stroke="' + color + '" stroke-dasharray="2,2"/>');
    }
    return lines.join('');
  }

  // ─── Legend helper ────────────────────────────────────────────────────────────

  function _legend(series, opts) {
    opts = opts || {};
    var x        = opts.x        || 0;
    var y        = opts.y        || 0;
    var fontSize = opts.fontSize || 12;
    var fontFam  = opts.fontFamily || 'sans-serif';
    var textColor= opts.textColor  || '#333';
    var spacing  = opts.spacing    || 20;
    var swWidth  = opts.swatchWidth || 14;
    var swHeight = opts.swatchHeight|| 12;
    var items    = [];

    for (var i = 0; i < series.length; i++) {
      var iy   = y + i * spacing;
      var name = series[i].name || series[i].label || '';
      var color= series[i].color || '#999';
      items.push(
        '<rect x="' + _p(x) + '" y="' + _p(iy - swHeight + 2) + '"' +
              ' width="' + swWidth + '" height="' + swHeight + '"' +
              ' fill="' + color + '"/>' +
        '<text x="' + _p(x + swWidth + 5) + '" y="' + _p(iy) + '"' +
              ' font-family="' + fontFam + '"' +
              ' font-size="' + fontSize + '"' +
              ' fill="' + textColor + '">' +
          _escapeXml(name) +
        '</text>'
      );
    }
    return items.join('');
  }

  // ─── Title helper ─────────────────────────────────────────────────────────────

  function _titleBlock(title, subtitle, width, opts) {
    opts = opts || {};
    var fontFam   = opts.fontFamily || 'sans-serif';
    var titleSize = opts.titleSize  || 16;
    var subSize   = opts.subSize    || 12;
    var color     = opts.color      || '#333';
    var out       = '';
    if (title) {
      out += '<text x="' + _p(width / 2) + '" y="' + _p(titleSize) + '"' +
                   ' text-anchor="middle"' +
                   ' font-family="' + fontFam + '"' +
                   ' font-size="' + titleSize + '"' +
                   ' font-weight="bold"' +
                   ' fill="' + color + '">' +
               _escapeXml(title) +
             '</text>';
    }
    if (subtitle) {
      out += '<text x="' + _p(width / 2) + '" y="' + _p(titleSize + subSize + 4) + '"' +
                   ' text-anchor="middle"' +
                   ' font-family="' + fontFam + '"' +
                   ' font-size="' + subSize + '"' +
                   ' fill="' + color + '">' +
               _escapeXml(subtitle) +
             '</text>';
    }
    return out;
  }

  // ─── Bar chart ───────────────────────────────────────────────────────────────

  /**
   * Generates a bar chart SVG string.
   *
   * @param {Array}  data   Array of objects, e.g. [{category:'A', value:10}, ...]
   * @param {Object} opts
   *   width, height, margin, x.field, y.field, x.label, y.label,
   *   title, subtitle, theme, colors, tickCount, showGrid, showValues,
   *   barPadding, horizontal
   * @returns {String} SVG markup
   */
  function barChart(data, opts) {
    opts = opts || {};
    if (!data || data.length === 0) {
      return _emptySVG(opts.width || 400, opts.height || 300, 'No data');
    }

    var width    = opts.width  || 600;
    var height   = opts.height || 400;
    var margin   = merge({ top: 40, right: 20, bottom: 60, left: 60 }, opts.margin || {});
    var theme    = getTheme(opts.theme || 'default');
    var colors   = opts.colors || theme.colors;
    var xField   = (opts.x && opts.x.field) || 'category';
    var yField   = (opts.y && opts.y.field) || 'value';
    var xLabel   = (opts.x && opts.x.label) || '';
    var yLabel   = (opts.y && opts.y.label) || '';
    var showGrid = opts.showGrid !== false;
    var showVals = opts.showValues || false;
    var horizontal = opts.horizontal || false;

    var iW = width  - margin.left - margin.right;
    var iH = height - margin.top  - margin.bottom;

    var categories = data.map(function(d) { return String(d[xField]); });
    var values     = data.map(function(d) { return parseFloat(d[yField]) || 0; });
    var maxVal     = Math.max.apply(null, values);
    var minVal     = Math.min(0, Math.min.apply(null, values));

    var svg = new SVG({ width: width, height: height });
    // background
    svg.addRaw('<rect width="' + width + '" height="' + height + '" fill="' + theme.background + '"/>');

    var body = '';

    // title block
    if (opts.title || opts.subtitle) {
      body += _titleBlock(opts.title, opts.subtitle, iW, {
        fontFamily: theme.fontFamily,
        titleSize : theme.titleSize,
        color     : theme.textColor
      });
    }

    if (!horizontal) {
      // Vertical bar chart
      var xScale = scaleBand()
        .domain(categories)
        .range([0, iW])
        .padding(opts.barPadding !== undefined ? opts.barPadding : 0.2);

      var yScale = scaleLinear()
        .domain([minVal, maxVal])
        .range([iH, 0])
        .nice();

      if (showGrid) {
        body += _gridLines(yScale, iW, { color: theme.gridColor, count: opts.tickCount || 5 });
      }

      // bars
      for (var i = 0; i < data.length; i++) {
        var cat   = categories[i];
        var val   = values[i];
        var bx    = xScale(cat);
        var bw    = xScale.bandwidth();
        var by    = val >= 0 ? yScale(val) : yScale(0);
        var bh    = Math.abs(yScale(val) - yScale(0));
        var fill  = Array.isArray(colors) ? colors[i % colors.length] : colors;

        body += '<rect x="' + _p(bx) + '" y="' + _p(by) + '"' +
                       ' width="' + _p(bw) + '" height="' + _p(Math.max(bh, 1)) + '"' +
                       ' fill="' + fill + '"/>';

        if (showVals) {
          var vx = bx + bw / 2;
          var vy = by - 4;
          body += '<text x="' + _p(vx) + '" y="' + _p(vy) + '"' +
                        ' text-anchor="middle"' +
                        ' font-family="' + theme.fontFamily + '"' +
                        ' font-size="' + theme.fontSize + '"' +
                        ' fill="' + theme.textColor + '">' +
                    _escapeXml(_formatNum(val)) +
                  '</text>';
        }
      }

      body += axisBottom(xScale, {
        tickCount : categories.length,
        label     : xLabel,
        fontSize  : theme.fontSize,
        fontFamily: theme.fontFamily,
        color     : theme.axisColor,
        tickFormat: function(t) { return String(t); }
      });

      body += axisLeft(yScale, {
        tickCount : opts.tickCount || 5,
        label     : yLabel,
        fontSize  : theme.fontSize,
        fontFamily: theme.fontFamily,
        color     : theme.axisColor
      });
    } else {
      // Horizontal bar chart
      var yScaleH = scaleBand()
        .domain(categories)
        .range([0, iH])
        .padding(opts.barPadding !== undefined ? opts.barPadding : 0.2);

      var xScaleH = scaleLinear()
        .domain([minVal, maxVal])
        .range([0, iW])
        .nice();

      if (showGrid) {
        var xTicks = xScaleH.ticks(opts.tickCount || 5);
        for (var gi = 0; gi < xTicks.length; gi++) {
          var gx = xScaleH(xTicks[gi]);
          body += '<line x1="' + _p(gx) + '" y1="0" x2="' + _p(gx) + '" y2="' + _p(iH) + '"' +
                       ' stroke="' + theme.gridColor + '" stroke-dasharray="2,2"/>';
        }
      }

      for (var hi = 0; hi < data.length; hi++) {
        var hcat  = categories[hi];
        var hval  = values[hi];
        var hby   = yScaleH(hcat);
        var hbh   = yScaleH.bandwidth();
        var hbx   = hval >= 0 ? xScaleH(0) : xScaleH(hval);
        var hbw   = Math.abs(xScaleH(hval) - xScaleH(0));
        var hfill = Array.isArray(colors) ? colors[hi % colors.length] : colors;

        body += '<rect x="' + _p(hbx) + '" y="' + _p(hby) + '"' +
                       ' width="' + _p(Math.max(hbw, 1)) + '" height="' + _p(hbh) + '"' +
                       ' fill="' + hfill + '"/>';
      }

      // simple axis labels for horizontal mode
      var haTicks = xScaleH.ticks(opts.tickCount || 5);
      var haItems = '';
      for (var hti = 0; hti < haTicks.length; hti++) {
        var htPos = xScaleH(haTicks[hti]);
        haItems += '<g transform="translate(' + _p(htPos) + ',0)">' +
                     '<line y2="6" stroke="' + theme.axisColor + '"/>' +
                     '<text y="18" text-anchor="middle"' +
                           ' font-family="' + theme.fontFamily + '"' +
                           ' font-size="' + theme.fontSize + '"' +
                           ' fill="' + theme.axisColor + '">' +
                       _escapeXml(_formatNum(haTicks[hti])) +
                     '</text>' +
                   '</g>';
      }
      body += '<g transform="translate(0,' + _p(iH) + ')">' + haItems + '</g>';

      var hvItems = '';
      var hvDomain = yScaleH.domain();
      for (var hvi = 0; hvi < hvDomain.length; hvi++) {
        var hvPos = yScaleH(hvDomain[hvi]) + yScaleH.bandwidth() / 2;
        hvItems += '<g transform="translate(0,' + _p(hvPos) + ')">' +
                     '<line x2="-6" stroke="' + theme.axisColor + '"/>' +
                     '<text x="-9" dy="0.32em" text-anchor="end"' +
                           ' font-family="' + theme.fontFamily + '"' +
                           ' font-size="' + theme.fontSize + '"' +
                           ' fill="' + theme.axisColor + '">' +
                       _escapeXml(String(hvDomain[hvi])) +
                     '</text>' +
                   '</g>';
      }
      body += '<g>' + hvItems + '</g>';
    }

    svg.addRaw(
      '<g transform="translate(' + margin.left + ',' + margin.top + ')">' +
        body +
      '</g>'
    );

    return svg.toString();
  }

  // ─── Line chart ──────────────────────────────────────────────────────────────

  /**
   * Generates a line chart SVG string.
   *
   * @param {Array}  data   Array of series: [{name:'A', values:[{x,y},...]}]
   *                        or a flat array [{x, y}] for single series
   * @param {Object} opts
   *   width, height, margin, x.label, y.label, title, subtitle,
   *   theme, colors, tickCount, showGrid, showDots, curve, showLegend
   * @returns {String} SVG markup
   */
  function lineChart(data, opts) {
    opts = opts || {};
    if (!data || data.length === 0) {
      return _emptySVG(opts.width || 400, opts.height || 300, 'No data');
    }

    var width    = opts.width  || 600;
    var height   = opts.height || 400;
    var margin   = merge({ top: 40, right: 20, bottom: 60, left: 60 }, opts.margin || {});
    var theme    = getTheme(opts.theme || 'default');
    var colors   = opts.colors || theme.colors;
    var xLabel   = (opts.x && opts.x.label) || '';
    var yLabel   = (opts.y && opts.y.label) || '';
    var showGrid = opts.showGrid !== false;
    var showDots = opts.showDots !== false;
    var curve    = opts.curve || 'linear';
    var showLeg  = opts.showLegend || false;

    var iW = width  - margin.left - margin.right;
    var iH = height - margin.top  - margin.bottom;

    // Normalize to multi-series
    var series = _normalizeLineSeries(data, opts);

    if (!series || series.length === 0 || series[0].values.length === 0) {
      return _emptySVG(width, height, 'No data');
    }

    // Compute domain across all series
    var allX = [], allY = [];
    for (var s = 0; s < series.length; s++) {
      for (var p = 0; p < series[s].values.length; p++) {
        var pt = series[s].values[p];
        allX.push(pt.x);
        allY.push(pt.y);
      }
    }

    var xMin = Math.min.apply(null, allX);
    var xMax = Math.max.apply(null, allX);
    var yMin = Math.min(0, Math.min.apply(null, allY));
    var yMax = Math.max.apply(null, allY);

    var xScale = scaleLinear().domain([xMin, xMax]).range([0, iW]);
    var yScale = scaleLinear().domain([yMin, yMax]).range([iH, 0]).nice();

    var svg  = new SVG({ width: width, height: height });
    svg.addRaw('<rect width="' + width + '" height="' + height + '" fill="' + theme.background + '"/>');

    var body = '';

    if (opts.title || opts.subtitle) {
      body += _titleBlock(opts.title, opts.subtitle, iW, {
        fontFamily: theme.fontFamily,
        titleSize : theme.titleSize,
        color     : theme.textColor
      });
    }

    if (showGrid) {
      body += _gridLines(yScale, iW, { color: theme.gridColor, count: opts.tickCount || 5 });
    }

    // Draw lines
    for (var si = 0; si < series.length; si++) {
      var ser   = series[si];
      var sColor = Array.isArray(colors) ? colors[si % colors.length] : colors;
      var pts   = ser.values.map(function(pt) {
        return { x: xScale(pt.x), y: yScale(pt.y) };
      });
      var d = linePath(pts, { curve: curve });
      if (d) {
        body += '<path d="' + d + '"' +
                       ' fill="none"' +
                       ' stroke="' + sColor + '"' +
                       ' stroke-width="2"/>';
      }
      if (showDots) {
        for (var di = 0; di < pts.length; di++) {
          body += '<circle cx="' + _p(pts[di].x) + '" cy="' + _p(pts[di].y) + '" r="4"' +
                          ' fill="' + sColor + '"/>';
        }
      }
    }

    body += axisBottom(xScale, {
      tickCount : opts.tickCount || 5,
      label     : xLabel,
      fontSize  : theme.fontSize,
      fontFamily: theme.fontFamily,
      color     : theme.axisColor
    });

    body += axisLeft(yScale, {
      tickCount : opts.tickCount || 5,
      label     : yLabel,
      fontSize  : theme.fontSize,
      fontFamily: theme.fontFamily,
      color     : theme.axisColor
    });

    if (showLeg && series.length > 1) {
      var legSeries = series.map(function(s2, idx) {
        return { name: s2.name || ('Series ' + (idx + 1)), color: colors[idx % colors.length] };
      });
      body += _legend(legSeries, {
        x: iW - 120,
        y: 20,
        fontSize : theme.fontSize,
        fontFamily: theme.fontFamily,
        textColor: theme.textColor
      });
    }

    svg.addRaw(
      '<g transform="translate(' + margin.left + ',' + margin.top + ')">' +
        body +
      '</g>'
    );

    return svg.toString();
  }

  function _normalizeLineSeries(data, opts) {
    opts = opts || {};
    if (!data || !data.length) return [];
    // If data is flat [{x,y}] — single series
    var first = data[0];
    if (typeof first.x !== 'undefined' || typeof first.y !== 'undefined') {
      var xField = (opts.x && opts.x.field) || 'x';
      var yField = (opts.y && opts.y.field) || 'y';
      return [{
        name  : opts.name || 'Series 1',
        values: data.map(function(d) {
          return { x: parseFloat(d[xField]) || 0, y: parseFloat(d[yField]) || 0 };
        })
      }];
    }
    // Multi-series: [{name, values:[{x,y}]}]
    if (typeof first.values !== 'undefined') {
      return data.map(function(s) {
        return {
          name  : s.name || s.label || '',
          values: (s.values || []).map(function(d) {
            var xf = (opts.x && opts.x.field) || 'x';
            var yf = (opts.y && opts.y.field) || 'y';
            return { x: parseFloat(d[xf]) || 0, y: parseFloat(d[yf]) || 0 };
          })
        };
      });
    }
    // Fallback: treat as {category, value}
    var xf2 = (opts.x && opts.x.field) || 'x';
    var yf2 = (opts.y && opts.y.field) || 'y';
    return [{
      name  : 'Series 1',
      values: data.map(function(d, i) {
        return { x: parseFloat(d[xf2]) || i, y: parseFloat(d[yf2]) || 0 };
      })
    }];
  }

  // ─── Pie / donut chart ───────────────────────────────────────────────────────

  /**
   * Generates a pie or donut chart SVG string.
   *
   * @param {Array}  data   Array of objects, e.g. [{name:'A', value:30}, ...]
   * @param {Object} opts
   *   width, height, label (field for name), value (field for value),
   *   donut (bool), donutRatio (0-1), title, subtitle,
   *   theme, colors, showLabels, showLegend, showPercent
   * @returns {String} SVG markup
   */
  function pieChart(data, opts) {
    opts = opts || {};
    if (!data || data.length === 0) {
      return _emptySVG(opts.width || 400, opts.height || 400, 'No data');
    }

    var width     = opts.width  || 500;
    var height    = opts.height || 500;
    var margin    = merge({ top: 40, right: 20, bottom: 20, left: 20 }, opts.margin || {});
    var theme     = getTheme(opts.theme || 'default');
    var colors    = opts.colors || theme.colors;
    var labelField= opts.label || 'name';
    var valueField= opts.value || 'value';
    var isDonut   = opts.donut || false;
    var donutRatio= opts.donutRatio || 0.5;
    var showLabels= opts.showLabels !== false;
    var showLegend= opts.showLegend || false;
    var showPct   = opts.showPercent !== false;

    var iW = width  - margin.left - margin.right;
    var iH = height - margin.top  - margin.bottom;

    var legendW = showLegend ? 120 : 0;
    var cx = margin.left + (iW - legendW) / 2;
    var cy = margin.top  + iH / 2;
    var outerR = Math.min(iW - legendW, iH) / 2 - 10;
    var innerR = isDonut ? outerR * donutRatio : 0;

    // Compute total and angles
    var total = 0;
    for (var i = 0; i < data.length; i++) {
      total += parseFloat(data[i][valueField]) || 0;
    }
    if (total === 0) {
      return _emptySVG(width, height, 'No data (all zeros)');
    }

    var svg  = new SVG({ width: width, height: height });
    svg.addRaw('<rect width="' + width + '" height="' + height + '" fill="' + theme.background + '"/>');

    var body = '';

    if (opts.title || opts.subtitle) {
      body += _titleBlock(opts.title, opts.subtitle, width, {
        fontFamily: theme.fontFamily,
        titleSize : theme.titleSize,
        color     : theme.textColor
      });
    }

    var currentAngle = 0;
    var slices = [];

    for (var si = 0; si < data.length; si++) {
      var val    = parseFloat(data[si][valueField]) || 0;
      var angle  = (val / total) * 2 * Math.PI;
      var sColor = Array.isArray(colors) ? colors[si % colors.length] : colors;
      var name   = String(data[si][labelField] || '');
      var pct    = (val / total * 100).toFixed(1) + '%';
      slices.push({
        startAngle: currentAngle,
        endAngle  : currentAngle + angle,
        color     : sColor,
        name      : name,
        value     : val,
        pct       : pct
      });
      currentAngle += angle;
    }

    // Draw slices
    for (var pi = 0; pi < slices.length; pi++) {
      var sl  = slices[pi];
      var d   = _arc(cx, cy, outerR, innerR, sl.startAngle, sl.endAngle);
      body += '<path d="' + d + '" fill="' + sl.color + '" stroke="white" stroke-width="1"/>';

      if (showLabels) {
        var midAngle = (sl.startAngle + sl.endAngle) / 2;
        var labelR   = outerR * 0.7 + (isDonut ? innerR * 0.3 : 0);
        var lx = cx + labelR * Math.sin(midAngle);
        var ly = cy - labelR * Math.cos(midAngle);
        var txt = showPct ? sl.pct : sl.name;
        body += '<text x="' + _p(lx) + '" y="' + _p(ly) + '"' +
                      ' text-anchor="middle"' +
                      ' dominant-baseline="middle"' +
                      ' font-family="' + theme.fontFamily + '"' +
                      ' font-size="' + (theme.fontSize - 1) + '"' +
                      ' fill="white">' +
                  _escapeXml(txt) +
                '</text>';
      }
    }

    // Legend
    if (showLegend) {
      var legX = cx + outerR + 15;
      var legY = cy - slices.length * 10;
      for (var li = 0; li < slices.length; li++) {
        var ly2 = legY + li * 22;
        body += '<rect x="' + _p(legX) + '" y="' + _p(ly2) + '" width="14" height="12" fill="' + slices[li].color + '"/>' +
                '<text x="' + _p(legX + 18) + '" y="' + _p(ly2 + 11) + '"' +
                      ' font-family="' + theme.fontFamily + '"' +
                      ' font-size="' + theme.fontSize + '"' +
                      ' fill="' + theme.textColor + '">' +
                  _escapeXml(slices[li].name) +
                '</text>';
      }
    }

    svg.addRaw(body);
    return svg.toString();
  }

  // ─── Empty SVG placeholder ────────────────────────────────────────────────────

  function _emptySVG(width, height, msg) {
    var svg = new SVG({ width: width, height: height });
    svg.addRaw('<rect width="' + width + '" height="' + height + '" fill="#f9f9f9"/>');
    svg.addRaw(
      '<text x="' + (width / 2) + '" y="' + (height / 2) + '"' +
            ' text-anchor="middle"' +
            ' font-family="sans-serif"' +
            ' font-size="14"' +
            ' fill="#999">' +
        _escapeXml(msg || 'No data') +
      '</text>'
    );
    return svg.toString();
  }

  // ─── Public API ───────────────────────────────────────────────────────────────

  return {
    // SVG builder
    SVG        : SVG,

    // Scales
    scaleLinear: scaleLinear,
    scaleBand  : scaleBand,

    // Path generators
    linePath   : linePath,
    arcPath    : arcPath,

    // Axes
    axisBottom : axisBottom,
    axisLeft   : axisLeft,

    // Charts
    barChart   : barChart,
    lineChart  : lineChart,
    pieChart   : pieChart,

    // Utilities
    getTheme   : getTheme,
    themes     : THEMES,

    // Low-level helpers (exposed for advanced usage)
    _escapeXml : _escapeXml,
    _formatNum : _formatNum,
    _linearTicks: _linearTicks,
    _arc       : _arc
  };

})();

// CommonJS / OpenAF export
if (typeof exports !== 'undefined') {
  exports.D3SVG        = D3SVG;
  exports.SVG          = D3SVG.SVG;
  exports.scaleLinear  = D3SVG.scaleLinear;
  exports.scaleBand    = D3SVG.scaleBand;
  exports.linePath     = D3SVG.linePath;
  exports.arcPath      = D3SVG.arcPath;
  exports.axisBottom   = D3SVG.axisBottom;
  exports.axisLeft     = D3SVG.axisLeft;
  exports.barChart     = D3SVG.barChart;
  exports.lineChart    = D3SVG.lineChart;
  exports.pieChart     = D3SVG.pieChart;
  exports.getTheme     = D3SVG.getTheme;
  exports.themes       = D3SVG.themes;
  exports._escapeXml   = D3SVG._escapeXml;
  exports._formatNum   = D3SVG._formatNum;
  exports._linearTicks = D3SVG._linearTicks;
  exports._arc         = D3SVG._arc;
}
