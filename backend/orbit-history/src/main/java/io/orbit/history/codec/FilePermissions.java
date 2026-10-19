package io.orbit.history.codec;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFileAttributeView;
import java.nio.file.attribute.PosixFilePermissions;

/** Restricts history files to the current user where the file system supports POSIX permissions. */
public final class FilePermissions {

    private FilePermissions() {
    }

    public static void ownerOnly(Path path) throws IOException {
        PosixFileAttributeView view = Files.getFileAttributeView(path, PosixFileAttributeView.class);
        if (view != null) {
            view.setPermissions(PosixFilePermissions.fromString(Files.isDirectory(path) ? "rwx------" : "rw-------"));
        }
    }
}
