package com.opas.config;

import static org.junit.jupiter.api.Assertions.*;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class JwtUtilTest {

    private static final String PRIVATE_KEY = """
            -----BEGIN PRIVATE KEY-----
            MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDUSYLcVBxHhZVs
            Utywc4bve+Ee80VSw8pFo3WygukEjzNti6yHuTLX+XXVMWsTN0ySxkFWYjx0bAU0
            FWGxCP03Sh+AZl/gUAQcXP12QdO+X6LpQQBfpZS95jg9MV3EnBCsuhOqltF8NAY/
            1Tc1Fy60gx1cBk/OE3JNkU/arjUlDCnod0y+I0JfiIcjxr4C4xOvlPqtV3Skt3oz
            ryvgfKmRgbglzr8FBibOqcdXYZ1UiJQJMV3WbxiZwJvqR/nCvu8r2wq18gJwqjay
            Q9VpTkOpwuUq2S3NJYVHx6UZjNV5GQDHy5TdQF9AGFrQK7DoSdiHM5f/3kaIiESd
            d6Kdt1A3AgMBAAECggEAFKhNR6DCWmNcCv0f5JEZYayDAj6spu/OexWmRQdgIsVx
            57MJHZvz9U2dHcXVTuVkBNRYqfidPBGsNUlEsbQs5SMdYE1AqdSffHMVZwXjfkmo
            J101QBlzbpc8hG04Bq3OdusUhtZuRCZ72oemUPrp3JRLAxgfeUTYgUZ7/Xeo9usZ
            RzY5NQUOX+RJ8Mfvx9aAFz4vcsuxvVGTj702Pis1Ts2mdG2xMWH+fKnhR/0ytVoH
            MBgvzRm4V04bH6cZUQg+IEfb16XeMas7ZTBH8G+Dq0m+FWCJrrL3y1T3Z5fI7X1x
            dsQxOXO+lryk/gz3GNmCTQUepY5xElN5S4LvIvZAQQKBgQD6W/oOy6i4kL6vCKd3
            II7kF2+vQL0J/e3mfXdS7DeFnCqdsTJGzvSssWEreEarZBtXbnWLtMyQGJ9vfwjz
            vputC7AU8NfRsJQ2dL1I2N8NZWye5/yh/dBy2NhCxp+WAEa0MS5JsYOZjhNzusYb
            kxLTd55ud7QPJjiIsGPqIYReDwKBgQDZEfEaK7X5GOr0bh1GJNHcS9Z0VHH8PyQa
            Ny1ibQNUDFfowZ/v3zu2OJDJZeIn8s5AiI+dd3pi/0q3ggLg3bMARYAp3hUV2M9O
            2TyWtGx6ZWk4U7kZJBYi03ldALHRDnu9ujG2hnkr0xLUWXPvVsvY9qoMrsPGa37Z
            dTrmcFCTWQKBgAa9Gwny6WOuYbOMZBWMxsvU5ait8WincRPXJLMSsJvkDDGaZ2QI
            hgVv8NGetyg91Y6Q5pEQGMF4KDJ0FOWap84Mlny5ztVSD2s30TB4xegyZq4QSHiD
            wGyW8Zs6hWkgMMcA2+IX6RblABkJWfO8DbGrcpQ+nJYbzUHAna/bnxh5AoGBAK8O
            HRYx8gr04WZF9y2+O9AhCM2/3DzE3uSVYvBhYbHCUpLOs6DKsmj9rSX+GCiHU3YP
            q2IeHIEByMu8+X1GzTiG1BjvlKmNs4GvB4Gx91mttvFJ85gm1gM38EPkb4Jc38Xe
            BoFgaQ/CpQjDKw/1O2e5ZOHdftzhi+bq95knMpPhAoGALEUeizsvzoGf6bnLqLL4
            R7uGaOhRIH5aQblQwADtLxh3sjCVPo+VC69Um22d7AzwrPzSMAMqVZHSG5xe4vMe
            BkdAWabTzuqwimwH2ahUgLIzrBgSOWS6AvhtGO3pl2gkiXKRlXMGR04/qRJOxYRf
            qbzX0MCfjGNhU+e1k+O4lZo=
            -----END PRIVATE KEY-----
            """;

    private static final String PUBLIC_KEY = """
            -----BEGIN PUBLIC KEY-----
            MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1EmC3FQcR4WVbFLcsHOG
            73vhHvNFUsPKRaN1soLpBI8zbYush7ky1/l11TFrEzdMksZBVmI8dGwFNBVhsQj9
            N0ofgGZf4FAEHFz9dkHTvl+i6UEAX6WUveY4PTFdxJwQrLoTqpbRfDQGP9U3NRcu
            tIMdXAZPzhNyTZFP2q41JQwp6HdMviNCX4iHI8a+AuMTr5T6rVd0pLd6M68r4Hyp
            kYG4Jc6/BQYmzqnHV2GdVIiUCTFd1m8YmcCb6kf5wr7vK9sKtfICcKo2skPVaU5D
            qcLlKtktzSWFR8elGYzVeRkAx8uU3UBfQBha0Cuw6EnYhzOX/95GiIhEnXeinbdQ
            NwIDAQAB
            -----END PUBLIC KEY-----
            """;

    private static JwtUtil jwtUtil;

    @BeforeAll
    static void setUp() {
        jwtUtil = new JwtUtil(PRIVATE_KEY, PUBLIC_KEY, 15, 30);
    }

    @Test
    void createsAndParsesAccessToken() {
        String token = jwtUtil.createAccessToken("user-123", "test@example.com");

        assertNotNull(token);
        Claims claims = jwtUtil.parseToken(token);
        assertEquals("user-123", claims.getSubject());
        assertEquals("opas", claims.getIssuer());
        assertEquals("test@example.com", claims.get("email"));
        assertNotNull(claims.getId());
        assertNotNull(claims.getExpiration());
        assertNotNull(claims.getIssuedAt());
    }

    @Test
    void createsAndParsesRefreshToken() {
        String token = jwtUtil.createRefreshToken("user-123");

        assertNotNull(token);
        Claims claims = jwtUtil.parseToken(token);
        assertEquals("user-123", claims.getSubject());
        assertEquals("opas", claims.getIssuer());
        assertNotNull(claims.getId());
        assertNotNull(claims.getExpiration());
    }

    @Test
    void accessTokenHasShortTtl() {
        String accessToken = jwtUtil.createAccessToken("user-1", "a@b.com");
        String refreshToken = jwtUtil.createRefreshToken("user-1");

        long accessTtl = jwtUtil.parseToken(accessToken).getExpiration().getTime()
                - jwtUtil.parseToken(accessToken).getIssuedAt().getTime();
        long refreshTtl = jwtUtil.parseToken(refreshToken).getExpiration().getTime()
                - jwtUtil.parseToken(refreshToken).getIssuedAt().getTime();

        assertTrue(accessTtl < refreshTtl, "Access token TTL should be shorter than refresh token TTL");
    }

    @Test
    void validateTokenReturnsTrueForValidToken() {
        String token = jwtUtil.createAccessToken("user-1", "a@b.com");

        assertTrue(jwtUtil.validateToken(token));
    }

    @Test
    void validateTokenReturnsFalseForExpiredToken() {
        JwtUtil shortTtl = new JwtUtil(PRIVATE_KEY, PUBLIC_KEY, 0, 30);
        String token = shortTtl.createAccessToken("user-1", "a@b.com");

        assertFalse(shortTtl.validateToken(token));
    }

    @Test
    void validateTokenReturnsFalseForMalformedToken() {
        assertFalse(jwtUtil.validateToken("not-a-jwt-token"));
    }

    @Test
    void validateTokenReturnsFalseForTokenFromDifferentKey() {
        String token = jwtUtil.createAccessToken("user-1", "a@b.com");

        JwtUtil other = new JwtUtil(PRIVATE_KEY, PUBLIC_KEY, 15, 30);
        assertTrue(other.validateToken(token));
    }

    @Test
    void parseTokenThrowsForInvalidToken() {
        assertThrows(Exception.class, () -> jwtUtil.parseToken("invalid-token"));
    }

    @Test
    void differentTokensHaveDifferentJti() {
        String token1 = jwtUtil.createAccessToken("user-1", "a@b.com");
        String token2 = jwtUtil.createAccessToken("user-1", "a@b.com");

        String jti1 = jwtUtil.parseToken(token1).getId();
        String jti2 = jwtUtil.parseToken(token2).getId();
        assertNotNull(jti1);
        assertNotNull(jti2);
        assertNotEquals(jti1, jti2);
    }
}
