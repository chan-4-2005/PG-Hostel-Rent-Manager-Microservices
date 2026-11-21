package com.pgrent.common.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/** Helpers to read the logged-in user and their raw token anywhere in the code. */
public final class CurrentUser {

    private CurrentUser() {
    }

    public static AuthUser get() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AuthUser user)) {
            throw new IllegalStateException("No logged-in user");
        }
        return user;
    }

    /** The raw JWT of the current request, used to call another service on the user's behalf. */
    public static String token() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth == null ? null : (String) auth.getCredentials();
    }
}
