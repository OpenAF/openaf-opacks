loadExternalJars(".")

try {
    var gui
    var terminal = new Packages.com.googlecode.lanterna.terminal.DefaultTerminalFactory().createTerminal()
    var screen = new Packages.com.googlecode.lanterna.screen.TerminalScreen(terminal)
    screen.startScreen()

    var panel = new Packages.com.googlecode.lanterna.gui2.Panel()
    panel.setLayoutManager(new Packages.com.googlecode.lanterna.gui2.GridLayout(2))
    panel.addComponent(new Packages.com.googlecode.lanterna.gui2.Label("Forename"))
    var forename = new Packages.com.googlecode.lanterna.gui2.TextBox()
    panel.addComponent(forename)

    panel.addComponent(new Packages.com.googlecode.lanterna.gui2.Label("Surname"))
    var surname = new Packages.com.googlecode.lanterna.gui2.TextBox()
    panel.addComponent(surname)

    panel.addComponent(new Packages.com.googlecode.lanterna.gui2.EmptySpace(new Packages.com.googlecode.lanterna.TerminalSize(0,0)))
    panel.addComponent(new Packages.com.googlecode.lanterna.gui2.Button("Submit", new java.lang.Runnable({
        run: function() {
            try {
                var obj = { 
                    forename: String(forename.getText()),
                    surname: String(surname.getText())
                }
                io.writeFileYAML("data.yaml", obj)
                Packages.com.googlecode.lanterna.gui2.dialogs.MessageDialog.showMessageDialog(gui, "Success", "Data saved!")
            } catch(ee) {
                io.writeFileString("error2.txt", ee)
            }
        }
    })))
    panel.addComponent(new Packages.com.googlecode.lanterna.gui2.Button("Exit!", new java.lang.Runnable({
        run: () => {
            exit(0, true)
        }
    })))

    var window = new Packages.com.googlecode.lanterna.gui2.BasicWindow()
    window.setComponent(panel)

    gui = new Packages.com.googlecode.lanterna.gui2.MultiWindowTextGUI(screen, new Packages.com.googlecode.lanterna.gui2.DefaultWindowManager(), new Packages.com.googlecode.lanterna.gui2.EmptySpace(Packages.com.googlecode.lanterna.TextColor.ANSI.BLUE))
    gui.addWindowAndWait(window)

} catch(e) {
    io.writeFileString("error.txt", e)
}