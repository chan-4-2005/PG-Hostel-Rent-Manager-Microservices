package com.pgrent.rent.domain;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "charge_id")
    private RentCharge charge;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentMode mode;

    /** UPI transaction id, receipt number, etc. */
    private String reference;

    @Column(name = "paid_at", nullable = false)
    private LocalDateTime paidAt;

    protected Payment() {
    }

    public Payment(RentCharge charge, BigDecimal amount, PaymentMode mode, String reference) {
        this.charge = charge;
        this.amount = amount;
        this.mode = mode;
        this.reference = reference;
        this.paidAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public RentCharge getCharge() { return charge; }
    public BigDecimal getAmount() { return amount; }
    public PaymentMode getMode() { return mode; }
    public String getReference() { return reference; }
    public LocalDateTime getPaidAt() { return paidAt; }
}
