// Author: Nuno Aguiar

var __scriptfile, _debug
if (isDef(__scriptfile) && isUnDef(_debug)) { 
  loadLib("debugFn.js")
  _debug(__scriptfile)
  exit(0) 
} else {
  loadLib("debugFn.js")
}