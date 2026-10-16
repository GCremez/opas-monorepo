package com.opas.dto;

public class CheckoutResponse {
    private String url;

    public CheckoutResponse() {
    }

    public CheckoutResponse(String url) {
        this.url = url;
    }

    public String getUrl() {
        return url;
    }
}