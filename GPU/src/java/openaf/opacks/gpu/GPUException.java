package openaf.opacks.gpu;

/** Backend errors before commit are returned as data, so Rhino cannot unwrap a LinkageError. */
public final class GPUException extends RuntimeException {
    public final String stage;
    public GPUException(String stage, String message) {
        super(message);
        this.stage = stage;
    }
}
