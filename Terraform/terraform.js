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
 * In case of error the exception object contains the transformed source on the field exception.source.
 * </odoc>
 */
Terraform.prototype.fromHCL = function(aString) {
    var parser = function() {
    /*
      * Generated by PEG.js 0.10.0.
      *
      * http://pegjs.org/
      */
    
    "use strict";
    
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
    
    peg$SyntaxError.buildMessage = function(expected, found) {
      var DESCRIBE_EXPECTATION_FNS = {
            literal: function(expectation) {
              return "\"" + literalEscape(expectation.text) + "\"";
            },
    
            "class": function(expectation) {
              var escapedParts = "",
                  i;
    
              for (i = 0; i < expectation.parts.length; i++) {
                escapedParts += expectation.parts[i] instanceof Array
                  ? classEscape(expectation.parts[i][0]) + "-" + classEscape(expectation.parts[i][1])
                  : classEscape(expectation.parts[i]);
              }
    
              return "[" + (expectation.inverted ? "^" : "") + escapedParts + "]";
            },
    
            any: function(expectation) {
              return "any character";
            },
    
            end: function(expectation) {
              return "end of input";
            },
    
            other: function(expectation) {
              return expectation.description;
            }
          };
    
      function hex(ch) {
        return ch.charCodeAt(0).toString(16).toUpperCase();
      }
    
      function literalEscape(s) {
        return s
          .replace(/\\/g, '\\\\')
          .replace(/"/g,  '\\"')
          .replace(/\0/g, '\\0')
          .replace(/\t/g, '\\t')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/[\x00-\x0F]/g,          function(ch) { return '\\x0' + hex(ch); })
          .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return '\\x'  + hex(ch); });
      }
    
      function classEscape(s) {
        return s
          .replace(/\\/g, '\\\\')
          .replace(/\]/g, '\\]')
          .replace(/\^/g, '\\^')
          .replace(/-/g,  '\\-')
          .replace(/\0/g, '\\0')
          .replace(/\t/g, '\\t')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/[\x00-\x0F]/g,          function(ch) { return '\\x0' + hex(ch); })
          .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return '\\x'  + hex(ch); });
      }
    
      function describeExpectation(expectation) {
        return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
      }
    
      function describeExpected(expected) {
        var descriptions = new Array(expected.length),
            i, j;
    
        for (i = 0; i < expected.length; i++) {
          descriptions[i] = describeExpectation(expected[i]);
        }
    
        descriptions.sort();
    
        if (descriptions.length > 0) {
          for (i = 1, j = 1; i < descriptions.length; i++) {
            if (descriptions[i - 1] !== descriptions[i]) {
              descriptions[j] = descriptions[i];
              j++;
            }
          }
          descriptions.length = j;
        }
    
        switch (descriptions.length) {
          case 1:
            return descriptions[0];
    
          case 2:
            return descriptions[0] + " or " + descriptions[1];
    
          default:
            return descriptions.slice(0, -1).join(", ")
              + ", or "
              + descriptions[descriptions.length - 1];
        }
      }
    
      function describeFound(found) {
        return found ? "\"" + literalEscape(found) + "\"" : "end of input";
      }
    
      return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
    };
    
    function peg$parse(input, options) {
      options = options !== void 0 ? options : {};
    
      var peg$FAILED = {},
    
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
          peg$c6 = function(parent_key, value) {
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
    
              var m = {}; m[child_key] = child;
              return {
                parent_key: parent_key,
                hint: 'block_member',
                value: m,
                child_key: child_key
              };
            },
          peg$c7 = /^[a-zA-Z_]/,
          peg$c8 = peg$classExpectation([["a", "z"], ["A", "Z"], "_"], false, false),
          peg$c9 = /^[a-zA-Z0-9_$\-]/,
          peg$c10 = peg$classExpectation([["a", "z"], ["A", "Z"], ["0", "9"], "_", "$", "-"], false, false),
          peg$c11 = function(first, rest) { return first + rest.join(""); },
          peg$c12 = function(first, rest) {
                    let result = {hint: 'object'};
    
                    [first]
                    .concat(rest)
                    .forEach(function (e) {
                        result[e.name] = e.value;
                    });
    
                    return result;
                  },
          peg$c13 = function(name, value) {
              return { name: name, value: value };
            },
          peg$c14 = function(first, rest) {
              return [first].concat(rest.map(function(d) { return d[1]; }));
            },
          peg$c15 = function() { return []; },
          peg$c16 = "[",
          peg$c17 = peg$literalExpectation("[", false),
          peg$c18 = "{",
          peg$c19 = peg$literalExpectation("{", false),
          peg$c20 = "]",
          peg$c21 = peg$literalExpectation("]", false),
          peg$c22 = "}",
          peg$c23 = peg$literalExpectation("}", false),
          peg$c24 = ":",
          peg$c25 = peg$literalExpectation(":", false),
          peg$c26 = ",",
          peg$c27 = peg$literalExpectation(",", false),
          peg$c28 = "=",
          peg$c29 = peg$literalExpectation("=", false),
          peg$c30 = peg$otherExpectation("string"),
          peg$c31 = "\"",
          peg$c32 = peg$literalExpectation("\"", false),
          peg$c33 = function(chars) { return chars.join(""); },
          peg$c34 = "(\"",
          peg$c35 = peg$literalExpectation("(\"", false),
          peg$c36 = "\")",
          peg$c37 = peg$literalExpectation("\")", false),
          peg$c38 = function(chars) { return '("' + chars.join("") + '")'; },
          peg$c39 = "\\",
          peg$c40 = peg$literalExpectation("\\", false),
          peg$c41 = peg$anyExpectation(),
          peg$c42 = function(char_) { return char_; },
          peg$c43 = function(sequence) { return sequence; },
          peg$c44 = "0",
          peg$c45 = peg$literalExpectation("0", false),
          peg$c46 = function() { return "\0"; },
          peg$c47 = /^['"\\bfnrtv]/,
          peg$c48 = peg$classExpectation(["'", "\"", "\\", "b", "f", "n", "r", "t", "v"], false, false),
          peg$c49 = function(char_) {
              return char_
              .replace("b", "\b")
              .replace("f", "\f")
              .replace("n", "\n")
              .replace("r", "\r")
              .replace("t", "\t")
              .replace("v", "\x0B");
            },
          peg$c50 = "x",
          peg$c51 = peg$literalExpectation("x", false),
          peg$c52 = "u",
          peg$c53 = peg$literalExpectation("u", false),
          peg$c54 = function(h1, h2) {
                return String.fromCharCode(+("0x" + h1 + h2));
            },
          peg$c55 = function(h1, h2, h3, h4) {
                return String.fromCharCode(+("0x" + h1 + h2 + h3 + h4));
            },
          peg$c56 = "b",
          peg$c57 = peg$literalExpectation("b", false),
          peg$c58 = function(numeric, power) { return numeric * Math.pow(1024, power); },
          peg$c59 = function(numeric, power) { return numeric * Math.pow(1000, power); },
          peg$c60 = /^[kK]/,
          peg$c61 = peg$classExpectation(["k", "K"], false, false),
          peg$c62 = function() { return 1; },
          peg$c63 = /^[mM]/,
          peg$c64 = peg$classExpectation(["m", "M"], false, false),
          peg$c65 = function() { return 2; },
          peg$c66 = /^[gG]/,
          peg$c67 = peg$classExpectation(["g", "G"], false, false),
          peg$c68 = function() { return 3; },
          peg$c69 = "-",
          peg$c70 = peg$literalExpectation("-", false),
          peg$c71 = function(number) { return -number; },
          peg$c72 = function(int_, frac, exp) { return +(int_ + frac + exp); },
          peg$c73 = function(int_, frac) { return +(int_ + frac); },
          peg$c74 = function(int_, exp) { return +(int_ + exp); },
          peg$c75 = function(frac) { return +frac; },
          peg$c76 = function(int_) { return +int_; },
          peg$c77 = function(digit19, digits) { return digit19 + digits; },
          peg$c78 = function() { return true; },
          peg$c79 = function() { return false; },
          peg$c80 = "true",
          peg$c81 = peg$literalExpectation("true", false),
          peg$c82 = "false",
          peg$c83 = peg$literalExpectation("false", false),
          peg$c84 = ".",
          peg$c85 = peg$literalExpectation(".", false),
          peg$c86 = function(digits) { return "." + digits; },
          peg$c87 = function(e, digits) { return e + digits; },
          peg$c88 = function(digits) { return digits.join(""); },
          peg$c89 = /^[eE]/,
          peg$c90 = peg$classExpectation(["e", "E"], false, false),
          peg$c91 = /^[+\-]/,
          peg$c92 = peg$classExpectation(["+", "-"], false, false),
          peg$c93 = function(e, sign) { return sign ? e + sign : e; },
          peg$c94 = /^[0-9]/,
          peg$c95 = peg$classExpectation([["0", "9"]], false, false),
          peg$c96 = /^[1-9]/,
          peg$c97 = peg$classExpectation([["1", "9"]], false, false),
          peg$c98 = /^[0-9a-fA-F]/,
          peg$c99 = peg$classExpectation([["0", "9"], ["a", "f"], ["A", "F"]], false, false),
          peg$c100 = peg$otherExpectation("whitespace"),
          peg$c101 = /^[ \t\n\r]/,
          peg$c102 = peg$classExpectation([" ", "\t", "\n", "\r"], false, false),
          peg$c103 = peg$otherExpectation("comment"),
          peg$c104 = "/*",
          peg$c105 = peg$literalExpectation("/*", false),
          peg$c106 = "*/",
          peg$c107 = peg$literalExpectation("*/", false),
          peg$c108 = "//",
          peg$c109 = peg$literalExpectation("//", false),
          peg$c110 = "#",
          peg$c111 = peg$literalExpectation("#", false),
          peg$c112 = /^[\n\r\u2028\u2029]/,
          peg$c113 = peg$classExpectation(["\n", "\r", "\u2028", "\u2029"], false, false),
    
          peg$currPos          = 0,
          peg$savedPos         = 0,
          peg$posDetailsCache  = [{ line: 1, column: 1 }],
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
    
      function expected(description, location) {
        location = location !== void 0 ? location : peg$computeLocation(peg$savedPos, peg$currPos)
    
        throw peg$buildStructuredError(
          [peg$otherExpectation(description)],
          input.substring(peg$savedPos, peg$currPos),
          location
        );
      }
    
      function error(message, location) {
        location = location !== void 0 ? location : peg$computeLocation(peg$savedPos, peg$currPos)
    
        throw peg$buildSimpleError(message, location);
      }
    
      function peg$literalExpectation(text, ignoreCase) {
        return { type: "literal", text: text, ignoreCase: ignoreCase };
      }
    
      function peg$classExpectation(parts, inverted, ignoreCase) {
        return { type: "class", parts: parts, inverted: inverted, ignoreCase: ignoreCase };
      }
    
      function peg$anyExpectation() {
        return { type: "any" };
      }
    
      function peg$endExpectation() {
        return { type: "end" };
      }
    
      function peg$otherExpectation(description) {
        return { type: "other", description: description };
      }
    
      function peg$computePosDetails(pos) {
        var details = peg$posDetailsCache[pos], p;
    
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
            column: details.column
          };
    
          while (p < pos) {
            if (input.charCodeAt(p) === 10) {
              details.line++;
              details.column = 1;
            } else {
              details.column++;
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
    
      function peg$buildSimpleError(message, location) {
        return new peg$SyntaxError(message, null, null, location);
      }
    
      function peg$buildStructuredError(expected, found, location) {
        return new peg$SyntaxError(
          peg$SyntaxError.buildMessage(expected, found),
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
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = peg$parseidentifier();
            if (s1 !== peg$FAILED) {
              s2 = peg$parse_();
              if (s2 !== peg$FAILED) {
                s3 = peg$parsesection();
                if (s3 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c6(s1, s3);
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
        }
    
        return s0;
      }
    
      function peg$parseidentifier() {
        var s0, s1, s2, s3;
    
        s0 = peg$currPos;
        if (peg$c7.test(input.charAt(peg$currPos))) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c8); }
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          if (peg$c9.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c10); }
          }
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            if (peg$c9.test(input.charAt(peg$currPos))) {
              s3 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c10); }
            }
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c11(s1, s2);
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
                s3 = peg$c12(s3, s4);
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
              s1 = peg$c13(s1, s3);
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
                s1 = peg$c14(s2, s3);
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
              s1 = peg$c15();
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
            s2 = peg$c16;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c17); }
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
            s2 = peg$c18;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c19); }
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
            s2 = peg$c20;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c21); }
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
            s2 = peg$c22;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c23); }
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
            s2 = peg$c24;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c25); }
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
            s2 = peg$c26;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c27); }
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
            s2 = peg$c28;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c29); }
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
          s1 = peg$c31;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c32); }
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
              s3 = peg$c31;
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c32); }
            }
            if (s3 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c33(s2);
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
          if (peg$silentFails === 0) { peg$fail(peg$c30); }
        }
    
        return s0;
      }
    
      function peg$parsedouble_string_char() {
        var s0, s1, s2, s3;
    
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 2) === peg$c34) {
          s1 = peg$c34;
          peg$currPos += 2;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c35); }
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parsedouble_string_char();
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parsedouble_string_char();
          }
          if (s2 !== peg$FAILED) {
            if (input.substr(peg$currPos, 2) === peg$c36) {
              s3 = peg$c36;
              peg$currPos += 2;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c37); }
            }
            if (s3 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c38(s2);
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
            s2 = peg$c31;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c32); }
          }
          if (s2 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 92) {
              s2 = peg$c39;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c40); }
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
              if (peg$silentFails === 0) { peg$fail(peg$c41); }
            }
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
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 92) {
              s1 = peg$c39;
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c40); }
            }
            if (s1 !== peg$FAILED) {
              s2 = peg$parseescape_sequence();
              if (s2 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c43(s2);
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
            s1 = peg$c44;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c45); }
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
              s1 = peg$c46();
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
        if (peg$c47.test(input.charAt(peg$currPos))) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c48); }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c49(s1);
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
            if (peg$silentFails === 0) { peg$fail(peg$c41); }
          }
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
    
        return s0;
      }
    
      function peg$parseescape_character() {
        var s0;
    
        s0 = peg$parsesingle_escape_character();
        if (s0 === peg$FAILED) {
          s0 = peg$parsedigit();
          if (s0 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 120) {
              s0 = peg$c50;
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c51); }
            }
            if (s0 === peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 117) {
                s0 = peg$c52;
                peg$currPos++;
              } else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c53); }
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
          s1 = peg$c50;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c51); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parsehex_digit();
          if (s2 !== peg$FAILED) {
            s3 = peg$parsehex_digit();
            if (s3 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c54(s2, s3);
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
          s1 = peg$c52;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c53); }
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
                  s1 = peg$c55(s2, s3, s4, s5);
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
              s3 = peg$c56;
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c57); }
            }
            if (s3 !== peg$FAILED) {
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
              s1 = peg$c59(s1, s2);
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
        if (peg$c60.test(input.charAt(peg$currPos))) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c61); }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c62();
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (peg$c63.test(input.charAt(peg$currPos))) {
            s1 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c64); }
          }
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c65();
          }
          s0 = s1;
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (peg$c66.test(input.charAt(peg$currPos))) {
              s1 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c67); }
            }
            if (s1 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c68();
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
          s1 = peg$c69;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c70); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_();
          if (s2 !== peg$FAILED) {
            s3 = peg$parsenumber();
            if (s3 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c71(s3);
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
                s1 = peg$c72(s1, s2, s3);
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
              s1 = peg$parseint();
              if (s1 !== peg$FAILED) {
                s2 = peg$parseexp();
                if (s2 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c74(s1, s2);
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
                  s1 = peg$c75(s1);
                }
                s0 = s1;
                if (s0 === peg$FAILED) {
                  s0 = peg$currPos;
                  s1 = peg$parseint();
                  if (s1 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c76(s1);
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
            s1 = peg$c77(s1, s2);
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
          s1 = peg$c78();
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parsefalse();
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c79();
          }
          s0 = s1;
        }
    
        return s0;
      }
    
      function peg$parsetrue() {
        var s0;
    
        if (input.substr(peg$currPos, 4) === peg$c80) {
          s0 = peg$c80;
          peg$currPos += 4;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c81); }
        }
    
        return s0;
      }
    
      function peg$parsefalse() {
        var s0;
    
        if (input.substr(peg$currPos, 5) === peg$c82) {
          s0 = peg$c82;
          peg$currPos += 5;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c83); }
        }
    
        return s0;
      }
    
      function peg$parsefrac() {
        var s0, s1, s2;
    
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 46) {
          s1 = peg$c84;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c85); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parsedigits();
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c86(s2);
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
            s1 = peg$c87(s1, s2);
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
          s1 = peg$c88(s1);
        }
        s0 = s1;
    
        return s0;
      }
    
      function peg$parsee() {
        var s0, s1, s2;
    
        s0 = peg$currPos;
        if (peg$c89.test(input.charAt(peg$currPos))) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c90); }
        }
        if (s1 !== peg$FAILED) {
          if (peg$c91.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c92); }
          }
          if (s2 === peg$FAILED) {
            s2 = null;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c93(s1, s2);
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
    
        if (peg$c94.test(input.charAt(peg$currPos))) {
          s0 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c95); }
        }
    
        return s0;
      }
    
      function peg$parsedigit19() {
        var s0;
    
        if (peg$c96.test(input.charAt(peg$currPos))) {
          s0 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c97); }
        }
    
        return s0;
      }
    
      function peg$parsehex_digit() {
        var s0;
    
        if (peg$c98.test(input.charAt(peg$currPos))) {
          s0 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c99); }
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
          if (peg$silentFails === 0) { peg$fail(peg$c100); }
        }
    
        return s0;
      }
    
      function peg$parsewhitespace() {
        var s0;
    
        if (peg$c101.test(input.charAt(peg$currPos))) {
          s0 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c102); }
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
          if (peg$silentFails === 0) { peg$fail(peg$c103); }
        }
    
        return s0;
      }
    
      function peg$parsemulti_line_comment() {
        var s0, s1, s2, s3, s4, s5;
    
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 2) === peg$c104) {
          s1 = peg$c104;
          peg$currPos += 2;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c105); }
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parsemulti_line_comment();
          if (s3 === peg$FAILED) {
            s3 = peg$currPos;
            s4 = peg$currPos;
            peg$silentFails++;
            if (input.substr(peg$currPos, 2) === peg$c106) {
              s5 = peg$c106;
              peg$currPos += 2;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c107); }
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
                if (peg$silentFails === 0) { peg$fail(peg$c41); }
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
              if (input.substr(peg$currPos, 2) === peg$c106) {
                s5 = peg$c106;
                peg$currPos += 2;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c107); }
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
                  if (peg$silentFails === 0) { peg$fail(peg$c41); }
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
            if (input.substr(peg$currPos, 2) === peg$c106) {
              s3 = peg$c106;
              peg$currPos += 2;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c107); }
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
        if (input.substr(peg$currPos, 2) === peg$c108) {
          s1 = peg$c108;
          peg$currPos += 2;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c109); }
        }
        if (s1 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 35) {
            s1 = peg$c110;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c111); }
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
              if (peg$silentFails === 0) { peg$fail(peg$c41); }
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
                if (peg$silentFails === 0) { peg$fail(peg$c41); }
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
    
        if (peg$c112.test(input.charAt(peg$currPos))) {
          s0 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c113); }
        }
    
        return s0;
      }
    
      peg$result = peg$startRuleFunction();
    
      if (peg$result !== peg$FAILED && peg$currPos === input.length) {
        return peg$result;
      } else {
        if (peg$result !== peg$FAILED && peg$currPos < input.length) {
          peg$fail(peg$endExpectation());
        }
    
        throw peg$buildStructuredError(
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
  
  try {
    return parser().parse(aString);
  } catch(e) {
    e.message = "[Line: " + e.location.start.line + ", Column: " + e.location.start.column + "] " + e.message; 
    e.source = aString;
    throw e;
  }
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
  return this.fromHCL(io.readFileString(aFile).replace(/<<(.+)\n((.*\n)+.*)\1\n/mg, (m, p1, p2) => { return "\"" + p2.replace(/\n/mg, "\\n").replace(/\\n$/mg, "").replace(/"/mg, "\\\"") + "\"\n" }));
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