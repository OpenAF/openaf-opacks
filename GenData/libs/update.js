load("maven.js");

var m = new Maven();
m.getFile("com.github.mifmif.generex", "generex-{{version}}.jar", ".");
m.getFile("dk.brics.automaton.automaton", "automaton-{{version}}.jar", ".");