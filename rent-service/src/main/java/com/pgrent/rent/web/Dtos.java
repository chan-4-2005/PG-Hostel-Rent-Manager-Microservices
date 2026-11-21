package com.pgrent.rent.web;

import com.pgrent.rent.domain.ChargeStatus;
import com.pgrent.rent.domain.Payment;
import com.pgrent.rent.domain.PaymentMode;
import com.pgrent.rent.domain.RentCharge;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public final class Dtos {

    private Dtos() {
    }

    public record CreateChargeRequest(@NotNull Long tenantId,
                                      @NotBlank String month) {
    }

    public record PaymentRequest(@NotNull Long chargeId,
                                 @NotNull @DecimalMin(value = "0.01", message = "must be greater than 0") BigDecimal amount,
                                 @NotNull PaymentMode mode,
                                 String reference) {
    }

    public record GenerateResult(String month, int created, int skipped) {
    }

    public record ChargeResponse(Long id, Long tenantId, String tenantName, String roomNumber,
                                 String month, BigDecimal amount, BigDecimal amountPaid,
                                 BigDecimal outstanding, LocalDate dueDate, ChargeStatus status,
                                 boolean overdue, boolean tenantCheckedOut) {
        public static ChargeResponse of(RentCharge c) {
            boolean overdue = c.getStatus() != ChargeStatus.PAID && c.getDueDate().isBefore(LocalDate.now());
            return new ChargeResponse(c.getId(), c.getTenantId(), c.getTenantName(), c.getRoomNumber(),
                    c.getMonth(), c.getAmount(), c.getAmountPaid(), c.getOutstanding(),
                    c.getDueDate(), c.getStatus(), overdue, c.isTenantCheckedOut());
        }
    }

    public record PaymentResponse(Long id, BigDecimal amount, PaymentMode mode, String reference,
                                  LocalDateTime paidAt) {
        public static PaymentResponse of(Payment p) {
            return new PaymentResponse(p.getId(), p.getAmount(), p.getMode(), p.getReference(), p.getPaidAt());
        }
    }
}
