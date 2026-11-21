package com.pgrent.tenant.web;

import com.pgrent.common.security.AuthUser;
import com.pgrent.common.security.CurrentUser;
import com.pgrent.tenant.domain.TenantStatus;
import com.pgrent.tenant.service.TenantService;
import com.pgrent.tenant.web.Dtos.TenantRequest;
import com.pgrent.tenant.web.Dtos.TenantResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tenants")
public class TenantController {

    private final TenantService tenants;

    public TenantController(TenantService tenants) {
        this.tenants = tenants;
    }

    @PostMapping
    @PreAuthorize("hasRole('OWNER')")
    @ResponseStatus(HttpStatus.CREATED)
    public TenantResponse create(@Valid @RequestBody TenantRequest req) {
        return tenants.create(req);
    }

    @GetMapping
    @PreAuthorize("hasRole('OWNER')")
    public List<TenantResponse> list(@RequestParam(required = false) TenantStatus status) {
        return tenants.list(status);
    }

    /** The logged-in tenant's own details. */
    @GetMapping("/me")
    @PreAuthorize("hasRole('TENANT')")
    public TenantResponse me() {
        AuthUser user = CurrentUser.get();
        return tenants.get(user.tenantId(), user);
    }

    /** Used by the other services too (they forward the caller's token). */
    @GetMapping("/{id}")
    public TenantResponse get(@PathVariable Long id) {
        return tenants.get(id, CurrentUser.get());
    }

    @PutMapping("/{id}/checkout")
    @PreAuthorize("hasRole('OWNER')")
    public TenantResponse checkOut(@PathVariable Long id) {
        return tenants.checkOut(id);
    }
}
