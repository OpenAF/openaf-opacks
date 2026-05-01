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

  // ─── Area chart ─────────────────────────────────────────────────────────────

  /**
   * Generates an area chart SVG string (line chart with a filled region).
   *
   * @param {Array}  data   Flat [{x,y}] or multi-series [{name, values:[{x,y}]}]
   * @param {Object} opts
   *   width, height, margin, x.field, y.label, title, subtitle,
   *   theme, colors, curve, showDots, showGrid, fillOpacity, showLegend
   * @returns {String} SVG markup
   */
  function areaChart(data, opts) {
    opts = opts || {};
    if (!data || data.length === 0) {
      return _emptySVG(opts.width || 400, opts.height || 300, 'No data');
    }

    var width      = opts.width  || 600;
    var height     = opts.height || 400;
    var margin     = merge({ top: 40, right: 20, bottom: 60, left: 60 }, opts.margin || {});
    var theme      = getTheme(opts.theme || 'default');
    var colors     = opts.colors || theme.colors;
    var xLabel     = (opts.x && opts.x.label) || '';
    var yLabel     = (opts.y && opts.y.label) || '';
    var showGrid   = opts.showGrid !== false;
    var showDots   = opts.showDots || false;
    var curve      = opts.curve || 'monotone';
    var fillOp     = opts.fillOpacity !== undefined ? opts.fillOpacity : 0.25;
    var showLeg    = opts.showLegend || false;

    var iW = width  - margin.left - margin.right;
    var iH = height - margin.top  - margin.bottom;

    var series = _normalizeLineSeries(data, opts);
    if (!series || series.length === 0 || series[0].values.length === 0) {
      return _emptySVG(width, height, 'No data');
    }

    var allX = [], allY = [];
    for (var s = 0; s < series.length; s++) {
      for (var p = 0; p < series[s].values.length; p++) {
        allX.push(series[s].values[p].x);
        allY.push(series[s].values[p].y);
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
        fontFamily: theme.fontFamily, titleSize: theme.titleSize, color: theme.textColor
      });
    }

    if (showGrid) {
      body += _gridLines(yScale, iW, { color: theme.gridColor, count: opts.tickCount || 5 });
    }

    var baseY = yScale(0);

    // Draw areas first (below lines)
    for (var ai = 0; ai < series.length; ai++) {
      var aser  = series[ai];
      var aColor = Array.isArray(colors) ? colors[ai % colors.length] : colors;
      var aPts  = aser.values.map(function(pt) {
        return { x: xScale(pt.x), y: yScale(pt.y) };
      });
      if (aPts.length === 0) continue;

      // Build area path: line + baseline
      var aLinePath = linePath(aPts, { curve: curve });
      if (!aLinePath) continue;
      // Area closes back along baseline
      var areaD = aLinePath +
        ' L ' + _p(aPts[aPts.length - 1].x) + ',' + _p(baseY) +
        ' L ' + _p(aPts[0].x) + ',' + _p(baseY) + ' Z';

      body += '<path d="' + areaD + '" fill="' + aColor + '" fill-opacity="' + fillOp + '" stroke="none"/>';
    }

    // Draw lines on top
    for (var li2 = 0; li2 < series.length; li2++) {
      var lser   = series[li2];
      var lColor = Array.isArray(colors) ? colors[li2 % colors.length] : colors;
      var lPts   = lser.values.map(function(pt) {
        return { x: xScale(pt.x), y: yScale(pt.y) };
      });
      var ld = linePath(lPts, { curve: curve });
      if (ld) {
        body += '<path d="' + ld + '" fill="none" stroke="' + lColor + '" stroke-width="2"/>';
      }
      if (showDots) {
        for (var di = 0; di < lPts.length; di++) {
          body += '<circle cx="' + _p(lPts[di].x) + '" cy="' + _p(lPts[di].y) + '" r="4" fill="' + lColor + '"/>';
        }
      }
    }

    body += axisBottom(xScale, {
      tickCount: opts.tickCount || 5, label: xLabel,
      fontSize: theme.fontSize, fontFamily: theme.fontFamily, color: theme.axisColor
    });
    body += axisLeft(yScale, {
      tickCount: opts.tickCount || 5, label: yLabel,
      fontSize: theme.fontSize, fontFamily: theme.fontFamily, color: theme.axisColor
    });

    if (showLeg && series.length > 1) {
      var legSeries = series.map(function(s2, idx) {
        return { name: s2.name || ('Series ' + (idx + 1)), color: colors[idx % colors.length] };
      });
      body += _legend(legSeries, {
        x: iW - 120, y: 20, fontSize: theme.fontSize, fontFamily: theme.fontFamily, textColor: theme.textColor
      });
    }

    svg.addRaw('<g transform="translate(' + margin.left + ',' + margin.top + ')">' + body + '</g>');
    return svg.toString();
  }

  // ─── Stacked bar chart ───────────────────────────────────────────────────────

  /**
   * Generates a stacked bar chart SVG string.
   *
   * @param {Array}  data   Array of row objects: [{category:'A', seriesA:10, seriesB:20}, ...]
   * @param {Object} opts
   *   width, height, margin, category (field name for categories),
   *   series (array of field names or [{key, label}]), title, subtitle,
   *   theme, colors, tickCount, showGrid, showLegend, x.label, y.label
   * @returns {String} SVG markup
   */
  function stackedBarChart(data, opts) {
    opts = opts || {};
    if (!data || data.length === 0) {
      return _emptySVG(opts.width || 400, opts.height || 300, 'No data');
    }

    var width    = opts.width  || 620;
    var height   = opts.height || 420;
    var margin   = merge({ top: 50, right: 140, bottom: 60, left: 60 }, opts.margin || {});
    var theme    = getTheme(opts.theme || 'default');
    var colors   = opts.colors || theme.colors;
    var catField = opts.category || 'category';
    var xLabel   = (opts.x && opts.x.label) || '';
    var yLabel   = (opts.y && opts.y.label) || '';
    var showGrid = opts.showGrid !== false;
    var showLeg  = opts.showLegend !== false;

    // Determine series keys
    var seriesDef;
    if (opts.series && opts.series.length) {
      seriesDef = opts.series.map(function(s) {
        return typeof s === 'string' ? { key: s, label: s } : { key: s.key, label: s.label || s.key };
      });
    } else {
      // Auto-detect: all fields except category
      seriesDef = Object.keys(data[0]).filter(function(k) {
        return k !== catField;
      }).map(function(k) { return { key: k, label: k }; });
    }

    var categories = data.map(function(d) { return String(d[catField]); });
    // Compute stacked totals
    var maxTotal = 0;
    var rows = data.map(function(d) {
      var total = 0;
      seriesDef.forEach(function(s) { total += parseFloat(d[s.key]) || 0; });
      maxTotal = Math.max(maxTotal, total);
      return d;
    });

    var iW = width  - margin.left - margin.right;
    var iH = height - margin.top  - margin.bottom;

    var xScale = scaleBand().domain(categories).range([0, iW])
                  .padding(opts.barPadding !== undefined ? opts.barPadding : 0.2);
    var yScale = scaleLinear().domain([0, maxTotal]).range([iH, 0]).nice();

    var svg  = new SVG({ width: width, height: height });
    svg.addRaw('<rect width="' + width + '" height="' + height + '" fill="' + theme.background + '"/>');

    var body = '';

    if (opts.title || opts.subtitle) {
      body += _titleBlock(opts.title, opts.subtitle, iW, {
        fontFamily: theme.fontFamily, titleSize: theme.titleSize, color: theme.textColor
      });
    }

    if (showGrid) {
      body += _gridLines(yScale, iW, { color: theme.gridColor, count: opts.tickCount || 5 });
    }

    // Draw stacked bars
    for (var ri = 0; ri < rows.length; ri++) {
      var row   = rows[ri];
      var cat   = categories[ri];
      var bx    = xScale(cat);
      var bw    = xScale.bandwidth();
      var stack = 0;

      for (var si = 0; si < seriesDef.length; si++) {
        var val   = parseFloat(row[seriesDef[si].key]) || 0;
        var bh    = Math.abs(yScale(0) - yScale(val));
        var by    = yScale(stack + val);
        var fill  = Array.isArray(colors) ? colors[si % colors.length] : colors;

        if (bh > 0) {
          body += '<rect x="' + _p(bx) + '" y="' + _p(by) + '"' +
                         ' width="' + _p(bw) + '" height="' + _p(bh) + '"' +
                         ' fill="' + fill + '"/>';
        }
        stack += val;
      }
    }

    body += axisBottom(xScale, {
      tickCount: categories.length, label: xLabel,
      fontSize: theme.fontSize, fontFamily: theme.fontFamily, color: theme.axisColor,
      tickFormat: function(t) { return String(t); }
    });
    body += axisLeft(yScale, {
      tickCount: opts.tickCount || 5, label: yLabel,
      fontSize: theme.fontSize, fontFamily: theme.fontFamily, color: theme.axisColor
    });

    // Legend
    if (showLeg) {
      var legItems = seriesDef.map(function(s, idx) {
        return { name: s.label, color: colors[idx % colors.length] };
      });
      body += _legend(legItems, {
        x: iW + 10, y: 10, fontSize: theme.fontSize, fontFamily: theme.fontFamily, textColor: theme.textColor
      });
    }

    svg.addRaw('<g transform="translate(' + margin.left + ',' + margin.top + ')">' + body + '</g>');
    return svg.toString();
  }

  // ─── Scatter plot ────────────────────────────────────────────────────────────

  /**
   * Generates a scatter plot SVG string.
   *
   * @param {Array}  data   Flat [{x,y,r,label}] or multi-series [{name, values:[{x,y,r}]}]
   * @param {Object} opts
   *   width, height, margin, x.field, y.field, r.field, x.label, y.label,
   *   title, subtitle, theme, colors, showGrid, showLabels, showLegend,
   *   dotRadius (default dot radius)
   * @returns {String} SVG markup
   */
  function scatterPlot(data, opts) {
    opts = opts || {};
    if (!data || data.length === 0) {
      return _emptySVG(opts.width || 400, opts.height || 300, 'No data');
    }

    var width    = opts.width  || 600;
    var height   = opts.height || 400;
    var margin   = merge({ top: 40, right: 30, bottom: 60, left: 60 }, opts.margin || {});
    var theme    = getTheme(opts.theme || 'default');
    var colors   = opts.colors || theme.colors;
    var xLabel   = (opts.x && opts.x.label) || '';
    var yLabel   = (opts.y && opts.y.label) || '';
    var showGrid = opts.showGrid !== false;
    var showLbls = opts.showLabels || false;
    var showLeg  = opts.showLegend || false;
    var dotR     = opts.dotRadius || 5;

    var iW = width  - margin.left - margin.right;
    var iH = height - margin.top  - margin.bottom;

    // Normalize series
    var series = _normalizeScatterSeries(data, opts);
    if (!series || series.length === 0) {
      return _emptySVG(width, height, 'No data');
    }

    var allX = [], allY = [], allR = [];
    for (var s = 0; s < series.length; s++) {
      for (var p = 0; p < series[s].values.length; p++) {
        var pt = series[s].values[p];
        allX.push(pt.x); allY.push(pt.y);
        if (pt.r) allR.push(pt.r);
      }
    }

    var xPad = (Math.max.apply(null, allX) - Math.min.apply(null, allX)) * 0.05 || 1;
    var yPad = (Math.max.apply(null, allY) - Math.min.apply(null, allY)) * 0.05 || 1;
    var xScale = scaleLinear().domain([Math.min.apply(null, allX) - xPad, Math.max.apply(null, allX) + xPad]).range([0, iW]);
    var yScale = scaleLinear().domain([Math.min.apply(null, allY) - yPad, Math.max.apply(null, allY) + yPad]).range([iH, 0]);

    var svg  = new SVG({ width: width, height: height });
    svg.addRaw('<rect width="' + width + '" height="' + height + '" fill="' + theme.background + '"/>');

    var body = '';

    if (opts.title || opts.subtitle) {
      body += _titleBlock(opts.title, opts.subtitle, iW, {
        fontFamily: theme.fontFamily, titleSize: theme.titleSize, color: theme.textColor
      });
    }

    if (showGrid) {
      body += _gridLines(yScale, iW, { color: theme.gridColor, count: opts.tickCount || 5 });
    }

    for (var si = 0; si < series.length; si++) {
      var ser   = series[si];
      var sColor= Array.isArray(colors) ? colors[si % colors.length] : colors;
      for (var pi = 0; pi < ser.values.length; pi++) {
        var pt2 = ser.values[pi];
        var cx2 = xScale(pt2.x);
        var cy2 = yScale(pt2.y);
        var r2  = pt2.r ? Math.sqrt(pt2.r) * 2 : dotR;
        body += '<circle cx="' + _p(cx2) + '" cy="' + _p(cy2) + '" r="' + _p(r2) + '"' +
                        ' fill="' + sColor + '" fill-opacity="0.7"/>';
        if (showLbls && pt2.label) {
          body += '<text x="' + _p(cx2 + r2 + 3) + '" y="' + _p(cy2 + 4) + '"' +
                        ' font-family="' + theme.fontFamily + '"' +
                        ' font-size="' + (theme.fontSize - 1) + '"' +
                        ' fill="' + theme.textColor + '">' +
                    _escapeXml(String(pt2.label)) +
                  '</text>';
        }
      }
    }

    body += axisBottom(xScale, {
      tickCount: opts.tickCount || 5, label: xLabel,
      fontSize: theme.fontSize, fontFamily: theme.fontFamily, color: theme.axisColor
    });
    body += axisLeft(yScale, {
      tickCount: opts.tickCount || 5, label: yLabel,
      fontSize: theme.fontSize, fontFamily: theme.fontFamily, color: theme.axisColor
    });

    if (showLeg && series.length > 1) {
      var legItems = series.map(function(s2, idx) {
        return { name: s2.name || ('Series ' + (idx + 1)), color: colors[idx % colors.length] };
      });
      body += _legend(legItems, {
        x: iW - 120, y: 20, fontSize: theme.fontSize, fontFamily: theme.fontFamily, textColor: theme.textColor
      });
    }

    svg.addRaw('<g transform="translate(' + margin.left + ',' + margin.top + ')">' + body + '</g>');
    return svg.toString();
  }

  function _normalizeScatterSeries(data, opts) {
    opts = opts || {};
    if (!data || !data.length) return [];
    var first = data[0];
    var xField = (opts.x && opts.x.field) || 'x';
    var yField = (opts.y && opts.y.field) || 'y';
    var rField = (opts.r && opts.r.field) || 'r';
    var lField = opts.labelField || 'label';

    if (typeof first.x !== 'undefined' || typeof first.y !== 'undefined') {
      return [{
        name  : opts.name || 'Series 1',
        values: data.map(function(d) {
          return { x: parseFloat(d[xField]) || 0, y: parseFloat(d[yField]) || 0,
                   r: d[rField] ? parseFloat(d[rField]) : null, label: d[lField] };
        })
      }];
    }
    if (typeof first.values !== 'undefined') {
      return data.map(function(s) {
        return {
          name  : s.name || s.label || '',
          values: (s.values || []).map(function(d) {
            return { x: parseFloat(d[xField]) || 0, y: parseFloat(d[yField]) || 0,
                     r: d[rField] ? parseFloat(d[rField]) : null, label: d[lField] };
          })
        };
      });
    }
    return [{ name: 'Series 1', values: data.map(function(d, i) {
      return { x: parseFloat(d[xField]) || i, y: parseFloat(d[yField]) || 0,
               r: d[rField] ? parseFloat(d[rField]) : null, label: d[lField] };
    }) }];
  }

  // ─── Heatmap ─────────────────────────────────────────────────────────────────

  /**
   * Generates a heatmap SVG string from a matrix of values.
   *
   * @param {Array}  data   Array of row objects: [{row:'Mon', col:'Jan', value:12}, ...]
   * @param {Object} opts
   *   width, height, margin, row (field), col (field), value (field),
   *   title, subtitle, theme, colorLow, colorHigh, showValues,
   *   x.label, y.label
   * @returns {String} SVG markup
   */
  function heatmap(data, opts) {
    opts = opts || {};
    if (!data || data.length === 0) {
      return _emptySVG(opts.width || 400, opts.height || 300, 'No data');
    }

    var width    = opts.width  || 600;
    var height   = opts.height || 420;
    var margin   = merge({ top: 60, right: 30, bottom: 80, left: 80 }, opts.margin || {});
    var theme    = getTheme(opts.theme || 'default');
    var rowField = opts.row   || 'row';
    var colField = opts.col   || 'col';
    var valField = opts.value || 'value';
    var colorLow = opts.colorLow  || '#eaf3fb';
    var colorHigh= opts.colorHigh || '#1a5276';
    var showVals = opts.showValues || false;
    var xLabel   = (opts.x && opts.x.label) || '';
    var yLabel   = (opts.y && opts.y.label) || '';

    var iW = width  - margin.left - margin.right;
    var iH = height - margin.top  - margin.bottom;

    // Collect unique rows/cols preserving insertion order
    var rowSet = [], colSet = [];
    var rowSeen = {}, colSeen = {};
    for (var i = 0; i < data.length; i++) {
      var rk = String(data[i][rowField]);
      var ck = String(data[i][colField]);
      if (!rowSeen[rk]) { rowSet.push(rk); rowSeen[rk] = true; }
      if (!colSeen[ck]) { colSet.push(ck); colSeen[ck] = true; }
    }

    var allVals = data.map(function(d) { return parseFloat(d[valField]) || 0; });
    var minVal  = Math.min.apply(null, allVals);
    var maxVal  = Math.max.apply(null, allVals);

    var cellW = iW / colSet.length;
    var cellH = iH / rowSet.length;

    var svg  = new SVG({ width: width, height: height });
    svg.addRaw('<rect width="' + width + '" height="' + height + '" fill="' + theme.background + '"/>');

    var body = '';

    if (opts.title || opts.subtitle) {
      body += _titleBlock(opts.title, opts.subtitle, iW, {
        fontFamily: theme.fontFamily, titleSize: theme.titleSize, color: theme.textColor
      });
    }

    // Build lookup
    var lookup = {};
    for (var di = 0; di < data.length; di++) {
      var rk2 = String(data[di][rowField]);
      var ck2 = String(data[di][colField]);
      lookup[rk2 + '|' + ck2] = parseFloat(data[di][valField]) || 0;
    }

    // Draw cells
    for (var ri = 0; ri < rowSet.length; ri++) {
      for (var ci = 0; ci < colSet.length; ci++) {
        var val   = lookup[rowSet[ri] + '|' + colSet[ci]];
        var t     = maxVal === minVal ? 0 : (val - minVal) / (maxVal - minVal);
        var fill  = _interpolateColor(colorLow, colorHigh, t);
        var cx3   = ci * cellW;
        var cy3   = ri * cellH;

        body += '<rect x="' + _p(cx3) + '" y="' + _p(cy3) + '"' +
                       ' width="' + _p(cellW - 1) + '" height="' + _p(cellH - 1) + '"' +
                       ' fill="' + fill + '"/>';

        if (showVals && val !== undefined) {
          var textFill = t > 0.6 ? '#ffffff' : theme.textColor;
          body += '<text x="' + _p(cx3 + cellW / 2) + '" y="' + _p(cy3 + cellH / 2 + 4) + '"' +
                        ' text-anchor="middle"' +
                        ' font-family="' + theme.fontFamily + '"' +
                        ' font-size="' + (theme.fontSize - 1) + '"' +
                        ' fill="' + textFill + '">' +
                    _escapeXml(_formatNum(val)) +
                  '</text>';
        }
      }
    }

    // Column labels (X axis)
    var xLabelY = iH + 20;
    for (var cj = 0; cj < colSet.length; cj++) {
      body += '<text x="' + _p(cj * cellW + cellW / 2) + '" y="' + _p(xLabelY) + '"' +
                    ' text-anchor="middle"' +
                    ' font-family="' + theme.fontFamily + '"' +
                    ' font-size="' + theme.fontSize + '"' +
                    ' fill="' + theme.axisColor + '">' +
                _escapeXml(colSet[cj]) +
              '</text>';
    }
    if (xLabel) {
      body += '<text x="' + _p(iW / 2) + '" y="' + _p(iH + 44) + '"' +
                    ' text-anchor="middle"' +
                    ' font-family="' + theme.fontFamily + '"' +
                    ' font-size="' + (theme.fontSize + 1) + '"' +
                    ' fill="' + theme.axisColor + '">' +
                _escapeXml(xLabel) +
              '</text>';
    }

    // Row labels (Y axis)
    for (var rj = 0; rj < rowSet.length; rj++) {
      body += '<text x="-8" y="' + _p(rj * cellH + cellH / 2 + 4) + '"' +
                    ' text-anchor="end"' +
                    ' font-family="' + theme.fontFamily + '"' +
                    ' font-size="' + theme.fontSize + '"' +
                    ' fill="' + theme.axisColor + '">' +
                _escapeXml(rowSet[rj]) +
              '</text>';
    }
    if (yLabel) {
      body += '<text transform="rotate(-90)"' +
                    ' x="' + _p(-iH / 2) + '" y="-55"' +
                    ' text-anchor="middle"' +
                    ' font-family="' + theme.fontFamily + '"' +
                    ' font-size="' + (theme.fontSize + 1) + '"' +
                    ' fill="' + theme.axisColor + '">' +
                _escapeXml(yLabel) +
              '</text>';
    }

    // Color legend bar
    var gradSteps = 10;
    var barW = iW * 0.3;
    var barH = 8;
    var barX = iW * 0.35;
    var barY = iH + 55;
    for (var gi = 0; gi < gradSteps; gi++) {
      var t2   = gi / (gradSteps - 1);
      var gfill= _interpolateColor(colorLow, colorHigh, t2);
      body += '<rect x="' + _p(barX + gi * barW / gradSteps) + '" y="' + _p(barY) + '"' +
                     ' width="' + _p(barW / gradSteps + 0.5) + '" height="' + barH + '"' +
                     ' fill="' + gfill + '"/>';
    }
    body += '<text x="' + _p(barX) + '" y="' + _p(barY + barH + 12) + '"' +
                  ' text-anchor="middle"' +
                  ' font-family="' + theme.fontFamily + '"' +
                  ' font-size="' + (theme.fontSize - 1) + '"' +
                  ' fill="' + theme.textColor + '">' +
              _escapeXml(_formatNum(minVal)) +
            '</text>';
    body += '<text x="' + _p(barX + barW) + '" y="' + _p(barY + barH + 12) + '"' +
                  ' text-anchor="middle"' +
                  ' font-family="' + theme.fontFamily + '"' +
                  ' font-size="' + (theme.fontSize - 1) + '"' +
                  ' fill="' + theme.textColor + '">' +
              _escapeXml(_formatNum(maxVal)) +
            '</text>';

    svg.addRaw('<g transform="translate(' + margin.left + ',' + margin.top + ')">' + body + '</g>');
    return svg.toString();
  }

  function _hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16)
    };
  }

  function _interpolateColor(low, high, t) {
    var a = _hexToRgb(low);
    var b = _hexToRgb(high);
    var r = Math.round(a.r + (b.r - a.r) * t);
    var g = Math.round(a.g + (b.g - a.g) * t);
    var bl= Math.round(a.b + (b.b - a.b) * t);
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  }

  // ─── Sparkline ───────────────────────────────────────────────────────────────

  /**
   * Generates a small inline sparkline SVG.
   *
   * @param {Array}  data   Flat numeric values or [{x,y}] objects
   * @param {Object} opts
   *   width, height, color, areaColor, showArea, strokeWidth,
   *   theme, min, max (override domain)
   * @returns {String} SVG markup
   */
  function sparkline(data, opts) {
    opts = opts || {};
    if (!data || data.length === 0) {
      return _emptySVG(opts.width || 120, opts.height || 40, '');
    }

    var width  = opts.width  || 120;
    var height = opts.height || 40;
    var pad    = opts.padding !== undefined ? opts.padding : 4;
    var theme  = getTheme(opts.theme || 'default');
    var color  = opts.color || theme.colors[0];
    var showArea = opts.showArea !== false;
    var strokeW  = opts.strokeWidth || 1.5;

    // Normalize to numeric y values
    var vals = data.map(function(d, i) {
      if (typeof d === 'number') return { x: i, y: d };
      return { x: i, y: parseFloat(d.y !== undefined ? d.y : d) || 0 };
    });

    var ys   = vals.map(function(v) { return v.y; });
    var yMin = opts.min !== undefined ? opts.min : Math.min.apply(null, ys);
    var yMax = opts.max !== undefined ? opts.max : Math.max.apply(null, ys);

    var xScale = scaleLinear().domain([0, vals.length - 1]).range([pad, width - pad]);
    var yScale = scaleLinear().domain([yMin, yMax]).range([height - pad, pad]);

    var pts = vals.map(function(v) { return { x: xScale(v.x), y: yScale(v.y) }; });
    var lp  = linePath(pts, { curve: 'monotone' });

    var svg  = new SVG({ width: width, height: height });
    svg.addRaw('<rect width="' + width + '" height="' + height + '" fill="' + theme.background + '"/>');

    if (showArea && lp) {
      var baseY2 = yScale(yMin);
      var areaD2 = lp +
        ' L ' + _p(pts[pts.length - 1].x) + ',' + _p(baseY2) +
        ' L ' + _p(pts[0].x) + ',' + _p(baseY2) + ' Z';
      svg.addRaw('<path d="' + areaD2 + '" fill="' + color + '" fill-opacity="0.15" stroke="none"/>');
    }

    if (lp) {
      svg.addRaw('<path d="' + lp + '" fill="none" stroke="' + color + '" stroke-width="' + strokeW + '"/>');
    }

    return svg.toString();
  }

  // ─── Gauge ───────────────────────────────────────────────────────────────────

  /**
   * Generates a radial gauge (arc-style) SVG.
   *
   * @param {Number} value  Current value (numeric)
   * @param {Object} opts
   *   width, height, min, max, title, unit, thresholds (array of {value, color}),
   *   theme, color, arcWidth, showNeedle, showValue, showMinMax
   * @returns {String} SVG markup
   */
  function gauge(value, opts) {
    opts = opts || {};
    var width   = opts.width  || 320;
    var height  = opts.height || 200;
    var theme   = getTheme(opts.theme || 'default');
    var minVal  = opts.min !== undefined ? opts.min : 0;
    var maxVal  = opts.max !== undefined ? opts.max : 100;
    var unit    = opts.unit    || '';
    var arcWidth= opts.arcWidth|| 28;
    var showNeedle = opts.showNeedle !== false;
    var showValue  = opts.showValue  !== false;
    var showMinMax = opts.showMinMax !== false;

    // Clamp value
    var clampedVal = Math.min(maxVal, Math.max(minVal, value));
    var t = (clampedVal - minVal) / (maxVal - minVal);

    // Gauge arc: from -π*0.75 to π*0.75 (270° sweep, starting bottom-left)
    var startA = Math.PI * 0.75;
    var endA   = Math.PI * 2.25;
    var sweepA = endA - startA;

    var cx  = width / 2;
    var cy  = height * 0.72;
    var outerR2 = Math.min(width / 2, height * 0.75) - 10;
    var innerR2 = outerR2 - arcWidth;

    // Determine fill color from thresholds
    var fillColor = opts.color || theme.colors[0];
    if (opts.thresholds && opts.thresholds.length) {
      for (var ti = 0; ti < opts.thresholds.length; ti++) {
        if (clampedVal >= opts.thresholds[ti].value) {
          fillColor = opts.thresholds[ti].color;
        }
      }
    }

    var svg  = new SVG({ width: width, height: height });
    svg.addRaw('<rect width="' + width + '" height="' + height + '" fill="' + theme.background + '"/>');

    var body = '';

    // Title
    if (opts.title) {
      body += '<text x="' + _p(cx) + '" y="20"' +
                    ' text-anchor="middle"' +
                    ' font-family="' + theme.fontFamily + '"' +
                    ' font-size="' + theme.fontSize + '"' +
                    ' font-weight="bold"' +
                    ' fill="' + theme.textColor + '">' +
                _escapeXml(opts.title) +
              '</text>';
    }

    // Background arc (full track)
    var bgArc = _arc(cx, cy, outerR2, innerR2, startA, endA);
    body += '<path d="' + bgArc + '" fill="' + theme.gridColor + '"/>';

    // Value arc
    var valAngle = startA + sweepA * t;
    if (t > 0) {
      var valArc = _arc(cx, cy, outerR2, innerR2, startA, valAngle);
      body += '<path d="' + valArc + '" fill="' + fillColor + '"/>';
    }

    // Needle
    if (showNeedle) {
      var needleAngle = startA + sweepA * t;
      var needleLen   = innerR2 - 6;
      var nx = cx + needleLen * Math.sin(needleAngle);
      var ny = cy - needleLen * Math.cos(needleAngle);
      body += '<line x1="' + _p(cx) + '" y1="' + _p(cy) + '"' +
                     ' x2="' + _p(nx) + '" y2="' + _p(ny) + '"' +
                     ' stroke="' + theme.textColor + '" stroke-width="2.5"' +
                     ' stroke-linecap="round"/>';
      body += '<circle cx="' + _p(cx) + '" cy="' + _p(cy) + '" r="5" fill="' + theme.textColor + '"/>';
    }

    // Value label
    if (showValue) {
      body += '<text x="' + _p(cx) + '" y="' + _p(cy + 22) + '"' +
                    ' text-anchor="middle"' +
                    ' font-family="' + theme.fontFamily + '"' +
                    ' font-size="' + (theme.titleSize + 4) + '"' +
                    ' font-weight="bold"' +
                    ' fill="' + fillColor + '">' +
                _escapeXml(String(value) + (unit ? ' ' + unit : '')) +
              '</text>';
    }

    // Min / max labels
    if (showMinMax) {
      var minPt = _polarToXY(cx, cy, outerR2 + 12, startA);
      var maxPt = _polarToXY(cx, cy, outerR2 + 12, endA);
      body += '<text x="' + _p(minPt.x) + '" y="' + _p(minPt.y) + '"' +
                    ' text-anchor="middle"' +
                    ' font-family="' + theme.fontFamily + '"' +
                    ' font-size="' + (theme.fontSize - 1) + '"' +
                    ' fill="' + theme.axisColor + '">' +
                _escapeXml(String(minVal)) +
              '</text>';
      body += '<text x="' + _p(maxPt.x) + '" y="' + _p(maxPt.y) + '"' +
                    ' text-anchor="middle"' +
                    ' font-family="' + theme.fontFamily + '"' +
                    ' font-size="' + (theme.fontSize - 1) + '"' +
                    ' fill="' + theme.axisColor + '">' +
                _escapeXml(String(maxVal)) +
              '</text>';
    }

    svg.addRaw(body);
    return svg.toString();
  }

  // ─── Progress bar ────────────────────────────────────────────────────────────

  /**
   * Generates a horizontal progress bar SVG.
   *
   * @param {Number|Array} value  Single value 0-100, or array of [{label,value,color}]
   * @param {Object} opts
   *   width, height, title, max, showPercent, showValue, color,
   *   theme, barHeight, rounded
   * @returns {String} SVG markup
   */
  function progressBar(value, opts) {
    opts = opts || {};
    var width   = opts.width   || 400;
    var height  = opts.height  || (Array.isArray(value) ? value.length * 44 + 40 : 80);
    var theme   = getTheme(opts.theme || 'default');
    var maxVal  = opts.max !== undefined ? opts.max : 100;
    var barH    = opts.barHeight || 22;
    var rounded = opts.rounded !== false;
    var rx      = rounded ? Math.round(barH / 2) : 0;

    var svg  = new SVG({ width: width, height: height });
    svg.addRaw('<rect width="' + width + '" height="' + height + '" fill="' + theme.background + '"/>');

    var body = '';
    var padX = 16;
    var startY = opts.title ? 30 : 10;

    if (opts.title) {
      body += '<text x="' + _p(width / 2) + '" y="18"' +
                    ' text-anchor="middle"' +
                    ' font-family="' + theme.fontFamily + '"' +
                    ' font-size="' + theme.fontSize + '"' +
                    ' font-weight="bold"' +
                    ' fill="' + theme.textColor + '">' +
                _escapeXml(opts.title) +
              '</text>';
    }

    var items = Array.isArray(value) ? value : [{ label: '', value: value, color: opts.color }];
    var barW  = width - 2 * padX;

    for (var ii = 0; ii < items.length; ii++) {
      var item  = items[ii];
      var ival  = Math.min(maxVal, Math.max(0, parseFloat(item.value) || 0));
      var bColor= item.color || opts.color || theme.colors[ii % theme.colors.length];
      var by    = startY + ii * (barH + 22);
      var fillW = barW * ival / maxVal;

      if (item.label) {
        body += '<text x="' + _p(padX) + '" y="' + _p(by) + '"' +
                      ' font-family="' + theme.fontFamily + '"' +
                      ' font-size="' + theme.fontSize + '"' +
                      ' fill="' + theme.textColor + '">' +
                  _escapeXml(String(item.label)) +
                '</text>';
        by += 16;
      }

      // Track
      body += '<rect x="' + _p(padX) + '" y="' + _p(by) + '"' +
                     ' width="' + _p(barW) + '" height="' + barH + '"' +
                     ' rx="' + rx + '" fill="' + theme.gridColor + '"/>';
      // Fill
      if (fillW > 0) {
        body += '<rect x="' + _p(padX) + '" y="' + _p(by) + '"' +
                       ' width="' + _p(fillW) + '" height="' + barH + '"' +
                       ' rx="' + rx + '" fill="' + bColor + '"/>';
      }
      // Value label
      if (opts.showPercent !== false || opts.showValue) {
        var pctText = opts.showValue ? _formatNum(ival) + (opts.unit || '') : _formatNum(Math.round(ival / maxVal * 100)) + '%';
        var labelX  = padX + Math.min(fillW + 5, barW - 30);
        var labelFill = fillW > barW * 0.5 ? '#ffffff' : theme.textColor;
        body += '<text x="' + _p(padX + barW / 2) + '" y="' + _p(by + barH / 2 + 4) + '"' +
                      ' text-anchor="middle"' +
                      ' font-family="' + theme.fontFamily + '"' +
                      ' font-size="' + (theme.fontSize - 1) + '"' +
                      ' fill="' + labelFill + '">' +
                  _escapeXml(pctText) +
                '</text>';
      }
    }

    svg.addRaw(body);
    return svg.toString();
  }

  // ─── KPI card ─────────────────────────────────────────────────────────────────

  /**
   * Generates a KPI metric display card SVG.
   *
   * @param {Object|Array} data  Single {label, value, unit, change, changeLabel, icon} or array of them
   * @param {Object} opts
   *   width, height, theme, cols (columns for grid layout), cardPad,
   *   positiveColor, negativeColor
   * @returns {String} SVG markup
   */
  function kpiCard(data, opts) {
    opts = opts || {};
    var items  = Array.isArray(data) ? data : [data];
    var theme  = getTheme(opts.theme || 'default');
    var cols   = opts.cols || Math.min(items.length, 4);
    var rows   = Math.ceil(items.length / cols);
    var cardPad= opts.cardPad || 12;
    var width  = opts.width  || (cols * 180 + 20);
    var height = opts.height || (rows * 110 + 20);
    var cardW  = (width - 20) / cols - 8;
    var cardH  = (height - 20) / rows - 8;
    var posColor = opts.positiveColor || '#27ae60';
    var negColor = opts.negativeColor || '#e74c3c';

    var svg  = new SVG({ width: width, height: height });
    svg.addRaw('<rect width="' + width + '" height="' + height + '" fill="' + theme.background + '"/>');

    var body = '';

    for (var ii = 0; ii < items.length; ii++) {
      var item = items[ii];
      var col2 = ii % cols;
      var row2 = Math.floor(ii / cols);
      var kx   = 10 + col2 * (cardW + 8);
      var ky   = 10 + row2 * (cardH + 8);

      // Card background
      var cardBg = theme.background === '#ffffff' ? '#f4f6f7' : _adjustLightness(theme.background, 0.08);
      body += '<rect x="' + _p(kx) + '" y="' + _p(ky) + '"' +
                     ' width="' + _p(cardW) + '" height="' + _p(cardH) + '"' +
                     ' rx="6" fill="' + cardBg + '"/>';

      // Label
      body += '<text x="' + _p(kx + cardPad) + '" y="' + _p(ky + cardPad + theme.fontSize) + '"' +
                    ' font-family="' + theme.fontFamily + '"' +
                    ' font-size="' + theme.fontSize + '"' +
                    ' fill="' + theme.axisColor + '">' +
                _escapeXml(String(item.label || '')) +
              '</text>';

      // Main value
      var valStr  = String(item.value !== undefined ? item.value : '') + (item.unit ? ' ' + item.unit : '');
      var valSize = Math.min(theme.titleSize + 10, Math.floor(cardW / (valStr.length * 0.6 + 1)));
      body += '<text x="' + _p(kx + cardPad) + '" y="' + _p(ky + cardPad + theme.fontSize + valSize + 6) + '"' +
                    ' font-family="' + theme.fontFamily + '"' +
                    ' font-size="' + valSize + '"' +
                    ' font-weight="bold"' +
                    ' fill="' + theme.textColor + '">' +
                _escapeXml(valStr) +
              '</text>';

      // Change indicator
      if (item.change !== undefined) {
        var chgVal  = parseFloat(item.change) || 0;
        var chgClr  = chgVal >= 0 ? posColor : negColor;
        var chgSign = chgVal >= 0 ? '▲' : '▼';
        var chgStr  = chgSign + ' ' + Math.abs(chgVal) + (item.changeLabel || '%');
        body += '<text x="' + _p(kx + cardPad) + '" y="' + _p(ky + cardH - cardPad - 2) + '"' +
                      ' font-family="' + theme.fontFamily + '"' +
                      ' font-size="' + (theme.fontSize - 1) + '"' +
                      ' fill="' + chgClr + '">' +
                  _escapeXml(chgStr) +
                '</text>';
      }
    }

    svg.addRaw(body);
    return svg.toString();
  }

  function _adjustLightness(hex, amount) {
    try {
      var rgb = _hexToRgb(hex);
      var r = Math.min(255, Math.max(0, Math.round(rgb.r + amount * 255)));
      var g = Math.min(255, Math.max(0, Math.round(rgb.g + amount * 255)));
      var b = Math.min(255, Math.max(0, Math.round(rgb.b + amount * 255)));
      return 'rgb(' + r + ',' + g + ',' + b + ')';
    } catch (e) { return hex; }
  }

  // ─── Bullet chart ────────────────────────────────────────────────────────────

  /**
   * Generates a bullet chart SVG (shows actual vs. target with qualitative ranges).
   *
   * @param {Object|Array} data  Single {label, value, target, ranges:[{value,color}]} or array
   * @param {Object} opts
   *   width, height, title, theme, barHeight, x.label, showValues
   * @returns {String} SVG markup
   */
  function bulletChart(data, opts) {
    opts = opts || {};
    var items  = Array.isArray(data) ? data : [data];
    if (!items || items.length === 0) {
      return _emptySVG(opts.width || 400, opts.height || 100, 'No data');
    }

    var width   = opts.width  || 500;
    var rowH    = opts.barHeight || 36;
    var labelW  = opts.labelWidth || 100;
    var margin  = merge({ top: 30, right: 40, bottom: 20, left: labelW }, opts.margin || {});
    var theme   = getTheme(opts.theme || 'default');
    var showVals= opts.showValues !== false;
    var height  = opts.height || (items.length * (rowH + 16) + margin.top + margin.bottom);

    var iW = width - margin.left - margin.right;

    // Compute global max
    var allMax = 0;
    for (var ii = 0; ii < items.length; ii++) {
      var item = items[ii];
      allMax = Math.max(allMax, parseFloat(item.value) || 0, parseFloat(item.target) || 0);
      if (item.ranges) {
        item.ranges.forEach(function(rng) { allMax = Math.max(allMax, parseFloat(rng.value) || 0); });
      }
    }
    var xScale = scaleLinear().domain([0, allMax]).range([0, iW]).nice();
    allMax = xScale.domain()[1];
    xScale = scaleLinear().domain([0, allMax]).range([0, iW]);

    var svg  = new SVG({ width: width, height: height });
    svg.addRaw('<rect width="' + width + '" height="' + height + '" fill="' + theme.background + '"/>');

    var body = '';

    if (opts.title) {
      body += _titleBlock(opts.title, '', width - margin.left - margin.right, {
        fontFamily: theme.fontFamily, titleSize: theme.fontSize + 2, color: theme.textColor
      });
    }

    for (var ri = 0; ri < items.length; ri++) {
      var row  = items[ri];
      var ry   = margin.top + ri * (rowH + 16);
      var val  = parseFloat(row.value)  || 0;
      var tgt  = parseFloat(row.target) || 0;
      var barH2= Math.round(rowH * 0.45);

      // Row label (in left margin)
      body += '<text x="-8" y="' + _p(ry + rowH / 2 + 4) + '"' +
                    ' text-anchor="end"' +
                    ' font-family="' + theme.fontFamily + '"' +
                    ' font-size="' + theme.fontSize + '"' +
                    ' fill="' + theme.textColor + '">' +
                _escapeXml(String(row.label || '')) +
              '</text>';

      // Qualitative background ranges (lightest first)
      if (row.ranges && row.ranges.length) {
        var sortedRanges = row.ranges.slice().sort(function(a, b) {
          return parseFloat(b.value) - parseFloat(a.value);
        });
        for (var rng = 0; rng < sortedRanges.length; rng++) {
          var rngW = xScale(parseFloat(sortedRanges[rng].value) || 0);
          var rngColor = sortedRanges[rng].color || theme.gridColor;
          body += '<rect x="0" y="' + _p(ry) + '"' +
                         ' width="' + _p(rngW) + '" height="' + rowH + '"' +
                         ' fill="' + rngColor + '"/>';
        }
      } else {
        body += '<rect x="0" y="' + _p(ry) + '"' +
                       ' width="' + _p(iW) + '" height="' + rowH + '"' +
                       ' fill="' + theme.gridColor + '"/>';
      }

      // Value bar (centered vertically)
      var valBarY = ry + (rowH - barH2) / 2;
      body += '<rect x="0" y="' + _p(valBarY) + '"' +
                     ' width="' + _p(xScale(val)) + '" height="' + _p(barH2) + '"' +
                     ' fill="' + theme.colors[0] + '"/>';

      // Target marker
      if (tgt > 0) {
        var tgtX = xScale(tgt);
        body += '<line x1="' + _p(tgtX) + '" y1="' + _p(ry + 4) + '"' +
                       ' x2="' + _p(tgtX) + '" y2="' + _p(ry + rowH - 4) + '"' +
                       ' stroke="' + theme.textColor + '" stroke-width="3"/>';
      }

      // Value labels
      if (showVals) {
        body += '<text x="' + _p(xScale(val) + 4) + '" y="' + _p(ry + rowH / 2 + 4) + '"' +
                      ' font-family="' + theme.fontFamily + '"' +
                      ' font-size="' + (theme.fontSize - 1) + '"' +
                      ' fill="' + theme.textColor + '">' +
                  _escapeXml(_formatNum(val)) +
                '</text>';
      }
    }

    // X axis ticks
    var xTicks = xScale.ticks(5);
    for (var xti = 0; xti < xTicks.length; xti++) {
      var xtx = xScale(xTicks[xti]);
      body += '<text x="' + _p(xtx) + '" y="' + _p(height - margin.bottom - 4) + '"' +
                    ' text-anchor="middle"' +
                    ' font-family="' + theme.fontFamily + '"' +
                    ' font-size="' + (theme.fontSize - 1) + '"' +
                    ' fill="' + theme.axisColor + '">' +
                _escapeXml(_formatNum(xTicks[xti])) +
              '</text>';
    }
    body += '<line x1="0" y1="' + _p(height - margin.bottom - margin.top) + '"' +
                   ' x2="' + _p(iW) + '" y2="' + _p(height - margin.bottom - margin.top) + '"' +
                   ' stroke="' + theme.axisColor + '"/>';

    svg.addRaw('<g transform="translate(' + margin.left + ',0)">' + body + '</g>');
    return svg.toString();
  }

  // ─── Timeline ────────────────────────────────────────────────────────────────

  /**
   * Generates a horizontal event timeline SVG.
   *
   * @param {Array}  data   Array of [{label, date, description, color}]
   * @param {Object} opts
   *   width, height, title, theme, dotRadius, lineColor,
   *   labelAbove (alternate above/below labels)
   * @returns {String} SVG markup
   */
  function timeline(data, opts) {
    opts = opts || {};
    if (!data || data.length === 0) {
      return _emptySVG(opts.width || 600, opts.height || 160, 'No events');
    }

    var width   = opts.width  || 700;
    var height  = opts.height || 180;
    var theme   = getTheme(opts.theme || 'default');
    var colors  = opts.colors || theme.colors;
    var dotR    = opts.dotRadius || 8;
    var padX    = opts.padX !== undefined ? opts.padX : 40;
    var lineY   = Math.round(height * 0.52);
    var lineColor = opts.lineColor || theme.gridColor;

    var svg  = new SVG({ width: width, height: height });
    svg.addRaw('<rect width="' + width + '" height="' + height + '" fill="' + theme.background + '"/>');

    var body = '';

    if (opts.title) {
      body += '<text x="' + _p(width / 2) + '" y="18"' +
                    ' text-anchor="middle"' +
                    ' font-family="' + theme.fontFamily + '"' +
                    ' font-size="' + theme.fontSize + '"' +
                    ' font-weight="bold"' +
                    ' fill="' + theme.textColor + '">' +
                _escapeXml(opts.title) +
              '</text>';
    }

    // Compute x positions
    var n   = data.length;
    var step= n > 1 ? (width - 2 * padX) / (n - 1) : 0;

    // Main line
    body += '<line x1="' + _p(padX) + '" y1="' + _p(lineY) + '"' +
                   ' x2="' + _p(width - padX) + '" y2="' + _p(lineY) + '"' +
                   ' stroke="' + lineColor + '" stroke-width="2"/>';

    for (var ei = 0; ei < data.length; ei++) {
      var ev      = data[ei];
      var ex      = padX + ei * step;
      var eColor  = ev.color || (Array.isArray(colors) ? colors[ei % colors.length] : colors);
      var above   = opts.labelAbove !== false ? (ei % 2 === 0) : false;

      // Connector line
      var connY2 = above ? lineY - dotR - 2 : lineY + dotR + 2;
      var labelY2= above ? lineY - dotR - 28 : lineY + dotR + 26;
      body += '<line x1="' + _p(ex) + '" y1="' + _p(lineY) + '"' +
                     ' x2="' + _p(ex) + '" y2="' + _p(connY2) + '"' +
                     ' stroke="' + eColor + '" stroke-width="1"/>';

      // Dot
      body += '<circle cx="' + _p(ex) + '" cy="' + _p(lineY) + '" r="' + dotR + '"' +
                       ' fill="' + eColor + '"/>';

      // Date label
      if (ev.date) {
        body += '<text x="' + _p(ex) + '" y="' + _p(above ? lineY - dotR - 14 : lineY + dotR + 14) + '"' +
                      ' text-anchor="middle"' +
                      ' font-family="' + theme.fontFamily + '"' +
                      ' font-size="' + (theme.fontSize - 1) + '"' +
                      ' fill="' + theme.axisColor + '">' +
                  _escapeXml(String(ev.date)) +
                '</text>';
      }

      // Event label
      body += '<text x="' + _p(ex) + '" y="' + _p(labelY2) + '"' +
                    ' text-anchor="middle"' +
                    ' font-family="' + theme.fontFamily + '"' +
                    ' font-size="' + theme.fontSize + '"' +
                    ' font-weight="bold"' +
                    ' fill="' + theme.textColor + '">' +
                _escapeXml(String(ev.label || '')) +
              '</text>';
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
    barChart         : barChart,
    stackedBarChart  : stackedBarChart,
    lineChart        : lineChart,
    areaChart        : areaChart,
    scatterPlot      : scatterPlot,
    pieChart         : pieChart,
    heatmap          : heatmap,
    sparkline        : sparkline,

    // Diagrams & infographics
    gauge       : gauge,
    progressBar : progressBar,
    kpiCard     : kpiCard,
    bulletChart : bulletChart,
    timeline    : timeline,

    // Utilities
    getTheme   : getTheme,
    themes     : THEMES,

    // Low-level helpers (exposed for advanced usage)
    _escapeXml       : _escapeXml,
    _formatNum       : _formatNum,
    _linearTicks     : _linearTicks,
    _arc             : _arc,
    _interpolateColor: _interpolateColor
  };

})();

// CommonJS / OpenAF export
if (typeof exports !== 'undefined') {
  exports.D3SVG              = D3SVG;
  exports.SVG                = D3SVG.SVG;
  exports.scaleLinear        = D3SVG.scaleLinear;
  exports.scaleBand          = D3SVG.scaleBand;
  exports.linePath           = D3SVG.linePath;
  exports.arcPath            = D3SVG.arcPath;
  exports.axisBottom         = D3SVG.axisBottom;
  exports.axisLeft           = D3SVG.axisLeft;
  exports.barChart           = D3SVG.barChart;
  exports.stackedBarChart    = D3SVG.stackedBarChart;
  exports.lineChart          = D3SVG.lineChart;
  exports.areaChart          = D3SVG.areaChart;
  exports.scatterPlot        = D3SVG.scatterPlot;
  exports.pieChart           = D3SVG.pieChart;
  exports.heatmap            = D3SVG.heatmap;
  exports.sparkline          = D3SVG.sparkline;
  exports.gauge              = D3SVG.gauge;
  exports.progressBar        = D3SVG.progressBar;
  exports.kpiCard            = D3SVG.kpiCard;
  exports.bulletChart        = D3SVG.bulletChart;
  exports.timeline           = D3SVG.timeline;
  exports.getTheme           = D3SVG.getTheme;
  exports.themes             = D3SVG.themes;
  exports._escapeXml         = D3SVG._escapeXml;
  exports._formatNum         = D3SVG._formatNum;
  exports._linearTicks       = D3SVG._linearTicks;
  exports._arc               = D3SVG._arc;
  exports._interpolateColor  = D3SVG._interpolateColor;
}
