if (isDef(getOPackPath("Debug")) && getEnv("OAF_DEBUG") == "true") loadLib("debug.js"); else _debug = s=>s

var myCode = `
  print(123)
  print(456)
  print(789)
`

myCode = "//" + "@ Starting\n" + myCode + "//" + "@ Ending\n"
var fn = new Function(_debug(myCode))
fn()