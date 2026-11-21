package com.pgrent.tenant.web;

import com.pgrent.tenant.service.AuthService;
import com.pgrent.tenant.web.Dtos.LoginRequest;
import com.pgrent.tenant.web.Dtos.LoginResponse;
import com.pgrent.tenant.web.Dtos.RegisterOwnerRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/register-owner")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> registerOwner(@Valid @RequestBody RegisterOwnerRequest req) {
        auth.registerOwner(req);
        return Map.of("message", "Owner account created. You can log in now.");
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest req) {
        return auth.login(req);
    }
}
