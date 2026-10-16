package com.opas.config;

/**
 * Thrown when a resource does not exist OR the caller is not authorized to see it.
 * Both cases must be indistinguishable to the client (a 404 with a generic body),
 * otherwise the API becomes an object-enumeration / ownership oracle (an attacker
 * can tell "exists but not yours" from "does not exist"). Never put the resource
 * type or id in the client-facing message.
 */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException() {
        super("Resource not found");
    }
}
