package openaf.desktop.javafx;

import com.google.gson.*;
import javafx.application.Platform;
import javafx.concurrent.Worker;
import javafx.scene.Scene;
import javafx.scene.control.Alert;
import javafx.scene.control.ButtonType;
import javafx.scene.web.WebEngine;
import javafx.scene.web.WebView;
import javafx.stage.FileChooser;
import javafx.stage.Stage;
import javafx.stage.Window;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

/** All renderer objects stay on the FX thread. The wire protocol contains JSON only. */
public final class DesktopRuntime {
    private static final int MAX_FRAME = 9 * 1024 * 1024;
    private final Gson gson = new GsonBuilder().serializeNulls().create(); // Reuse Gson already distributed with OpenAF.
    private final Map<String, Stage> windows = new HashMap<>();
    private final PrintWriter output = new PrintWriter(new OutputStreamWriter(System.out, StandardCharsets.UTF_8), true);
    private final AtomicBoolean stopped = new AtomicBoolean();
    private String session;
    private boolean started;
    private long sequence;

    public void run() throws IOException {
        try (Reader input = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8))) {
            String line;
            while ((line = readFrame(input)) != null) {
                JsonObject request;
                try { request = JsonParser.parseString(line).getAsJsonObject(); }
                catch (RuntimeException e) { throw new IOException("Invalid desktop control JSON", e); }
                if (!request.has("version") || request.get("version").getAsInt() != 1) throw new IOException("Unsupported desktop protocol");
                String incomingSession = string(request, "sessionId", "");
                if (session == null) session = incomingSession;
                if (!session.equals(incomingSession) || !request.has("requestId")) throw new IOException("Invalid desktop session");
                try {
                    if (string(request, "operation", "").equals("session.start")) {
                        if (started) throw new IllegalStateException("Runtime already started");
                        // Application.start has already initialized the toolkit before control is read.
                        started = true;
                        reply(request, capabilities(), null);
                    } else {
                        if (!started) throw new IllegalStateException("Runtime is not started");
                        CompletableFuture<JsonElement> result = new CompletableFuture<>();
                        Platform.runLater(() -> {
                            try { result.complete(execute(request)); }
                            catch (Throwable e) { result.completeExceptionally(e); }
                        });
                        reply(request, result.get(120, TimeUnit.SECONDS), null);
                    }
                } catch (Throwable e) {
                    Throwable cause = e instanceof ExecutionException ? e.getCause() : e;
                    JsonObject error = new JsonObject();
                    error.addProperty("code", cause instanceof TimeoutException ? "TIMEOUT" : cause instanceof IllegalArgumentException ? "INVALID_ARGUMENT" : "PROVIDER_FAILED");
                    error.addProperty("message", String.valueOf(cause.getMessage()));
                    reply(request, JsonNull.INSTANCE, error);
                }
            }
        } finally { stop(); }
    }

    private String readFrame(Reader reader) throws IOException {
        StringBuilder text = new StringBuilder();
        int c;
        while ((c = reader.read()) != -1) {
            if (c == '\n') return text.toString();
            if (text.length() >= MAX_FRAME) throw new IOException("Desktop frame limit exceeded");
            text.append((char) c);
        }
        return text.isEmpty() ? null : text.toString();
    }

    private JsonObject capabilities() {
        JsonObject caps = new JsonObject();
        for (String key : List.of("windows", "dialogs", "messaging", "multipleWindows")) caps.addProperty(key, true);
        for (String key : List.of("notifications", "tray", "rendererSandbox", "strictNavigation", "networkIsolation")) caps.addProperty(key, false);
        return caps;
    }

    private JsonElement execute(JsonObject request) {
        if (!Platform.isFxApplicationThread()) throw new IllegalStateException("UI operation outside FX thread");
        String op = string(request, "operation", ""), id = string(request, "windowId", "");
        JsonObject p = request.has("payload") ? request.getAsJsonObject("payload") : new JsonObject();
        if (op.equals("window.create")) {
            if (windows.containsKey(id)) throw new IllegalArgumentException("Duplicate window");
            Stage stage = new Stage();
            WebView view = new WebView();
            WebEngine engine = view.getEngine();
            File data = new File(System.getProperty("javafx.cachedir"), "web/" + id);
            if (!data.mkdirs() && !data.isDirectory()) throw new IllegalStateException("Cannot create desktop profile directory");
            engine.setUserDataDirectory(data);
            stage.setTitle(string(p, "title", "OpenAF Desktop"));
            stage.setScene(new Scene(view, number(p, "width", 900), number(p, "height", 600)));
            stage.setMinWidth(number(p, "minWidth", 1));
            stage.setMinHeight(number(p, "minHeight", 1));
            stage.setResizable(!p.has("resizable") || p.get("resizable").getAsBoolean());
            engine.setCreatePopupHandler(features -> null);
            engine.setOnAlert(event -> { });
            engine.setConfirmHandler(message -> false);
            engine.setPromptHandler(prompt -> null);
            // Never add Java objects to the JS context or return engine/DOM references.
            AtomicBoolean retired = new AtomicBoolean();
            stage.getProperties().put("retired", retired);
            stage.setOnCloseRequest(event -> {
                retired.set(true);
                engine.getLoadWorker().cancel();
                engine.load(null);
                windows.remove(id);
                event(id, "closed", null);
            });
            engine.getLoadWorker().stateProperty().addListener((obs, oldState, state) -> {
                if (retired.get()) return;
                if (state == Worker.State.SUCCEEDED) event(id, "ready", null);
                if (state == Worker.State.FAILED) {
                    JsonObject e = new JsonObject(); e.addProperty("code", "LOAD_FAILED"); e.addProperty("message", "Document failed to load");
                    JsonObject body = new JsonObject(); body.add("error", e); event(id, "error", body);
                }
            });
            String original = string(p, "url", "");
            engine.locationProperty().addListener((obs, before, after) -> {
                if (!after.isEmpty() && !after.equals(original)) event(id, "navigation", null);
            });
            windows.put(id, stage);
            if (p.has("html")) engine.loadContent(p.get("html").getAsString()); else engine.load(original);
            return JsonNull.INSTANCE;
        }
        if (op.startsWith("dialog.")) return dialog(op, p);
        Stage stage = windows.get(id);
        if (stage == null) throw new IllegalArgumentException("Unknown or closed window");
        switch (op) {
            case "window.show" -> stage.show();
            case "window.hide" -> stage.hide();
            case "window.setTitle" -> stage.setTitle(string(p, "title", ""));
            case "window.close" -> {
                // close() does not synthesize WINDOW_CLOSE_REQUEST; release renderer explicitly.
                WebEngine engine = ((WebView) stage.getScene().getRoot()).getEngine();
                windows.remove(id);
                ((AtomicBoolean) stage.getProperties().get("retired")).set(true);
                engine.getLoadWorker().cancel();
                engine.load(null);
                stage.close();
                event(id, "closed", null);
            }
            default -> throw new IllegalArgumentException("Unsupported desktop operation: " + op);
        }
        return JsonNull.INSTANCE;
    }

    private JsonElement dialog(String op, JsonObject p) {
        JsonObject options = p.has("options") ? p.getAsJsonObject("options") : new JsonObject();
        Window owner = windows.get(string(options, "windowId", ""));
        if (options.has("windowId") && owner == null) throw new IllegalArgumentException("Unknown dialog owner");
        if (op.equals("dialog.openFile") || op.equals("dialog.saveFile")) {
            FileChooser chooser = new FileChooser();
            chooser.setTitle(string(options, "title", "Select file"));
            if (options.has("initialDirectory")) chooser.setInitialDirectory(new File(options.get("initialDirectory").getAsString()));
            if (options.has("initialFileName")) chooser.setInitialFileName(options.get("initialFileName").getAsString());
            File file = op.equals("dialog.openFile") ? chooser.showOpenDialog(owner) : chooser.showSaveDialog(owner);
            return file == null ? JsonNull.INSTANCE : new JsonPrimitive(file.getAbsolutePath());
        }
        Alert alert = new Alert(op.equals("dialog.confirm") ? Alert.AlertType.CONFIRMATION : Alert.AlertType.INFORMATION);
        if (owner != null) alert.initOwner(owner);
        alert.setTitle(string(options, "title", "OpenAF"));
        alert.setHeaderText(null);
        alert.setContentText(string(p, "message", ""));
        Optional<ButtonType> result = alert.showAndWait(); // FX nested event loop, never an OpenAF callback.
        return op.equals("dialog.confirm") ? new JsonPrimitive(result.orElse(ButtonType.CANCEL) == ButtonType.OK) : JsonNull.INSTANCE;
    }

    private void event(String id, String type, JsonObject fields) {
        JsonObject event = fields == null ? new JsonObject() : fields;
        event.addProperty("type", type); event.addProperty("windowId", id);
        event.addProperty("sequence", ++sequence);
        JsonObject frame = base(); frame.add("event", event); write(frame);
    }
    private void reply(JsonObject request, JsonElement payload, JsonObject error) {
        JsonObject frame = base(); frame.add("requestId", request.get("requestId"));
        if (error != null) frame.add("error", error); else frame.add("payload", payload == null ? JsonNull.INSTANCE : payload);
        write(frame);
    }
    private JsonObject base() {
        JsonObject frame = new JsonObject(); frame.addProperty("version", 1); frame.addProperty("sessionId", session); return frame;
    }
    private synchronized void write(JsonObject frame) { output.println(gson.toJson(frame)); }
    private static String string(JsonObject p, String key, String fallback) { return p.has(key) && !p.get(key).isJsonNull() ? p.get(key).getAsString() : fallback; }
    private static double number(JsonObject p, String key, double fallback) { return p.has(key) ? p.get(key).getAsDouble() : fallback; }
    private void stop() {
        if (!stopped.compareAndSet(false, true)) return;
        CountDownLatch done = new CountDownLatch(1);
        Platform.runLater(() -> {
            for (Stage stage : new ArrayList<>(windows.values())) stage.close();
            windows.clear(); Platform.exit(); done.countDown();
        });
        try { done.await(2, TimeUnit.SECONDS); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}
