package openaf.plugins.grpc;

import com.google.protobuf.*;
import com.google.protobuf.DescriptorProtos.*;
import com.google.protobuf.util.JsonFormat;
import com.google.gson.*;
import java.nio.file.*;
import java.util.*;

/** Schema and payload conversion without generated message classes. */
public final class Conversion {
    private Conversion() {}
    public static String schema(String options) throws Exception {
        var schema = Schema.load(JsonParser.parseString(options).getAsJsonObject());
        validateUnknown(schema);
        return JsonFormat.printer().print(schema);
    }
    private static void validateUnknown(Message message) {
        if (!message.getUnknownFields().asMap().isEmpty()) throw new IllegalArgumentException("Custom options or unknown descriptor fields cannot be converted");
        for (var entry : message.getAllFields().entrySet()) {
            if (entry.getKey().getJavaType() == Descriptors.FieldDescriptor.JavaType.MESSAGE) {
                if (entry.getKey().isRepeated()) for (Object value : (List<?>) entry.getValue()) validateUnknown((Message) value);
                else validateUnknown((Message) entry.getValue());
            }
        }
    }
    private static FileDescriptorSet descriptor(String json) throws Exception {
        var builder = FileDescriptorSet.newBuilder();
        JsonFormat.parser().merge(json, builder);
        return builder.build();
    }
    private static Descriptors.FileDescriptor resolve(String name, Map<String, FileDescriptorProto> pending,
            Map<String, Descriptors.FileDescriptor> done, Set<String> active) throws Exception {
        if (done.containsKey(name)) return done.get(name);
        if (!active.add(name)) throw new IllegalArgumentException("Cyclic import: " + name);
        var file = pending.get(name);
        if (file == null) throw new IllegalArgumentException("Missing import: " + name);
        var dependencies = new ArrayList<Descriptors.FileDescriptor>();
        for (String dependency : file.getDependencyList()) dependencies.add(resolve(dependency, pending, done, active));
        var result = Descriptors.FileDescriptor.buildFrom(file, dependencies.toArray(new Descriptors.FileDescriptor[0]));
        active.remove(name); done.put(name, result); return result;
    }
    private static Descriptors.Descriptor find(Descriptors.Descriptor message, String name) {
        if (message.getFullName().equals(name)) return message;
        for (var nested : message.getNestedTypes()) { var found = find(nested, name); if (found != null) return found; }
        return null;
    }
    private static Descriptors.Descriptor message(String options, String name) throws Exception {
        var pending = new LinkedHashMap<String, FileDescriptorProto>();
        for (var file : Schema.load(JsonParser.parseString(options).getAsJsonObject()).getFileList()) {
            if (pending.putIfAbsent(file.getName(), file) != null) throw new IllegalArgumentException("Duplicate file: " + file.getName());
        }
        var done = new LinkedHashMap<String, Descriptors.FileDescriptor>();
        for (String file : pending.keySet()) resolve(file, pending, done, new HashSet<>());
        for (var file : done.values()) for (var type : file.getMessageTypes()) {
            var found = find(type, name); if (found != null) return found;
        }
        throw new IllegalArgumentException("Unknown message: " + name);
    }
    public static byte[] encode(String options, String name, String json) throws Exception {
        var builder = DynamicMessage.newBuilder(message(options, name));
        JsonFormat.parser().merge(json, builder); return builder.build().toByteArray();
    }
    public static String decode(String options, String name, byte[] bytes) throws Exception {
        return JsonFormat.printer().print(DynamicMessage.parseFrom(message(options, name), bytes));
    }
    private static String quote(String value) { return new Gson().toJson(value); }
    private static String optionValue(Object value) {
        if (value instanceof String) return quote((String) value);
        if (value instanceof ByteString) {
            var result = new StringBuilder("\"");
            for (byte b : ((ByteString) value).toByteArray()) result.append(String.format("\\%03o", b & 255));
            return result.append('"').toString();
        }
        return value.toString();
    }
    private static List<String> options(Message value) {
        if (!value.getUnknownFields().asMap().isEmpty()) throw new IllegalArgumentException("Custom/unknown options cannot be rendered");
        var result = new ArrayList<String>();
        for (var entry : value.getAllFields().entrySet()) {
            String name = entry.getKey().getName();
            if (name.equals("map_entry")) continue;
            if (entry.getKey().isRepeated() || entry.getKey().getJavaType() == Descriptors.FieldDescriptor.JavaType.MESSAGE)
                throw new IllegalArgumentException("Unsupported option: " + name);
            result.add(name + " = " + optionValue(entry.getValue()));
        }
        return result;
    }
    private static void optionLines(StringBuilder out, Message value, String indent) {
        for (String option : options(value)) out.append(indent).append("option ").append(option).append(";\n");
    }
    private static String type(FieldDescriptorProto field) {
        if (field.getType() == FieldDescriptorProto.Type.TYPE_GROUP) throw new IllegalArgumentException("Groups are not supported");
        if (!field.getTypeName().isEmpty()) return field.getTypeName();
        return field.getType().name().substring(5).toLowerCase(Locale.ROOT);
    }
    private static void enumeration(StringBuilder out, EnumDescriptorProto value, String indent) {
        out.append(indent).append("enum ").append(value.getName()).append(" {\n");
        optionLines(out, value.getOptions(), indent + "  ");
        for (var item : value.getValueList()) {
            out.append(indent).append("  ").append(item.getName()).append(" = ").append(item.getNumber());
            var opts = options(item.getOptions());
            if (!opts.isEmpty()) out.append(" [").append(String.join(", ", opts)).append(']');
            out.append(";\n");
        }
        for (var range : value.getReservedRangeList()) out.append(indent).append("  reserved ").append(range.getStart()).append(" to ").append(range.getEnd() == Integer.MAX_VALUE ? "max" : range.getEnd()).append(";\n");
        for (String name : value.getReservedNameList()) out.append(indent).append("  reserved ").append(quote(name)).append(";\n");
        out.append(indent).append("}\n");
    }
    private static void field(StringBuilder out, FieldDescriptorProto field, Map<String, DescriptorProto> maps,
            String indent, boolean oneof, boolean proto3) {
        out.append(indent);
        var map = maps.get(field.getTypeName());
        if (map != null) {
            if (field.getLabel() != FieldDescriptorProto.Label.LABEL_REPEATED || map.getFieldCount() != 2) throw new IllegalArgumentException("Invalid map entry");
            out.append("map<").append(type(map.getField(0))).append(", ").append(type(map.getField(1))).append('>');
        } else {
            if (!oneof && (field.getLabel() != FieldDescriptorProto.Label.LABEL_OPTIONAL || !proto3 || field.getProto3Optional()))
                out.append(field.getLabel().name().substring(6).toLowerCase(Locale.ROOT)).append(' ');
            out.append(type(field));
        }
        out.append(' ').append(field.getName()).append(" = ").append(field.getNumber());
        var opts = options(field.getOptions());
        if (field.hasDefaultValue()) {
            String value = field.getDefaultValue();
            opts.add("default = " + (field.getType() == FieldDescriptorProto.Type.TYPE_STRING ? quote(value)
                : field.getType() == FieldDescriptorProto.Type.TYPE_BYTES ? "\"" + value + "\"" : value));
        }
        // Preserve explicit JSON names (including compiler-generated defaults).
        if (field.hasJsonName()) opts.add("json_name = " + quote(field.getJsonName()));
        if (!opts.isEmpty()) out.append(" [").append(String.join(", ", opts)).append(']');
        out.append(";\n");
    }
    private static void message(StringBuilder out, DescriptorProto value, String prefix, String indent, boolean proto3) {
        if (value.getExtensionCount() != 0 || value.getExtensionRangeCount() != 0) throw new IllegalArgumentException("Extensions are not supported");
        String full = prefix + "." + value.getName();
        var maps = new HashMap<String, DescriptorProto>();
        for (var nested : value.getNestedTypeList()) if (nested.getOptions().getMapEntry()) maps.put(full + "." + nested.getName(), nested);
        out.append(indent).append("message ").append(value.getName()).append(" {\n");
        optionLines(out, value.getOptions(), indent + "  ");
        for (var nested : value.getNestedTypeList()) if (!nested.getOptions().getMapEntry()) message(out, nested, full, indent + "  ", proto3);
        for (var enumeration : value.getEnumTypeList()) enumeration(out, enumeration, indent + "  ");
        for (var field : value.getFieldList()) if (!field.hasOneofIndex() || field.getProto3Optional()) field(out, field, maps, indent + "  ", false, proto3);
        for (int i = 0; i < value.getOneofDeclCount(); i++) {
            final int index = i;
            var fields = value.getFieldList().stream().filter(f -> f.hasOneofIndex() && f.getOneofIndex() == index).toList();
            if (fields.size() == 1 && fields.get(0).getProto3Optional()) continue;
            out.append(indent).append("  oneof ").append(value.getOneofDecl(i).getName()).append(" {\n");
            optionLines(out, value.getOneofDecl(i).getOptions(), indent + "    ");
            for (var field : fields) field(out, field, maps, indent + "    ", true, proto3);
            out.append(indent).append("  }\n");
        }
        for (var range : value.getReservedRangeList()) out.append(indent).append("  reserved ").append(range.getStart()).append(" to ").append(range.getEnd() == 536870912 ? "max" : range.getEnd() - 1).append(";\n");
        for (String name : value.getReservedNameList()) out.append(indent).append("  reserved ").append(quote(name)).append(";\n");
        out.append(indent).append("}\n");
    }
    public static String proto(String json, String selected) throws Exception {
        var set = descriptor(json);
        validateUnknown(set);
        if (selected == null || selected.isEmpty()) {
            if (set.getFileCount() != 1) throw new IllegalArgumentException("protofile must select one descriptor file");
            selected = set.getFile(0).getName();
        }
        FileDescriptorProto file = null;
        for (var candidate : set.getFileList()) if (candidate.getName().equals(selected)) file = candidate;
        if (file == null) throw new IllegalArgumentException("Unknown protofile: " + selected);
        if (!file.getUnknownFields().asMap().isEmpty() || (!file.getSyntax().isEmpty() && !file.getSyntax().equals("proto2") && !file.getSyntax().equals("proto3"))) throw new IllegalArgumentException("Unsupported proto syntax/edition");
        if (file.getExtensionCount() != 0) throw new IllegalArgumentException("Extensions are not supported");
        var out = new StringBuilder("syntax = " + quote(file.getSyntax().isEmpty() ? "proto2" : file.getSyntax()) + ";\n");
        if (!file.getPackage().isEmpty()) out.append("package ").append(file.getPackage()).append(";\n");
        for (int i = 0; i < file.getDependencyCount(); i++) out.append("import ").append(file.getPublicDependencyList().contains(i) ? "public " : file.getWeakDependencyList().contains(i) ? "weak " : "").append(quote(file.getDependency(i))).append(";\n");
        optionLines(out, file.getOptions(), "");
        for (var value : file.getMessageTypeList()) message(out, value, file.getPackage().isEmpty() ? "" : "." + file.getPackage(), "", file.getSyntax().equals("proto3"));
        for (var value : file.getEnumTypeList()) enumeration(out, value, "");
        for (var service : file.getServiceList()) {
            out.append("service ").append(service.getName()).append(" {\n");
            optionLines(out, service.getOptions(), "  ");
            for (var method : service.getMethodList()) {
                out.append("  rpc ").append(method.getName()).append('(').append(method.getClientStreaming() ? "stream " : "").append(method.getInputType()).append(") returns (").append(method.getServerStreaming() ? "stream " : "").append(method.getOutputType()).append(")");
                if (options(method.getOptions()).isEmpty()) out.append(";\n");
                else { out.append(" {\n"); optionLines(out, method.getOptions(), "    "); out.append("  }\n"); }
            }
            out.append("}\n");
        }
        return out.toString();
    }
}
