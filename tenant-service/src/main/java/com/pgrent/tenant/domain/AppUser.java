package com.pgrent.tenant.domain;

import jakarta.persistence.*;

/** A login account. role is OWNER or TENANT; tenantId links a TENANT login to a tenant row. */
@Entity
@Table(name = "app_user") // "user" is a reserved word in PostgreSQL
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String role;

    @Column(name = "tenant_id")
    private Long tenantId;

    @Column(nullable = false)
    private boolean enabled = true;

    protected AppUser() {
    }

    public AppUser(String username, String passwordHash, String role, Long tenantId) {
        this.username = username;
        this.passwordHash = passwordHash;
        this.role = role;
        this.tenantId = tenantId;
    }

    public void disable() {
        this.enabled = false;
    }

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getPasswordHash() { return passwordHash; }
    public String getRole() { return role; }
    public Long getTenantId() { return tenantId; }
    public boolean isEnabled() { return enabled; }
}
