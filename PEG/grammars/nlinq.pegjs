nLinq_text
  = ws @expression ws

begin_function = ws "(" ws
end_function   = ws ")" ws
arg_separator  = ws "," ws

// Whitespace

ws "whitespace" = [ \t\n\r]*

expression
  = head:transform tail:("." @expression)?
    { if (isNull(tail)) tail = {}
      if (isUnDef(tail.transform)) tail.transform = []
      tail.transform.push(head)
      return tail }
  / head:where tail:("." @expression)?
    { if (isNull(tail)) tail = {}
      if (isUnDef(tail.where)) tail.where = []
      tail.where.push(head)
      return tail }
  / head:selector tail:("." @expression)?
    { if (isNull(tail)) tail = {}
      if (isUnDef(tail.selector)) tail.selector = {}
      tail.selector = head
      return tail }
  / head:select tail:("." @expression)?
    { if (isNull(tail)) tail = {}
      if (isUnDef(tail.select)) tail.select = {}
      tail.select = head
      return tail }

transform
  = head:transformFn 
    { return head }

where
  = head:whereFn 
    { return head }

selector
  = head:selectorFn 
    { return head }

select
  = head:selectFn 
  { return head }

value
  = false
  / null
  / true
  / number
  / string

// Function

whereFn
  = fn:charwhen begin_function args:list_arguments end_function {
    return { cond: fn, args: args }
  }

transformFn
  = fn:chartransform begin_function args:list_arguments end_function {
    return { func: fn, args: args }
  }

selectorFn
  = fn:charselector begin_function args:list_arguments end_function {
    return { func: fn, args: args }
  }

selectFn
  = fn:charpart* begin_function args:list_arguments end_function {
    return jsonParse(args, true)
  }

charwhen
  = "andNotGreaterEquals" / "andNotBetweenEquals" / "orNotBetweenEquals" / "orNotGreaterEquals" / "notGreaterEquals" / "andNotLessEquals" / "andBetweenEquals" / "andGreaterEquals" / "notBetweenEquals" / "orBetweenEquals" / "orNotLessEquals" / "orGreaterEquals" / "andNotContains" / "greaterEquals" / "notLessEquals" / "andNotGreater" / "orNotContains" / "betweenEquals" / "andNotBetween" / "andLessEquals" / "orLessEquals" / "andNotStarts" / "orNotBetween" / "orNotGreater" / "andNotEquals" / "orNotEquals" / "notContains" / "andContains" / "andNotMatch" / "andNotEmpty" / "orNotStarts" / "orNotMatch" / "notBetween" / "orNotEmpty" / "andNotLess" / "andBetween" / "notGreater" / "andNotEnds" / "andNotType" / "orContains" / "andGreater" / "lessEquals" / "andEquals" / "notEquals" / "orNotLess" / "orGreater" / "notStarts" / "orNotEnds" / "orNotType" / "andStarts" / "orBetween" / "orStarts" / "notMatch" / "notEmpty" / "andNotIs" / "contains" / "orEquals" / "andMatch" / "andEmpty" / "orNotIs" / "orMatch" / "notType" / "greater" / "notLess" / "notEnds" / "between" / "andEnds" / "andType" / "andLess" / "orEmpty" / "equals" / "orType" / "andNot" / "orLess" / "starts" / "orEnds" / "andIs" / "notIs" / "orNot" / "match" / "empty" / "orIs" / "ends" / "less" / "type" / "not" / "and" / "is" / "or"

charselect
  = "mselect" / "removed" / "select" / "define"

chartransform
  = "ignoreCase" / "averageBy" / "countBy"  / "skipTake" / "distinct" / "average" / "groupBy" / "useCase" / "toDate" / "limit" / "group" / "minBy" / "maxBy" / "sumBy" / "tail" / "head" / "take" / "skip" / "sort" / "min" / "max" / "sum"

charselector
  = "reverse" / "count" / "first" / "last" / "none" / "all" / "any" / "at"

list_arguments
  = values:(
      head:value
      tail:(arg_separator @value)*
      { return [head].concat(tail) }
    )?

// Numbers and others

false = "false" { return false }
null  = "null"  { return null  }
true  = "true"  { return true  }

number "number"
  = minus? int frac? exp? { return parseFloat(text()) }

decimal_point
  = "."

digit1_9
  = [1-9]

e
  = [eE]

exp
  = e (minus / plus)? DIGIT+

frac
  = decimal_point DIGIT+

int
  = zero / (digit1_9 DIGIT*)

minus
  = "-"

plus
  = "+"

zero
  = "0"

// String

string "string"
  = quotation_mark chars:char* quotation_mark { return chars.join("") }
  / quotation_mark_single chars:char* quotation_mark_single { return chars.join("") }
  / chars:charpart* { return chars.join("") }

charpart
  = [^\(\)\,]

char
  = unescaped
  / escape
    sequence:(
        '"'
      / "'"
      / "\\"
      / "/"
      / "b" { return "\b" }
      / "f" { return "\f" }
      / "n" { return "\n" }
      / "r" { return "\r" }
      / "t" { return "\t" }
      / "u" digits:$(HEXDIG HEXDIG HEXDIG HEXDIG) {
          return String.fromCharCode(parseInt(digits, 16))
        }
    )
    { return sequence }

escape
  = "\\"

quotation_mark
  = '"'

quotation_mark_single
  = '\''

unescaped
  = [^\0-\x1F\x22\x27\x5C]

// General

DIGIT  = [0-9]
HEXDIG = [0-9a-f]i