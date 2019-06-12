/**
 * Author: Nuno Aguiar
 * 
 * toHCL code adapted from https://github.com/NewSpring/node-hcl
 * fromHCL code adapted from https://github.com/gokmen/hcl-to-json
 */

/**
 * <odoc>
 * <key>Terraform.Terraform()</key>
 * Creates a new instance of a terraform wrapper.
 * </odoc>
 */
var Terraform = function() {
};

/**
 * <odoc>
 * <key>Terraform.toHCL(aObject) : String</key>
 * Tries to convert a javascript aObject into a HCL representation.
 * </odoc>
 */
Terraform.prototype.toHCL = function(data) {
    var TypeOf = function(aObj) {
        if (isUnDef(aObj)) return "undefined";
        if (aObj == null) return "null";
        if (isBoolean(aObj)) return "boolean";
        if (isNumber(aObj)) return "number";
        if (isString(aObj)) return "string";
        if (isFunction(aObj)) return "function";
        if (isArray(aObj)) return "array";
        if (isObject(aObj)) return "object";
    };

    let string = [],
        nodes = [],
        indentLevel = "";

    function buildBlock(member) {
        //console.log(member)
        return [];
    }

    var handlers = {
        "undefined": function () {
            // objects will not have `undefined` converted to `null`
            // as this may have unintended consequences
            // For arrays, however, this behavior seems appropriate
            return undefined;
        }, 
        "null": function () {
            return null;
        },
        "number": function (x) {
            return x;
        },
        "boolean": function (x) {
            return x;
        },
        "string": function (x) {
            // to avoid the string "true" being confused with the
            // the literal `true`, we always wrap strings in quotes
            return JSON.stringify(x);
        },
        "array": function (x) {
            var output = '[';

            if (0 === x.length) {
            output += '[]';
            return output;
            }

            indentLevel = indentLevel.replace(/$/, '  ');
            x.forEach(function (y, index) {
            // TODO how should `undefined` be handled?
            var handler = handlers[TypeOf(y)];

            output += '\n' + indentLevel + '  ' + handler(y);

            if (index !== (x.length - 1)) {
                output += ","
            }

            });
            output += "\n" + indentLevel + "]"
            indentLevel = indentLevel.replace(/  /, '');

            return output;
        },
        "object": function (x) {

            let output = "{\n";

            indentLevel = indentLevel.replace(/$/, "  ");

            for (let key in x) {
                // console.log(output);
                if (TypeOf(x[key]) === "object") {
                    output += "\n";
                }
                output += indentLevel + key + " = " + handlers[TypeOf(x[key])](x[key]) + "\n";
            }

            indentLevel = indentLevel.replace(/  /, '');
            output += indentLevel + "}";
            return output;
        },
        "function": function () {
            // TODO this should throw or otherwise be ignored
            return '[object Function]';
        }
    };
    // return handlers[TypeOf(data)](data) + '\n';

    for (let node in data) {
        let value = data[node];
        let nodeString = [];

        let objectLiterals = 0,
            nonObjectLiterals = 0;

        // evaluate the content of the blocks
        // to see if we should format this in a nice way
        for (let member in value) {
        if (TypeOf(value[member]) === "object") {
            objectLiterals++
        } else {
            nonObjectLiterals++
        }
        }

        if (objectLiterals > nonObjectLiterals) {

        for (let member in value) {
            // indentLevel = indentLevel.replace(/$/, "  ");

            if (TypeOf(value[member]) === "object") {

            let stringifiedValue = handlers[TypeOf(value[member])](value[member]);

            let newNode = [
                node + ' "' + member + '" ' + stringifiedValue
            ];
            
            nodes.push(newNode.join("\n"));
            }

        }

        } else {
        // open block
        nodeString.push(node + " {");


        // build block memebers
        for (let member in value) {

            indentLevel = indentLevel.replace(/$/, "  ");
            if (TypeOf(value[member]) === "object") {
            nodeString.push("")
            }
            let stringifiedValue = handlers[TypeOf(value[member])](value[member]);

            nodeString.push(
            indentLevel + member + " = " + stringifiedValue
            );
            indentLevel = indentLevel.replace(/  /, '');
        }

        // close block
        nodeString.push("}");
        }


        nodes.push(nodeString.join("\n"));
    }

    for (let node of nodes) {
        if (nodes.indexOf(node) === (nodes.length -1)) {
        string.push(node);
        } else {
        string.push(node + "\n");
        }

    }

    return string.join("\n").replace(/\n\n+/g,"\n").replace(/\n$/,"");
};

/**
 * <odoc>
 * <key>Terraform.fromHCL(aString) : Object</key>
 * Tries to convert from HCL representation provide in aString into a javascript object.
 * </odoc>
 */
Terraform.prototype.fromHCL = function(aString) {
    var parser = function() {
        "use strict";
      
        /*
         * Generated by PEG.js 0.9.0.
         *
         * http://pegjs.org/
         */
      
        function peg$subclass(child, parent) {
          function ctor() { this.constructor = child; }
          ctor.prototype = parent.prototype;
          child.prototype = new ctor();
        }
      
        function peg$SyntaxError(message, expected, found, location) {
          this.message  = message;
          this.expected = expected;
          this.found    = found;
          this.location = location;
          this.name     = "SyntaxError";
      
          if (typeof Error.captureStackTrace === "function") {
            Error.captureStackTrace(this, peg$SyntaxError);
          }
        }
      
        peg$subclass(peg$SyntaxError, Error);
      
        function peg$parse(input) {
          var options = arguments.length > 1 ? arguments[1] : {},
              parser  = this,
      
              peg$FAILED = {},
      
              peg$startRuleFunctions = { start: peg$parsestart },
              peg$startRuleFunction  = peg$parsestart,
      
              peg$c0 = function(sections) {
                  let root = {};
      
                  const extend = function(base, obj) {
                    for (let i in obj) {
                      if (obj.hasOwnProperty(i)) {
                         base[i] = obj[i];
                      }
                    }
                  };
      
                  sections.forEach(function (el) {
                    let parent = root[el.parent_key]
                    if (el.child_key) {
                      root[el.parent_key] || (root[el.parent_key] = {});
      
                      let child_object = {}
                      child_object[el.child_key] = el.value
      
                      root[el.parent_key][el.child_key] || (root[el.parent_key][el.child_key] = {})
      
      
                      let child_value = child_object[el.child_key]
                      extend(root[el.parent_key][el.child_key], child_value);
      
                    } else {
                      root[el.parent_key] = el.value;
                    }
                  });
      
                  return root;
                },
              peg$c1 = function(parent_key, value) {
                  let child;
                  let child_key = false;
                  // console.log('foo %j', value);
      
                  switch(value.hint) {
                    case 'section':
                      if (value.parent_key && value.child_key) {
                        child_key = value.parent_key
                        child = {}
                        child[value.child_key] = value.value
                      } else {
                        child_key = value.parent_key
                        child = value.value;
                      }
                      break;
                    case 'block':
                      child = value.value;
                      break;
                    default:
                      child = value
                  };
      
                  return {
                    parent_key: parent_key,
                    hint: 'section',
                    value: child,
                    child_key: child_key
                  };
                },
              peg$c2 = function(first, m) { return m; },
              peg$c3 = function(first, rest) {
                        let joined = {};
                        let value = [first]
                          .concat(rest)
                          .forEach(function (el) {
                            if (Array.isArray(el)) {
      
                              let parent_key = el[0]
                              let child_value = el[1].value
      
                              if (!joined[parent_key]) {
                                joined[parent_key] = child_value
                              } else if (!Array.isArray(joined[parent_key])){
      
                                let previousValue = joined[parent_key]
      
                                joined[parent_key] = []
                                joined[parent_key].push(previousValue)
                                joined[parent_key].push(child_value)
      
                              } else {
                                joined[parent_key].push(child_value)
                              }
      
                            } else if (el.value.hint) {
                              joined[el.parent_key] = el.value.value
      
                            } else {
                              joined[el.parent_key] = el.value;
      
                            }
                            return
                          });
      
                        return {hint: 'block', value: joined};
                      },
              peg$c4 = function(members) { return members !== null ? members: {}; },
              peg$c5 = function(parent_key, value) {
                  return {parent_key: parent_key, hint: 'block_member', value: value};
                },
              peg$c6 = /^[a-zA-Z_]/,
              peg$c7 = { type: "class", value: "[a-zA-Z_]", description: "[a-zA-Z_]" },
              peg$c8 = /^[a-zA-Z0-9_$\-]/,
              peg$c9 = { type: "class", value: "[a-zA-Z0-9_$-]", description: "[a-zA-Z0-9_$-]" },
              peg$c10 = function(first, rest) { return first + rest.join(""); },
              peg$c11 = function(first, rest) {
                        let result = {hint: 'object'};
      
                        [first]
                        .concat(rest)
                        .forEach(function (e) {
                            result[e.name] = e.value;
                        });
      
                        return result;
                      },
              peg$c12 = function(name, value) {
                  return { name: name, value: value };
                },
              peg$c13 = function(first, rest) {
                  return [first].concat(rest.map(function(d) { return d[1]; }));
                },
              peg$c14 = function() { return []; },
              peg$c15 = "[",
              peg$c16 = { type: "literal", value: "[", description: "\"[\"" },
              peg$c17 = "{",
              peg$c18 = { type: "literal", value: "{", description: "\"{\"" },
              peg$c19 = "]",
              peg$c20 = { type: "literal", value: "]", description: "\"]\"" },
              peg$c21 = "}",
              peg$c22 = { type: "literal", value: "}", description: "\"}\"" },
              peg$c23 = ":",
              peg$c24 = { type: "literal", value: ":", description: "\":\"" },
              peg$c25 = ",",
              peg$c26 = { type: "literal", value: ",", description: "\",\"" },
              peg$c27 = "=",
              peg$c28 = { type: "literal", value: "=", description: "\"=\"" },
              peg$c29 = { type: "other", description: "string" },
              peg$c30 = "\"",
              peg$c31 = { type: "literal", value: "\"", description: "\"\\\"\"" },
              peg$c32 = function(chars) { return chars.join(""); },
              peg$c33 = "(\"",
              peg$c34 = { type: "literal", value: "(\"", description: "\"(\\\"\"" },
              peg$c35 = "\")",
              peg$c36 = { type: "literal", value: "\")", description: "\"\\\")\"" },
              peg$c37 = function(chars) { return '("' + chars.join("") + '")'; },
              peg$c38 = "\\",
              peg$c39 = { type: "literal", value: "\\", description: "\"\\\\\"" },
              peg$c40 = { type: "any", description: "any character" },
              peg$c41 = function(char_) { return char_; },
              peg$c42 = function(sequence) { return sequence; },
              peg$c43 = "0",
              peg$c44 = { type: "literal", value: "0", description: "\"0\"" },
              peg$c45 = function() { return "\0"; },
              peg$c46 = /^['"\\bfnrtv]/,
              peg$c47 = { type: "class", value: "['\"\\\\bfnrtv]", description: "['\"\\\\bfnrtv]" },
              peg$c48 = function(char_) {
                  return char_
                  .replace("b", "\b")
                  .replace("f", "\f")
                  .replace("n", "\n")
                  .replace("r", "\r")
                  .replace("t", "\t")
                  .replace("v", "\x0B");
                },
              peg$c49 = "x",
              peg$c50 = { type: "literal", value: "x", description: "\"x\"" },
              peg$c51 = "u",
              peg$c52 = { type: "literal", value: "u", description: "\"u\"" },
              peg$c53 = function(h1, h2) {
                    return String.fromCharCode(+("0x" + h1 + h2));
                },
              peg$c54 = function(h1, h2, h3, h4) {
                    return String.fromCharCode(+("0x" + h1 + h2 + h3 + h4));
                },
              peg$c55 = "b",
              peg$c56 = { type: "literal", value: "b", description: "\"b\"" },
              peg$c57 = function(numeric, power) { return numeric * Math.pow(1024, power); },
              peg$c58 = function(numeric, power) { return numeric * Math.pow(1000, power); },
              peg$c59 = /^[kK]/,
              peg$c60 = { type: "class", value: "[kK]", description: "[kK]" },
              peg$c61 = function() { return 1; },
              peg$c62 = /^[mM]/,
              peg$c63 = { type: "class", value: "[mM]", description: "[mM]" },
              peg$c64 = function() { return 2; },
              peg$c65 = /^[gG]/,
              peg$c66 = { type: "class", value: "[gG]", description: "[gG]" },
              peg$c67 = function() { return 3; },
              peg$c68 = "-",
              peg$c69 = { type: "literal", value: "-", description: "\"-\"" },
              peg$c70 = function(number) { return -number; },
              peg$c71 = function(int_, frac, exp) { return +(int_ + frac + exp); },
              peg$c72 = function(int_, frac) { return +(int_ + frac); },
              peg$c73 = function(int_, exp) { return +(int_ + exp); },
              peg$c74 = function(frac) { return +frac; },
              peg$c75 = function(int_) { return +int_; },
              peg$c76 = function(digit19, digits) { return digit19 + digits; },
              peg$c77 = function() { return true; },
              peg$c78 = function() { return false; },
              peg$c79 = "true",
              peg$c80 = { type: "literal", value: "true", description: "\"true\"" },
              peg$c81 = "false",
              peg$c82 = { type: "literal", value: "false", description: "\"false\"" },
              peg$c83 = ".",
              peg$c84 = { type: "literal", value: ".", description: "\".\"" },
              peg$c85 = function(digits) { return "." + digits; },
              peg$c86 = function(e, digits) { return e + digits; },
              peg$c87 = function(digits) { return digits.join(""); },
              peg$c88 = /^[eE]/,
              peg$c89 = { type: "class", value: "[eE]", description: "[eE]" },
              peg$c90 = /^[+\-]/,
              peg$c91 = { type: "class", value: "[+-]", description: "[+-]" },
              peg$c92 = function(e, sign) { return sign ? e + sign : e; },
              peg$c93 = /^[0-9]/,
              peg$c94 = { type: "class", value: "[0-9]", description: "[0-9]" },
              peg$c95 = /^[1-9]/,
              peg$c96 = { type: "class", value: "[1-9]", description: "[1-9]" },
              peg$c97 = /^[0-9a-fA-F]/,
              peg$c98 = { type: "class", value: "[0-9a-fA-F]", description: "[0-9a-fA-F]" },
              peg$c99 = { type: "other", description: "whitespace" },
              peg$c100 = /^[ \t\n\r]/,
              peg$c101 = { type: "class", value: "[ \\t\\n\\r]", description: "[ \\t\\n\\r]" },
              peg$c102 = { type: "other", description: "comment" },
              peg$c103 = "/*",
              peg$c104 = { type: "literal", value: "/*", description: "\"/*\"" },
              peg$c105 = "*/",
              peg$c106 = { type: "literal", value: "*/", description: "\"*/\"" },
              peg$c107 = "//",
              peg$c108 = { type: "literal", value: "//", description: "\"//\"" },
              peg$c109 = "#",
              peg$c110 = { type: "literal", value: "#", description: "\"#\"" },
              peg$c111 = /^[\n\r\u2028\u2029]/,
              peg$c112 = { type: "class", value: "[\\n\\r\\u2028\\u2029]", description: "[\\n\\r\\u2028\\u2029]" },
      
              peg$currPos          = 0,
              peg$savedPos         = 0,
              peg$posDetailsCache  = [{ line: 1, column: 1, seenCR: false }],
              peg$maxFailPos       = 0,
              peg$maxFailExpected  = [],
              peg$silentFails      = 0,
      
              peg$result;
      
          if ("startRule" in options) {
            if (!(options.startRule in peg$startRuleFunctions)) {
              throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
            }
      
            peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
          }
      
          function text() {
            return input.substring(peg$savedPos, peg$currPos);
          }
      
          function location() {
            return peg$computeLocation(peg$savedPos, peg$currPos);
          }
      
          function expected(description) {
            throw peg$buildException(
              null,
              [{ type: "other", description: description }],
              input.substring(peg$savedPos, peg$currPos),
              peg$computeLocation(peg$savedPos, peg$currPos)
            );
          }
      
          function error(message) {
            throw peg$buildException(
              message,
              null,
              input.substring(peg$savedPos, peg$currPos),
              peg$computeLocation(peg$savedPos, peg$currPos)
            );
          }
      
          function peg$computePosDetails(pos) {
            var details = peg$posDetailsCache[pos],
                p, ch;
      
            if (details) {
              return details;
            } else {
              p = pos - 1;
              while (!peg$posDetailsCache[p]) {
                p--;
              }
      
              details = peg$posDetailsCache[p];
              details = {
                line:   details.line,
                column: details.column,
                seenCR: details.seenCR
              };
      
              while (p < pos) {
                ch = input.charAt(p);
                if (ch === "\n") {
                  if (!details.seenCR) { details.line++; }
                  details.column = 1;
                  details.seenCR = false;
                } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
                  details.line++;
                  details.column = 1;
                  details.seenCR = true;
                } else {
                  details.column++;
                  details.seenCR = false;
                }
      
                p++;
              }
      
              peg$posDetailsCache[pos] = details;
              return details;
            }
          }
      
          function peg$computeLocation(startPos, endPos) {
            var startPosDetails = peg$computePosDetails(startPos),
                endPosDetails   = peg$computePosDetails(endPos);
      
            return {
              start: {
                offset: startPos,
                line:   startPosDetails.line,
                column: startPosDetails.column
              },
              end: {
                offset: endPos,
                line:   endPosDetails.line,
                column: endPosDetails.column
              }
            };
          }
      
          function peg$fail(expected) {
            if (peg$currPos < peg$maxFailPos) { return; }
      
            if (peg$currPos > peg$maxFailPos) {
              peg$maxFailPos = peg$currPos;
              peg$maxFailExpected = [];
            }
      
            peg$maxFailExpected.push(expected);
          }
      
          function peg$buildException(message, expected, found, location) {
            function cleanupExpected(expected) {
              var i = 1;
      
              expected.sort(function(a, b) {
                if (a.description < b.description) {
                  return -1;
                } else if (a.description > b.description) {
                  return 1;
                } else {
                  return 0;
                }
              });
      
              while (i < expected.length) {
                if (expected[i - 1] === expected[i]) {
                  expected.splice(i, 1);
                } else {
                  i++;
                }
              }
            }
      
            function buildMessage(expected, found) {
              function stringEscape(s) {
                function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }
      
                return s
                  .replace(/\\/g,   '\\\\')
                  .replace(/"/g,    '\\"')
                  .replace(/\x08/g, '\\b')
                  .replace(/\t/g,   '\\t')
                  .replace(/\n/g,   '\\n')
                  .replace(/\f/g,   '\\f')
                  .replace(/\r/g,   '\\r')
                  .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
                  .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
                  .replace(/[\u0100-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
                  .replace(/[\u1000-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
              }
      
              var expectedDescs = new Array(expected.length),
                  expectedDesc, foundDesc, i;
      
              for (i = 0; i < expected.length; i++) {
                expectedDescs[i] = expected[i].description;
              }
      
              expectedDesc = expected.length > 1
                ? expectedDescs.slice(0, -1).join(", ")
                    + " or "
                    + expectedDescs[expected.length - 1]
                : expectedDescs[0];
      
              foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";
      
              return "Expected " + expectedDesc + " but " + foundDesc + " found.";
            }
      
            if (expected !== null) {
              cleanupExpected(expected);
            }
      
            return new peg$SyntaxError(
              message !== null ? message : buildMessage(expected, found),
              expected,
              found,
              location
            );
          }
      
          function peg$parsestart() {
            var s0, s1, s2, s3;
      
            s0 = peg$currPos;
            s1 = peg$parse_();
            if (s1 !== peg$FAILED) {
              s2 = [];
              s3 = peg$parsesection();
              while (s3 !== peg$FAILED) {
                s2.push(s3);
                s3 = peg$parsesection();
              }
              if (s2 !== peg$FAILED) {
                s3 = peg$parse_();
                if (s3 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c0(s2);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
      
            return s0;
          }
      
          function peg$parseliteral() {
            var s0;
      
            s0 = peg$parseboolean();
            if (s0 === peg$FAILED) {
              s0 = peg$parseobject();
              if (s0 === peg$FAILED) {
                s0 = peg$parselist();
                if (s0 === peg$FAILED) {
                  s0 = peg$parseblock();
                  if (s0 === peg$FAILED) {
                    s0 = peg$parsenumber();
                    if (s0 === peg$FAILED) {
                      s0 = peg$parsestring();
                    }
                  }
                }
              }
            }
      
            return s0;
          }
      
          function peg$parsesection() {
            var s0, s1, s2, s3;
      
            s0 = peg$currPos;
            s1 = peg$parseidentifier();
            if (s1 !== peg$FAILED) {
              s2 = peg$parse_();
              if (s2 !== peg$FAILED) {
                s3 = peg$parsesection();
                if (s3 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c1(s1, s3);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$parseblock_member();
              if (s0 === peg$FAILED) {
                s0 = peg$parseblock();
              }
            }
      
            return s0;
          }
      
          function peg$parseblock() {
            var s0, s1, s2, s3, s4, s5, s6, s7;
      
            s0 = peg$currPos;
            s1 = peg$parsebegin_object();
            if (s1 !== peg$FAILED) {
              s2 = peg$currPos;
              s3 = peg$parseblock_member();
              if (s3 !== peg$FAILED) {
                s4 = [];
                s5 = peg$currPos;
                s6 = peg$parse_();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parseblock_member();
                  if (s7 !== peg$FAILED) {
                    peg$savedPos = s5;
                    s6 = peg$c2(s3, s7);
                    s5 = s6;
                  } else {
                    peg$currPos = s5;
                    s5 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s5;
                  s5 = peg$FAILED;
                }
                while (s5 !== peg$FAILED) {
                  s4.push(s5);
                  s5 = peg$currPos;
                  s6 = peg$parse_();
                  if (s6 !== peg$FAILED) {
                    s7 = peg$parseblock_member();
                    if (s7 !== peg$FAILED) {
                      peg$savedPos = s5;
                      s6 = peg$c2(s3, s7);
                      s5 = s6;
                    } else {
                      peg$currPos = s5;
                      s5 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s5;
                    s5 = peg$FAILED;
                  }
                }
                if (s4 !== peg$FAILED) {
                  peg$savedPos = s2;
                  s3 = peg$c3(s3, s4);
                  s2 = s3;
                } else {
                  peg$currPos = s2;
                  s2 = peg$FAILED;
                }
              } else {
                peg$currPos = s2;
                s2 = peg$FAILED;
              }
              if (s2 === peg$FAILED) {
                s2 = null;
              }
              if (s2 !== peg$FAILED) {
                s3 = peg$parseend_object();
                if (s3 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c4(s2);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
      
            return s0;
          }
      
          function peg$parseblock_member() {
            var s0, s1, s2, s3, s4;
      
            s0 = peg$currPos;
            s1 = peg$parseidentifier();
            if (s1 !== peg$FAILED) {
              s2 = peg$parseassignment();
              if (s2 !== peg$FAILED) {
                s3 = peg$parseliteral();
                if (s3 !== peg$FAILED) {
                  s4 = peg$parse_();
                  if (s4 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c5(s1, s3);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              s1 = peg$parseidentifier();
              if (s1 !== peg$FAILED) {
                s2 = peg$parseblock();
                if (s2 !== peg$FAILED) {
                  s3 = peg$parse_();
                  if (s3 !== peg$FAILED) {
                    s1 = [s1, s2, s3];
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            }
      
            return s0;
          }
      
          function peg$parseidentifier() {
            var s0, s1, s2, s3;
      
            s0 = peg$currPos;
            if (peg$c6.test(input.charAt(peg$currPos))) {
              s1 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c7); }
            }
            if (s1 !== peg$FAILED) {
              s2 = [];
              if (peg$c8.test(input.charAt(peg$currPos))) {
                s3 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c9); }
              }
              while (s3 !== peg$FAILED) {
                s2.push(s3);
                if (peg$c8.test(input.charAt(peg$currPos))) {
                  s3 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s3 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c9); }
                }
              }
              if (s2 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c10(s1, s2);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$parsestring();
            }
      
            return s0;
          }
      
          function peg$parseobject() {
            var s0, s1, s2, s3, s4, s5, s6, s7;
      
            s0 = peg$currPos;
            s1 = peg$parsebegin_object();
            if (s1 !== peg$FAILED) {
              s2 = peg$currPos;
              s3 = peg$parseobject_member();
              if (s3 !== peg$FAILED) {
                s4 = [];
                s5 = peg$currPos;
                s6 = peg$parsevalue_separator();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parseobject_member();
                  if (s7 !== peg$FAILED) {
                    peg$savedPos = s5;
                    s6 = peg$c2(s3, s7);
                    s5 = s6;
                  } else {
                    peg$currPos = s5;
                    s5 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s5;
                  s5 = peg$FAILED;
                }
                while (s5 !== peg$FAILED) {
                  s4.push(s5);
                  s5 = peg$currPos;
                  s6 = peg$parsevalue_separator();
                  if (s6 !== peg$FAILED) {
                    s7 = peg$parseobject_member();
                    if (s7 !== peg$FAILED) {
                      peg$savedPos = s5;
                      s6 = peg$c2(s3, s7);
                      s5 = s6;
                    } else {
                      peg$currPos = s5;
                      s5 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s5;
                    s5 = peg$FAILED;
                  }
                }
                if (s4 !== peg$FAILED) {
                  s5 = peg$parsevalue_separator();
                  if (s5 === peg$FAILED) {
                    s5 = null;
                  }
                  if (s5 !== peg$FAILED) {
                    peg$savedPos = s2;
                    s3 = peg$c11(s3, s4);
                    s2 = s3;
                  } else {
                    peg$currPos = s2;
                    s2 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s2;
                  s2 = peg$FAILED;
                }
              } else {
                peg$currPos = s2;
                s2 = peg$FAILED;
              }
              if (s2 === peg$FAILED) {
                s2 = null;
              }
              if (s2 !== peg$FAILED) {
                s3 = peg$parseend_object();
                if (s3 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c4(s2);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
      
            return s0;
          }
      
          function peg$parseobject_member() {
            var s0, s1, s2, s3;
      
            s0 = peg$currPos;
            s1 = peg$parsestring();
            if (s1 !== peg$FAILED) {
              s2 = peg$parsename_separator();
              if (s2 !== peg$FAILED) {
                s3 = peg$parseliteral();
                if (s3 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c12(s1, s3);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
      
            return s0;
          }
      
          function peg$parselist() {
            var s0, s1, s2, s3, s4, s5, s6;
      
            s0 = peg$currPos;
            s1 = peg$parsebegin_array();
            if (s1 !== peg$FAILED) {
              s2 = peg$parseliteral();
              if (s2 !== peg$FAILED) {
                s3 = [];
                s4 = peg$currPos;
                s5 = peg$parsevalue_separator();
                if (s5 !== peg$FAILED) {
                  s6 = peg$parseliteral();
                  if (s6 !== peg$FAILED) {
                    s5 = [s5, s6];
                    s4 = s5;
                  } else {
                    peg$currPos = s4;
                    s4 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s4;
                  s4 = peg$FAILED;
                }
                while (s4 !== peg$FAILED) {
                  s3.push(s4);
                  s4 = peg$currPos;
                  s5 = peg$parsevalue_separator();
                  if (s5 !== peg$FAILED) {
                    s6 = peg$parseliteral();
                    if (s6 !== peg$FAILED) {
                      s5 = [s5, s6];
                      s4 = s5;
                    } else {
                      peg$currPos = s4;
                      s4 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s4;
                    s4 = peg$FAILED;
                  }
                }
                if (s3 !== peg$FAILED) {
                  s4 = peg$parseend_array();
                  if (s4 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c13(s2, s3);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              s1 = peg$parsebegin_array();
              if (s1 !== peg$FAILED) {
                s2 = peg$parseend_array();
                if (s2 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c14();
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            }
      
            return s0;
          }
      
          function peg$parsebegin_array() {
            var s0, s1, s2, s3;
      
            s0 = peg$currPos;
            s1 = peg$parse_();
            if (s1 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 91) {
                s2 = peg$c15;
                peg$currPos++;
              } else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c16); }
              }
              if (s2 !== peg$FAILED) {
                s3 = peg$parse_();
                if (s3 !== peg$FAILED) {
                  s1 = [s1, s2, s3];
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
      
            return s0;
          }
      
          function peg$parsebegin_object() {
            var s0, s1, s2, s3;
      
            s0 = peg$currPos;
            s1 = peg$parse_();
            if (s1 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 123) {
                s2 = peg$c17;
                peg$currPos++;
              } else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c18); }
              }
              if (s2 !== peg$FAILED) {
                s3 = peg$parse_();
                if (s3 !== peg$FAILED) {
                  s1 = [s1, s2, s3];
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
      
            return s0;
          }
      
          function peg$parseend_array() {
            var s0, s1, s2, s3;
      
            s0 = peg$currPos;
            s1 = peg$parse_();
            if (s1 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 93) {
                s2 = peg$c19;
                peg$currPos++;
              } else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c20); }
              }
              if (s2 !== peg$FAILED) {
                s3 = peg$parse_();
                if (s3 !== peg$FAILED) {
                  s1 = [s1, s2, s3];
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
      
            return s0;
          }
      
          function peg$parseend_object() {
            var s0, s1, s2, s3;
      
            s0 = peg$currPos;
            s1 = peg$parse_();
            if (s1 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 125) {
                s2 = peg$c21;
                peg$currPos++;
              } else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c22); }
              }
              if (s2 !== peg$FAILED) {
                s3 = peg$parse_();
                if (s3 !== peg$FAILED) {
                  s1 = [s1, s2, s3];
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
      
            return s0;
          }
      
          function peg$parsename_separator() {
            var s0, s1, s2, s3;
      
            s0 = peg$currPos;
            s1 = peg$parse_();
            if (s1 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 58) {
                s2 = peg$c23;
                peg$currPos++;
              } else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c24); }
              }
              if (s2 !== peg$FAILED) {
                s3 = peg$parse_();
                if (s3 !== peg$FAILED) {
                  s1 = [s1, s2, s3];
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
      
            return s0;
          }
      
          function peg$parsevalue_separator() {
            var s0, s1, s2, s3;
      
            s0 = peg$currPos;
            s1 = peg$parse_();
            if (s1 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 44) {
                s2 = peg$c25;
                peg$currPos++;
              } else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c26); }
              }
              if (s2 !== peg$FAILED) {
                s3 = peg$parse_();
                if (s3 !== peg$FAILED) {
                  s1 = [s1, s2, s3];
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
      
            return s0;
          }
      
          function peg$parseassignment() {
            var s0, s1, s2, s3;
      
            s0 = peg$currPos;
            s1 = peg$parse_();
            if (s1 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 61) {
                s2 = peg$c27;
                peg$currPos++;
              } else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c28); }
              }
              if (s2 !== peg$FAILED) {
                s3 = peg$parse_();
                if (s3 !== peg$FAILED) {
                  s1 = [s1, s2, s3];
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
      
            return s0;
          }
      
          function peg$parsestring() {
            var s0, s1, s2, s3;
      
            peg$silentFails++;
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 34) {
              s1 = peg$c30;
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c31); }
            }
            if (s1 !== peg$FAILED) {
              s2 = [];
              s3 = peg$parsedouble_string_char();
              while (s3 !== peg$FAILED) {
                s2.push(s3);
                s3 = peg$parsedouble_string_char();
              }
              if (s2 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 34) {
                  s3 = peg$c30;
                  peg$currPos++;
                } else {
                  s3 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c31); }
                }
                if (s3 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c32(s2);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
            peg$silentFails--;
            if (s0 === peg$FAILED) {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c29); }
            }
      
            return s0;
          }
      
          function peg$parsedouble_string_char() {
            var s0, s1, s2, s3;
      
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 2) === peg$c33) {
              s1 = peg$c33;
              peg$currPos += 2;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c34); }
            }
            if (s1 !== peg$FAILED) {
              s2 = [];
              s3 = peg$parsedouble_string_char();
              while (s3 !== peg$FAILED) {
                s2.push(s3);
                s3 = peg$parsedouble_string_char();
              }
              if (s2 !== peg$FAILED) {
                if (input.substr(peg$currPos, 2) === peg$c35) {
                  s3 = peg$c35;
                  peg$currPos += 2;
                } else {
                  s3 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c36); }
                }
                if (s3 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c37(s2);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              s1 = peg$currPos;
              peg$silentFails++;
              if (input.charCodeAt(peg$currPos) === 34) {
                s2 = peg$c30;
                peg$currPos++;
              } else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c31); }
              }
              if (s2 === peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 92) {
                  s2 = peg$c38;
                  peg$currPos++;
                } else {
                  s2 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c39); }
                }
              }
              peg$silentFails--;
              if (s2 === peg$FAILED) {
                s1 = void 0;
              } else {
                peg$currPos = s1;
                s1 = peg$FAILED;
              }
              if (s1 !== peg$FAILED) {
                if (input.length > peg$currPos) {
                  s2 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s2 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c40); }
                }
                if (s2 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c41(s2);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                if (input.charCodeAt(peg$currPos) === 92) {
                  s1 = peg$c38;
                  peg$currPos++;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c39); }
                }
                if (s1 !== peg$FAILED) {
                  s2 = peg$parseescape_sequence();
                  if (s2 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c42(s2);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              }
            }
      
            return s0;
          }
      
          function peg$parseescape_sequence() {
            var s0, s1, s2, s3;
      
            s0 = peg$parsecharacter_escape_sequence();
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              if (input.charCodeAt(peg$currPos) === 48) {
                s1 = peg$c43;
                peg$currPos++;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c44); }
              }
              if (s1 !== peg$FAILED) {
                s2 = peg$currPos;
                peg$silentFails++;
                s3 = peg$parsedigit();
                peg$silentFails--;
                if (s3 === peg$FAILED) {
                  s2 = void 0;
                } else {
                  peg$currPos = s2;
                  s2 = peg$FAILED;
                }
                if (s2 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c45();
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
              if (s0 === peg$FAILED) {
                s0 = peg$parsehex_escape_sequence();
                if (s0 === peg$FAILED) {
                  s0 = peg$parseunicode_escape_sequence();
                }
              }
            }
      
            return s0;
          }
      
          function peg$parsecharacter_escape_sequence() {
            var s0;
      
            s0 = peg$parsesingle_escape_character();
            if (s0 === peg$FAILED) {
              s0 = peg$parsenon_escape_character();
            }
      
            return s0;
          }
      
          function peg$parsesingle_escape_character() {
            var s0, s1;
      
            s0 = peg$currPos;
            if (peg$c46.test(input.charAt(peg$currPos))) {
              s1 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c47); }
            }
            if (s1 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c48(s1);
            }
            s0 = s1;
      
            return s0;
          }
      
          function peg$parsenon_escape_character() {
            var s0, s1, s2;
      
            s0 = peg$currPos;
            s1 = peg$currPos;
            peg$silentFails++;
            s2 = peg$parseescape_character();
            peg$silentFails--;
            if (s2 === peg$FAILED) {
              s1 = void 0;
            } else {
              peg$currPos = s1;
              s1 = peg$FAILED;
            }
            if (s1 !== peg$FAILED) {
              if (input.length > peg$currPos) {
                s2 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c40); }
              }
              if (s2 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c41(s2);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
      
            return s0;
          }
      
          function peg$parseescape_character() {
            var s0;
      
            s0 = peg$parsesingle_escape_character();
            if (s0 === peg$FAILED) {
              s0 = peg$parsedigit();
              if (s0 === peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 120) {
                  s0 = peg$c49;
                  peg$currPos++;
                } else {
                  s0 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c50); }
                }
                if (s0 === peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 117) {
                    s0 = peg$c51;
                    peg$currPos++;
                  } else {
                    s0 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c52); }
                  }
                }
              }
            }
      
            return s0;
          }
      
          function peg$parsehex_escape_sequence() {
            var s0, s1, s2, s3;
      
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 120) {
              s1 = peg$c49;
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c50); }
            }
            if (s1 !== peg$FAILED) {
              s2 = peg$parsehex_digit();
              if (s2 !== peg$FAILED) {
                s3 = peg$parsehex_digit();
                if (s3 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c53(s2, s3);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
      
            return s0;
          }
      
          function peg$parseunicode_escape_sequence() {
            var s0, s1, s2, s3, s4, s5;
      
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 117) {
              s1 = peg$c51;
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c52); }
            }
            if (s1 !== peg$FAILED) {
              s2 = peg$parsehex_digit();
              if (s2 !== peg$FAILED) {
                s3 = peg$parsehex_digit();
                if (s3 !== peg$FAILED) {
                  s4 = peg$parsehex_digit();
                  if (s4 !== peg$FAILED) {
                    s5 = peg$parsehex_digit();
                    if (s5 !== peg$FAILED) {
                      peg$savedPos = s0;
                      s1 = peg$c54(s2, s3, s4, s5);
                      s0 = s1;
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
      
            return s0;
          }
      
          function peg$parsenumber() {
            var s0, s1, s2, s3;
      
            s0 = peg$currPos;
            s1 = peg$parsenumeric();
            if (s1 !== peg$FAILED) {
              s2 = peg$parsepower();
              if (s2 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 98) {
                  s3 = peg$c55;
                  peg$currPos++;
                } else {
                  s3 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c56); }
                }
                if (s3 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c57(s1, s2);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              s1 = peg$parsenumeric();
              if (s1 !== peg$FAILED) {
                s2 = peg$parsepower();
                if (s2 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c58(s1, s2);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
              if (s0 === peg$FAILED) {
                s0 = peg$parsenumeric();
              }
            }
      
            return s0;
          }
      
          function peg$parsepower() {
            var s0, s1;
      
            s0 = peg$currPos;
            if (peg$c59.test(input.charAt(peg$currPos))) {
              s1 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c60); }
            }
            if (s1 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c61();
            }
            s0 = s1;
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              if (peg$c62.test(input.charAt(peg$currPos))) {
                s1 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c63); }
              }
              if (s1 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c64();
              }
              s0 = s1;
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                if (peg$c65.test(input.charAt(peg$currPos))) {
                  s1 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c66); }
                }
                if (s1 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c67();
                }
                s0 = s1;
              }
            }
      
            return s0;
          }
      
          function peg$parsenumeric() {
            var s0, s1, s2, s3;
      
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 45) {
              s1 = peg$c68;
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c69); }
            }
            if (s1 !== peg$FAILED) {
              s2 = peg$parse_();
              if (s2 !== peg$FAILED) {
                s3 = peg$parsenumber();
                if (s3 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c70(s3);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              s1 = peg$parseint();
              if (s1 !== peg$FAILED) {
                s2 = peg$parsefrac();
                if (s2 !== peg$FAILED) {
                  s3 = peg$parseexp();
                  if (s3 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c71(s1, s2, s3);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                s1 = peg$parseint();
                if (s1 !== peg$FAILED) {
                  s2 = peg$parsefrac();
                  if (s2 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c72(s1, s2);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
                if (s0 === peg$FAILED) {
                  s0 = peg$currPos;
                  s1 = peg$parseint();
                  if (s1 !== peg$FAILED) {
                    s2 = peg$parseexp();
                    if (s2 !== peg$FAILED) {
                      peg$savedPos = s0;
                      s1 = peg$c73(s1, s2);
                      s0 = s1;
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                  if (s0 === peg$FAILED) {
                    s0 = peg$currPos;
                    s1 = peg$parsefrac();
                    if (s1 !== peg$FAILED) {
                      peg$savedPos = s0;
                      s1 = peg$c74(s1);
                    }
                    s0 = s1;
                    if (s0 === peg$FAILED) {
                      s0 = peg$currPos;
                      s1 = peg$parseint();
                      if (s1 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s1 = peg$c75(s1);
                      }
                      s0 = s1;
                    }
                  }
                }
              }
            }
      
            return s0;
          }
      
          function peg$parseint() {
            var s0, s1, s2;
      
            s0 = peg$currPos;
            s1 = peg$parsedigit19();
            if (s1 !== peg$FAILED) {
              s2 = peg$parsedigits();
              if (s2 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c76(s1, s2);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$parsedigit();
            }
      
            return s0;
          }
      
          function peg$parseboolean() {
            var s0, s1;
      
            s0 = peg$currPos;
            s1 = peg$parsetrue();
            if (s1 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c77();
            }
            s0 = s1;
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              s1 = peg$parsefalse();
              if (s1 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c78();
              }
              s0 = s1;
            }
      
            return s0;
          }
      
          function peg$parsetrue() {
            var s0;
      
            if (input.substr(peg$currPos, 4) === peg$c79) {
              s0 = peg$c79;
              peg$currPos += 4;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c80); }
            }
      
            return s0;
          }
      
          function peg$parsefalse() {
            var s0;
      
            if (input.substr(peg$currPos, 5) === peg$c81) {
              s0 = peg$c81;
              peg$currPos += 5;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c82); }
            }
      
            return s0;
          }
      
          function peg$parsefrac() {
            var s0, s1, s2;
      
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 46) {
              s1 = peg$c83;
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c84); }
            }
            if (s1 !== peg$FAILED) {
              s2 = peg$parsedigits();
              if (s2 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c85(s2);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
      
            return s0;
          }
      
          function peg$parseexp() {
            var s0, s1, s2;
      
            s0 = peg$currPos;
            s1 = peg$parsee();
            if (s1 !== peg$FAILED) {
              s2 = peg$parsedigits();
              if (s2 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c86(s1, s2);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
      
            return s0;
          }
      
          function peg$parsedigits() {
            var s0, s1, s2;
      
            s0 = peg$currPos;
            s1 = [];
            s2 = peg$parsedigit();
            if (s2 !== peg$FAILED) {
              while (s2 !== peg$FAILED) {
                s1.push(s2);
                s2 = peg$parsedigit();
              }
            } else {
              s1 = peg$FAILED;
            }
            if (s1 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c87(s1);
            }
            s0 = s1;
      
            return s0;
          }
      
          function peg$parsee() {
            var s0, s1, s2;
      
            s0 = peg$currPos;
            if (peg$c88.test(input.charAt(peg$currPos))) {
              s1 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c89); }
            }
            if (s1 !== peg$FAILED) {
              if (peg$c90.test(input.charAt(peg$currPos))) {
                s2 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c91); }
              }
              if (s2 === peg$FAILED) {
                s2 = null;
              }
              if (s2 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c92(s1, s2);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
      
            return s0;
          }
      
          function peg$parsedigit() {
            var s0;
      
            if (peg$c93.test(input.charAt(peg$currPos))) {
              s0 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c94); }
            }
      
            return s0;
          }
      
          function peg$parsedigit19() {
            var s0;
      
            if (peg$c95.test(input.charAt(peg$currPos))) {
              s0 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c96); }
            }
      
            return s0;
          }
      
          function peg$parsehex_digit() {
            var s0;
      
            if (peg$c97.test(input.charAt(peg$currPos))) {
              s0 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c98); }
            }
      
            return s0;
          }
      
          function peg$parse_() {
            var s0, s1;
      
            peg$silentFails++;
            s0 = [];
            s1 = peg$parsewhitespace();
            while (s1 !== peg$FAILED) {
              s0.push(s1);
              s1 = peg$parsewhitespace();
            }
            peg$silentFails--;
            if (s0 === peg$FAILED) {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c99); }
            }
      
            return s0;
          }
      
          function peg$parsewhitespace() {
            var s0;
      
            if (peg$c100.test(input.charAt(peg$currPos))) {
              s0 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c101); }
            }
            if (s0 === peg$FAILED) {
              s0 = peg$parsecomment();
            }
      
            return s0;
          }
      
          function peg$parsecomment() {
            var s0, s1;
      
            peg$silentFails++;
            s0 = peg$parsemulti_line_comment();
            if (s0 === peg$FAILED) {
              s0 = peg$parsesingle_line_comment();
            }
            peg$silentFails--;
            if (s0 === peg$FAILED) {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c102); }
            }
      
            return s0;
          }
      
          function peg$parsemulti_line_comment() {
            var s0, s1, s2, s3, s4, s5;
      
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 2) === peg$c103) {
              s1 = peg$c103;
              peg$currPos += 2;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c104); }
            }
            if (s1 !== peg$FAILED) {
              s2 = [];
              s3 = peg$parsemulti_line_comment();
              if (s3 === peg$FAILED) {
                s3 = peg$currPos;
                s4 = peg$currPos;
                peg$silentFails++;
                if (input.substr(peg$currPos, 2) === peg$c105) {
                  s5 = peg$c105;
                  peg$currPos += 2;
                } else {
                  s5 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c106); }
                }
                peg$silentFails--;
                if (s5 === peg$FAILED) {
                  s4 = void 0;
                } else {
                  peg$currPos = s4;
                  s4 = peg$FAILED;
                }
                if (s4 !== peg$FAILED) {
                  if (input.length > peg$currPos) {
                    s5 = input.charAt(peg$currPos);
                    peg$currPos++;
                  } else {
                    s5 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c40); }
                  }
                  if (s5 !== peg$FAILED) {
                    s4 = [s4, s5];
                    s3 = s4;
                  } else {
                    peg$currPos = s3;
                    s3 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s3;
                  s3 = peg$FAILED;
                }
              }
              while (s3 !== peg$FAILED) {
                s2.push(s3);
                s3 = peg$parsemulti_line_comment();
                if (s3 === peg$FAILED) {
                  s3 = peg$currPos;
                  s4 = peg$currPos;
                  peg$silentFails++;
                  if (input.substr(peg$currPos, 2) === peg$c105) {
                    s5 = peg$c105;
                    peg$currPos += 2;
                  } else {
                    s5 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c106); }
                  }
                  peg$silentFails--;
                  if (s5 === peg$FAILED) {
                    s4 = void 0;
                  } else {
                    peg$currPos = s4;
                    s4 = peg$FAILED;
                  }
                  if (s4 !== peg$FAILED) {
                    if (input.length > peg$currPos) {
                      s5 = input.charAt(peg$currPos);
                      peg$currPos++;
                    } else {
                      s5 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c40); }
                    }
                    if (s5 !== peg$FAILED) {
                      s4 = [s4, s5];
                      s3 = s4;
                    } else {
                      peg$currPos = s3;
                      s3 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s3;
                    s3 = peg$FAILED;
                  }
                }
              }
              if (s2 !== peg$FAILED) {
                if (input.substr(peg$currPos, 2) === peg$c105) {
                  s3 = peg$c105;
                  peg$currPos += 2;
                } else {
                  s3 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c106); }
                }
                if (s3 !== peg$FAILED) {
                  s1 = [s1, s2, s3];
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
      
            return s0;
          }
      
          function peg$parsesingle_line_comment() {
            var s0, s1, s2, s3, s4, s5;
      
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 2) === peg$c107) {
              s1 = peg$c107;
              peg$currPos += 2;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c108); }
            }
            if (s1 === peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 35) {
                s1 = peg$c109;
                peg$currPos++;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c110); }
              }
            }
            if (s1 !== peg$FAILED) {
              s2 = [];
              s3 = peg$currPos;
              s4 = peg$currPos;
              peg$silentFails++;
              s5 = peg$parseline_terminator();
              peg$silentFails--;
              if (s5 === peg$FAILED) {
                s4 = void 0;
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
              if (s4 !== peg$FAILED) {
                if (input.length > peg$currPos) {
                  s5 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s5 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c40); }
                }
                if (s5 !== peg$FAILED) {
                  s4 = [s4, s5];
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$FAILED;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
              while (s3 !== peg$FAILED) {
                s2.push(s3);
                s3 = peg$currPos;
                s4 = peg$currPos;
                peg$silentFails++;
                s5 = peg$parseline_terminator();
                peg$silentFails--;
                if (s5 === peg$FAILED) {
                  s4 = void 0;
                } else {
                  peg$currPos = s4;
                  s4 = peg$FAILED;
                }
                if (s4 !== peg$FAILED) {
                  if (input.length > peg$currPos) {
                    s5 = input.charAt(peg$currPos);
                    peg$currPos++;
                  } else {
                    s5 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c40); }
                  }
                  if (s5 !== peg$FAILED) {
                    s4 = [s4, s5];
                    s3 = s4;
                  } else {
                    peg$currPos = s3;
                    s3 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s3;
                  s3 = peg$FAILED;
                }
              }
              if (s2 !== peg$FAILED) {
                s1 = [s1, s2];
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
      
            return s0;
          }
      
          function peg$parseline_terminator() {
            var s0;
      
            if (peg$c111.test(input.charAt(peg$currPos))) {
              s0 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c112); }
            }
      
            return s0;
          }
      
          peg$result = peg$startRuleFunction();
      
          if (peg$result !== peg$FAILED && peg$currPos === input.length) {
            return peg$result;
          } else {
            if (peg$result !== peg$FAILED && peg$currPos < input.length) {
              peg$fail({ type: "end", description: "end of input" });
            }
      
            throw peg$buildException(
              null,
              peg$maxFailExpected,
              peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
              peg$maxFailPos < input.length
                ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1)
                : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
            );
          }
        }
      
        return {
          SyntaxError: peg$SyntaxError,
          parse:       peg$parse
        };
    };

    return parser().parse(aString);
};

/**
 * <odoc>
 * <key>Terraform.writeFileTF(aFile, aObject)</key>
 * Tries to write a javascript object to aFile (tf/hcl format).
 * </odoc>
 */
Terraform.prototype.writeFileTF = function(aFile, aObj) {
  io.writeFileString(aFile, this.toHCL(aObj));
};

/**
 * <odoc>
 * <key>Terraform.readFileTF(aFile) : Object</key>
 * Tries to return a javascript object with the data from aFile (tf/hcl format).
 * </odoc>
 */
Terraform.prototype.readFileTF = function (aFile) {
  return this.fromHCL(io.readFileString(aFile));
};

/**
 * <odoc>
 * <key>Terraform.readFileHCL(aFile) : Object</key>
 * Tries to return a javascript object with the data from aFile (tf/hcl format).
 * </odoc>
 */
Terraform.prototype.readFileHCL = Terraform.prototype.readFileTF;
/**
 * <odoc>
 * <key>Terraform.writeFileHCL(aFile, aObject)</key>
 * Tries to write a javascript object to aFile (tf/hcl format).
 * </odoc>
 */
Terraform.prototype.writeFileHCL = Terraform.prototype.writeFileTF;