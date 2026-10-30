package openaf.plugins.grpc;

import com.google.gson.*;
import com.google.protobuf.DescriptorProtos;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.TimeUnit;

/** Schema loading; protoc is an explicit external build tool, never a shell command. */
final class Schema {
    private Schema() {}

    static DescriptorProtos.FileDescriptorSet load(JsonObject options) throws Exception {
        if (options.has("descriptorSet")) {
            return DescriptorProtos.FileDescriptorSet.parseFrom(Files.readAllBytes(Path.of(options.get("descriptorSet").getAsString())));
        }
        if (!options.has("protoFiles")) return DescriptorProtos.FileDescriptorSet.getDefaultInstance();
        Path temporary = Files.createTempDirectory("openaf-grpc-protoc-");
        Process process = null;
        try {
            var files = new ArrayList<Path>();
            var includes = new LinkedHashSet<Path>();
            if (options.has("protoPaths")) for (var path : options.getAsJsonArray("protoPaths")) includes.add(Path.of(path.getAsString()).toRealPath());
            for (var file : options.getAsJsonArray("protoFiles")) {
                Path path = Path.of(file.getAsString()).toRealPath();
                files.add(path); includes.add(path.getParent());
            }
            if (files.isEmpty()) throw new IllegalArgumentException("protoFiles must not be empty");
            var command = new ArrayList<String>();
            command.add(options.has("protoc") ? options.get("protoc").getAsString() : "protoc");
            for (Path include : includes) command.add("--proto_path=" + include);
            Path output = temporary.resolve("schema.protoset");
            command.add("--include_imports");
            command.add("--descriptor_set_out=" + output);
            for (Path file : files) command.add(file.toString());
            Path log = temporary.resolve("protoc.log");
            process = new ProcessBuilder(command).redirectErrorStream(true).redirectOutput(log.toFile()).start();
            int timeout = options.has("protocTimeout") ? options.get("protocTimeout").getAsInt() : 30000;
            if (timeout <= 0) throw new IllegalArgumentException("protocTimeout must be positive");
            if (!process.waitFor(timeout, TimeUnit.MILLISECONDS)) throw new IllegalStateException("protoc timed out after " + timeout + "ms");
            if (process.exitValue() != 0) {
                String diagnostic;
                try (var input = Files.newInputStream(log)) { diagnostic = new String(input.readNBytes(16384), java.nio.charset.StandardCharsets.UTF_8); }
                throw new IllegalArgumentException("protoc failed (exit " + process.exitValue() + "): " + diagnostic);
            }
            return DescriptorProtos.FileDescriptorSet.parseFrom(Files.readAllBytes(output));
        } finally {
            if (process != null && process.isAlive()) { process.destroyForcibly(); process.waitFor(5, TimeUnit.SECONDS); }
            try (var entries = Files.list(temporary)) {
                for (Path entry : entries.toList()) Files.deleteIfExists(entry);
            }
            Files.deleteIfExists(temporary);
        }
    }
}
