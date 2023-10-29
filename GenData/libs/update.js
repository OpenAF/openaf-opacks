ow.loadJava()

var m = new ow.java.maven()
m.getFile("com.github.mifmif.generex", "generex-{{version}}.jar", ".");
m.getFile("dk.brics.automaton.automaton", "automaton-{{version}}.jar", ".");