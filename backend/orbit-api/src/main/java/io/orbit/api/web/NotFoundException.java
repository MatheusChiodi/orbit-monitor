package io.orbit.api.web;

/** Requested item does not exist (or no longer exists in memory). */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String what, String id) {
        super(what + " not found: " + id);
    }
}
