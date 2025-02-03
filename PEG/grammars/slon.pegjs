SLON_text
  = ws @value ws

// Delimiters

begin_array     = ws "[" ws
begin_object    = ws "(" ws
end_array       = ws "]" ws
end_object      = ws ")" ws
name_separator  = ws ":" ws
value_separator = ws "," ws
array_separator = ws "|" ws

// Whitespace

ws "whitespace" = [ \t\n\r]*

// Values

value
  = false
  / null
  / true
  / datetime
  / object
  / array
  / number
  / string

false = "false" { return false }
null  = "null"  { return null  }
true  = "true"  { return true  }

// Object

object
  = begin_object
    members:(
      head:member
      tail:(value_separator @member)*
      {
        var result = {};
        [head].concat(tail).forEach(function(element) {
          result[element.name] = element.value
        });
        return result
      }
    )?
    end_object
    { return members !== null ? members: {} }

member
  = name:string name_separator value:value {
      return { name: name, value: value }
    }

// Array

array
  = begin_array
    values:(
      head:value
      tail:(array_separator @value)*
      { return [head].concat(tail) }
    )?
    end_array
    { return values !== null ? values : [] }

// Datetime

datetime
  = year:DIGIT|4| "-" month:DIGIT|2| "-" day:DIGIT|2| "/" hour:DIGIT|2| ":" minute:DIGIT|2| ":" second:DIGIT|2| "." msecond:DIGIT|3| {
    return new Date(Number(year.join("")), Number(month.join(""))-1, Number(day.join("")), Number(hour.join("")), Number(minute.join("")), Number(second.join("")), Number(msecond.join("")))
  }

// Number

number "number"
  = minus? int frac? exp? &([ \t\n\r\[\]\(\):,\|] / !.) { return parseFloat(text()) }

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
  / chars:charpart+ { return chars.join("").trim() }

charpart
  = [^\:\(\)\,]

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