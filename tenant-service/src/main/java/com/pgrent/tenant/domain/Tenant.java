package com.pgrent.tenant.domain;

import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table(name = "tenant")
public class Tenant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String phone;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "room_id")
    private Room room;

    @Column(name = "move_in_date", nullable = false)
    private LocalDate moveInDate;

    @Column(name = "move_out_date")
    private LocalDate moveOutDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TenantStatus status = TenantStatus.ACTIVE;

    protected Tenant() {
    }

    public Tenant(String name, String phone, Room room, LocalDate moveInDate) {
        this.name = name;
        this.phone = phone;
        this.room = room;
        this.moveInDate = moveInDate;
    }

    public void checkOut(LocalDate date) {
        this.status = TenantStatus.CHECKED_OUT;
        this.moveOutDate = date;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getPhone() { return phone; }
    public Room getRoom() { return room; }
    public LocalDate getMoveInDate() { return moveInDate; }
    public LocalDate getMoveOutDate() { return moveOutDate; }
    public TenantStatus getStatus() { return status; }
}
