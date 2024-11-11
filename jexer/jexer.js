loadExternalJars(getOPackPath("jexer") || ".")

var TApplication = function() {
   this._app = new Packages.jexer.TApplication(Packages.jexer.TApplication.BackendType.XTERM)
}

TApplication.prototype.addDefaults = function() {
   this._app.addToolMenu()
   this._app.addFileMenu()
   this._app.addWindowMenu()

   return this
}

TApplication.prototype.run = function() {
   this._app.run()
}

// (new TApplication()).addDefaults().run()