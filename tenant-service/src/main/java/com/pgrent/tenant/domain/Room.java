package com.pgrent.tenant.domain;

import jakarta.persistence.*;

import java.math.BigDecimal;

@Entity
@Table(name = "room")
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "room_number", nullable = false, unique = true)
    private String roomNumber;

    @Column(name = "floor_no", nullable = false)
    private int floor;

    @Column(name = "monthly_rent", nullable = false, precision = 10, scale = 2)
    private BigDecimal monthlyRent;

    @Column(nullable = false)
    private int capacity;

    protected Room() {
    }

    public Room(String roomNumber, int floor, BigDecimal monthlyRent, int capacity) {
        this.roomNumber = roomNumber;
        this.floor = floor;
        this.monthlyRent = monthlyRent;
        this.capacity = capacity;
    }

    public Long getId() { return id; }
    public String getRoomNumber() { return roomNumber; }
    public int getFloor() { return floor; }
    public BigDecimal getMonthlyRent() { return monthlyRent; }
    public int getCapacity() { return capacity; }
}
