package com.pgrent.rent.domain;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/** One month's rent for one tenant. */
@Entity
@Table(name = "rent_charge",
        uniqueConstraints = @UniqueConstraint(name = "uk_charge_tenant_month", columnNames = {"tenant_id", "charge_month"}))
public class RentCharge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    // Copied from tenant-service so the rent table can be shown without calling it every time
    @Column(name = "tenant_name", nullable = false)
    private String tenantName;

    @Column(name = "room_number", nullable = false)
    private String roomNumber;

    /** Month in the form 2026-12 */
    @Column(name = "charge_month", nullable = false, length = 7)
    private String month;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "amount_paid", nullable = false, precision = 10, scale = 2)
    private BigDecimal amountPaid = BigDecimal.ZERO;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChargeStatus status = ChargeStatus.UNPAID;

    /** Set to true when tenant-service tells us the tenant has checked out. */
    @Column(name = "tenant_checked_out", nullable = false)
    private boolean tenantCheckedOut = false;

    protected RentCharge() {
    }

    public RentCharge(Long tenantId, String tenantName, String roomNumber, String month,
                      BigDecimal amount, LocalDate dueDate) {
        this.tenantId = tenantId;
        this.tenantName = tenantName;
        this.roomNumber = roomNumber;
        this.month = month;
        this.amount = amount;
        this.dueDate = dueDate;
    }

    public BigDecimal getOutstanding() {
        return amount.subtract(amountPaid);
    }

    /** Adds a payment and recalculates the status. */
    public void applyPayment(BigDecimal paid) {
        this.amountPaid = this.amountPaid.add(paid);
        if (this.amountPaid.compareTo(this.amount) >= 0) {
            this.status = ChargeStatus.PAID;
        } else if (this.amountPaid.signum() > 0) {
            this.status = ChargeStatus.PARTIAL;
        }
    }

    public Long getId() { return id; }
    public Long getTenantId() { return tenantId; }
    public String getTenantName() { return tenantName; }
    public String getRoomNumber() { return roomNumber; }
    public String getMonth() { return month; }
    public BigDecimal getAmount() { return amount; }
    public BigDecimal getAmountPaid() { return amountPaid; }
    public LocalDate getDueDate() { return dueDate; }
    public ChargeStatus getStatus() { return status; }
    public boolean isTenantCheckedOut() { return tenantCheckedOut; }
}
