package com.opas.dto;

public class UsageResponse {
    private long remaining;
    private int limit;
    private String period;
    /** Whether this user can generate reply drafts right now (Premium, or the beta). */
    private boolean draftsIncluded;
    /** Whether this user gets deadline reminders (Premium, or the beta). */
    private boolean remindersIncluded;
    /** Whether this user sees case timelines (Premium, or the beta). */
    private boolean casesIncluded;

    public UsageResponse() {
    }

    public UsageResponse(long remaining, int limit, String period, boolean draftsIncluded,
            boolean remindersIncluded, boolean casesIncluded) {
        this.remaining = remaining;
        this.limit = limit;
        this.period = period;
        this.draftsIncluded = draftsIncluded;
        this.remindersIncluded = remindersIncluded;
        this.casesIncluded = casesIncluded;
    }

    public long getRemaining() {
        return remaining;
    }

    public int getLimit() {
        return limit;
    }

    public String getPeriod() {
        return period;
    }

    public boolean isDraftsIncluded() {
        return draftsIncluded;
    }

    public boolean isRemindersIncluded() {
        return remindersIncluded;
    }

    public boolean isCasesIncluded() {
        return casesIncluded;
    }
}
