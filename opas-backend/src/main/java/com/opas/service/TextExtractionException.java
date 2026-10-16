package com.opas.service;

/**
 * Thrown when a document's text cannot be extracted (unreadable scan, corrupt file,
 * or OCR failure). Treated as a terminal decode failure by the worker.
 */
public class TextExtractionException extends RuntimeException {

    public TextExtractionException(String message, Throwable cause) {
        super(message, cause);
    }
}
