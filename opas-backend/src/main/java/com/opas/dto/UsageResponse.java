package com.opas.dto;

public class UsageResponse {
    private long remaining;
    private int limit;
    private String period;

    public UsageResponse() {
    }

    public UsageResponse(long remaining, int limit, String period) {
        this.remaining = remaining;
        this.limit = limit;
        this.period = period;
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
}
