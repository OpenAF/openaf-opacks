if (isDef(getOPackPath("Debug")) && getEnv("OAF_DEBUG") == "true") loadLib("debug.js"); else _debug = s=>s

//@ Declaring array
var ar = [ 0, 1, 2, 3, 4, 5 ]

//@ Start cycle
var ii = 0;
while(ii < ar.length) {
print("II = " + ii)
ii++
//# ii == 3
}
//@ End cycle
//? ii

//@ Check arguments
var params = processExpr()

//?s iDontExist
//?s params
//?y params
//? params

//@ It's all okay... relax...