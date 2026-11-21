package com.pgrent.common.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Creates and verifies JWT tokens. All three services use the SAME secret,
 * so a token created by tenant-service is accepted by rent-service and complaint-service.
 */
public class JwtService {

    private final SecretKey key;
    private final long expiryMinutes;

    public JwtService(String secret, long expiryMinutes) {
        // HS256 needs a secret of at least 32 bytes
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiryMinutes = expiryMinutes;
    }

    public String generate(String username, String role, Long tenantId) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expiryMinutes * 60_000);
        var builder = Jwts.builder()
                .subject(username)
                .claim("role", role)
                .issuedAt(now)
                .expiration(expiry);
        if (tenantId != null) {
            builder.claim("tenantId", tenantId);
        }
        return builder.signWith(key).compact();
    }

    /** Throws JwtException if the token is invalid or expired. */
    public AuthUser parse(String token) throws JwtException {
        Claims claims = Jwts.parser().verifyWith(key).build()
                .parseSignedClaims(token).getPayload();
        Number tenantId = claims.get("tenantId", Number.class);
        return new AuthUser(
                claims.getSubject(),
                claims.get("role", String.class),
                tenantId == null ? null : tenantId.longValue());
    }
}
