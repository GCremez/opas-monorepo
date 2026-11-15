package com.opas.service;

/**
 * What an uploaded document may put into a Claude prompt. The letter text and its filename
 * come from the user (and, through them, from whoever wrote the letter), so both are
 * bounded and kept from reading as instructions.
 */
final class PromptSafety {

    /**
     * About 20 pages of letter. Anything longer is cut: a 20 MB text upload would otherwise
     * be billed as millions of input tokens per request.
     */
    static final int MAX_DOCUMENT_CHARS = 60_000;

    static final String BEGIN = "BEGIN_DOCUMENT";
    static final String END = "END_DOCUMENT";

    private static final int MAX_FILENAME_CHARS = 80;

    private PromptSafety() {
    }

    /**
     * The document between BEGIN_DOCUMENT and END_DOCUMENT, cut to {@link #MAX_DOCUMENT_CHARS}.
     * A document can't close the fence early by containing the end marker itself.
     */
    static String fence(String content) {
        String text = content == null ? "" : content;
        if (text.length() > MAX_DOCUMENT_CHARS) {
            text = text.substring(0, MAX_DOCUMENT_CHARS);
        }
        return BEGIN + "\n" + text.replace(END, END + "_") + "\n" + END;
    }

    /**
     * The filename sits outside the fence, so it is reduced to characters a filename needs:
     * no sentence can be written with these, and it stays on one short line.
     */
    static String filename(String filename) {
        if (filename == null) {
            return "document";
        }
        String cleaned = filename.replaceAll("[^\\p{L}\\p{N}._-]", "_");
        return cleaned.length() > MAX_FILENAME_CHARS ? cleaned.substring(0, MAX_FILENAME_CHARS) : cleaned;
    }
}
