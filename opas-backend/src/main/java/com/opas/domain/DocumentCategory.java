package com.opas.domain;

import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;

/**
 * The built-in categories every user gets as folders. The key is stored in
 * {@code folders.category_key}; the app shows a translated name for it. The name here is
 * only the stored fallback.
 */
public enum DocumentCategory {
    TAX("tax", "Tax"),
    RESIDENCE("residence", "Residence & immigration"),
    KELA("kela", "Kela & benefits"),
    HEALTHCARE("healthcare", "Healthcare"),
    EMPLOYMENT("employment", "Employment"),
    EDUCATION("education", "Education"),
    HOUSING("housing", "Housing"),
    FINANCE("finance", "Finance");

    private final String key;
    private final String defaultName;

    DocumentCategory(String key, String defaultName) {
        this.key = key;
        this.defaultName = defaultName;
    }

    public String key() {
        return key;
    }

    public String defaultName() {
        return defaultName;
    }

    public static Optional<DocumentCategory> fromKey(String key) {
        if (key == null) {
            return Optional.empty();
        }
        String k = key.trim().toLowerCase(Locale.ROOT);
        return Arrays.stream(values()).filter(c -> c.key.equals(k)).findFirst();
    }
}
