package com.opas.service;

import java.util.UUID;

/** A decode finished and its result is saved; published inside the decode transaction. */
public record DecodeReadyEvent(UUID userId, UUID documentId) {
}
