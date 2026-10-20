package openaf.desktop.javafx;

import javafx.application.Application;
import javafx.application.Platform;
import javafx.stage.Stage;

/** Owned helper entry point. None of this class executes inside the OpenAF parent JVM. */
public final class DesktopBootstrap {
    private static volatile int exitStatus;
    private DesktopBootstrap() { }

    public static void main(String[] args) {
        // EOF normally closes the runtime. Cover parent loss during native startup/dialogs too.
        boolean explicitOwner = args.length > 0 && args[0].startsWith("--owner-pid=");
        ProcessHandle owner = explicitOwner
                ? ProcessHandle.of(Long.parseLong(args[0].substring("--owner-pid=".length()))).orElse(null)
                : ProcessHandle.current().parent().orElse(null);
        if (explicitOwner && (owner == null || !owner.isAlive())) Runtime.getRuntime().halt(0);
        if (owner != null) Thread.ofVirtual().name("OpenAF desktop owner").start(() -> {
            try {
                while (owner.isAlive()) Thread.sleep(500);
                Runtime.getRuntime().halt(0); // This private, owned helper only.
            } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        });
        try { Application.launch(DesktopApplication.class, args); }
        catch (Throwable e) { e.printStackTrace(System.err); exitStatus = 1; }
        System.exit(exitStatus); // Only after JavaFX's launcher has finished toolkit teardown.
    }

    public static final class DesktopApplication extends Application {
        @Override
        public void start(Stage unused) {
            Platform.setImplicitExit(false);
            Thread.ofVirtual().name("OpenAF desktop control").start(() -> {
                try { new DesktopRuntime().run(); }
                catch (Throwable e) { e.printStackTrace(System.err); exitStatus = 1; Platform.exit(); }
            });
        }
    }
}
