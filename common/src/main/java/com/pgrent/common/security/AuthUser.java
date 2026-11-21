package com.pgrent.common.security;

/**
 * The logged-in user, extracted from the JWT.
 * role is "OWNER" or "TENANT". tenantId is only set for TENANT users.
 */
public record AuthUser(String username, String role, Long tenantId) {

    public boolean isOwner() {
        return "OWNER".equals(role);
    }

    public boolean isTenant() {
        return "TENANT".equals(role);
    }
}
