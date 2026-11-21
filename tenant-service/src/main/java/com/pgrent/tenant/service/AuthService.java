package com.pgrent.tenant.service;

import com.pgrent.common.security.JwtService;
import com.pgrent.tenant.domain.AppUser;
import com.pgrent.tenant.repo.AppUserRepository;
import com.pgrent.tenant.web.Dtos.LoginRequest;
import com.pgrent.tenant.web.Dtos.LoginResponse;
import com.pgrent.tenant.web.Dtos.RegisterOwnerRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final AppUserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final String ownerSignupCode;

    public AuthService(AppUserRepository users, PasswordEncoder encoder, JwtService jwt,
                       @Value("${app.owner-signup-code}") String ownerSignupCode) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.ownerSignupCode = ownerSignupCode;
    }

    public void registerOwner(RegisterOwnerRequest req) {
        if (!ownerSignupCode.equals(req.signupCode())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Wrong owner signup code");
        }
        if (users.existsByUsername(req.username())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already taken");
        }
        users.save(new AppUser(req.username(), encoder.encode(req.password()), "OWNER", null));
    }

    public LoginResponse login(LoginRequest req) {
        AppUser user = users.findByUsername(req.username())
                .filter(u -> u.isEnabled() && encoder.matches(req.password(), u.getPasswordHash()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password"));
        String token = jwt.generate(user.getUsername(), user.getRole(), user.getTenantId());
        return new LoginResponse(token, user.getUsername(), user.getRole(), user.getTenantId());
    }
}
