//@ Declaring array
var ar = [ 0, 1, 2, 3, 4, 5, 6, 7, 8 ]

//@ Start cycle
var ii = 0;
//[ cycle total time
while(ii < ar.length) {
    print("II = " + ii)
    //# ii % 4 == 0
    ii++
}
//] cycle total time
//? ii
//@ End cycle

//@ Check arguments
//? __expr
var params = processExpr()

//?s iDontExist
//?s params
//?y params
//? params

//@ It's all okay... relax...