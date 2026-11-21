package com.pgrent.rent.service;

import com.pgrent.common.security.AuthUser;
import com.pgrent.rent.domain.ChargeStatus;
import com.pgrent.rent.domain.Payment;
import com.pgrent.rent.domain.RentCharge;
import com.pgrent.rent.repo.PaymentRepository;
import com.pgrent.rent.repo.RentChargeRepository;
import com.pgrent.rent.service.TenantClient.TenantDto;
import com.pgrent.rent.web.Dtos.ChargeResponse;
import com.pgrent.rent.web.Dtos.GenerateResult;
import com.pgrent.rent.web.Dtos.PaymentRequest;
import com.pgrent.rent.web.Dtos.PaymentResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.List;

@Service
public class RentService {

    private final RentChargeRepository charges;
    private final PaymentRepository payments;
    private final TenantClient tenantClient;
    private final int dueDay;

    public RentService(RentChargeRepository charges, PaymentRepository payments,
                       TenantClient tenantClient, @Value("${app.rent.due-day}") int dueDay) {
        this.charges = charges;
        this.payments = payments;
        this.tenantClient = tenantClient;
        this.dueDay = dueDay;
    }

    public static YearMonth parseMonth(String month) {
        try {
            return YearMonth.parse(month); // expects 2026-12
        } catch (DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Month must look like 2026-12");
        }
    }

    // NOTE: not @Transactional on purpose — we make HTTP calls here, and each save is its own small transaction.
    public GenerateResult generateForMonth(YearMonth month, String token) {
        List<TenantDto> activeTenants = tenantClient.getActiveTenants(token);
        int created = 0;
        int skipped = 0;
        for (TenantDto tenant : activeTenants) {
            boolean notMovedInYet = tenant.moveInDate() != null && tenant.moveInDate().isAfter(month.atEndOfMonth());
            if (notMovedInYet || charges.existsByTenantIdAndMonth(tenant.id(), month.toString())) {
                skipped++;
                continue;
            }
            try {
                charges.save(newCharge(tenant, month));
                created++;
            } catch (DataIntegrityViolationException duplicate) {
                skipped++; // someone created it at the same moment
            }
        }
        return new GenerateResult(month.toString(), created, skipped);
    }

    /** Creates a single charge, after asking tenant-service whether the tenant is active. */
    public ChargeResponse createCharge(Long tenantId, YearMonth month, String token) {
        TenantDto tenant = tenantClient.getTenant(tenantId, token);
        if (!"ACTIVE".equals(tenant.status())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Tenant has checked out; no new rent can be charged");
        }
        if (charges.existsByTenantIdAndMonth(tenantId, month.toString())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Rent for " + month + " already exists for this tenant");
        }
        return ChargeResponse.of(charges.save(newCharge(tenant, month)));
    }

    private RentCharge newCharge(TenantDto tenant, YearMonth month) {
        int day = Math.min(dueDay, month.lengthOfMonth());
        return new RentCharge(tenant.id(), tenant.name(), tenant.roomNumber(), month.toString(),
                tenant.monthlyRent(), month.atDay(day));
    }

    @Transactional
    public ChargeResponse recordPayment(PaymentRequest req) {
        RentCharge charge = charges.findById(req.chargeId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Charge not found"));
        if (req.amount().compareTo(charge.getOutstanding()) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Payment is more than the outstanding amount (" + charge.getOutstanding() + ")");
        }
        payments.save(new Payment(charge, req.amount(), req.mode(), req.reference()));
        charge.applyPayment(req.amount()); // charge is managed, so JPA saves this change automatically
        return ChargeResponse.of(charge);
    }

    @Transactional(readOnly = true)
    public List<ChargeResponse> listCharges(String month, ChargeStatus status) {
        List<RentCharge> result;
        if (month != null && status != null) {
            result = charges.findByMonthAndStatusOrderByRoomNumberAsc(month, status);
        } else if (month != null) {
            result = charges.findByMonthOrderByRoomNumberAsc(month);
        } else {
            result = charges.findAllByOrderByMonthDescRoomNumberAsc();
            if (status != null) {
                result = result.stream().filter(c -> c.getStatus() == status).toList();
            }
        }
        return result.stream().map(ChargeResponse::of).toList();
    }

    /** Owners can see anyone's dues; a tenant only their own. */
    @Transactional(readOnly = true)
    public List<ChargeResponse> duesForTenant(Long tenantId, AuthUser caller) {
        if (caller.isTenant() && !tenantId.equals(caller.tenantId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only view your own dues");
        }
        return charges.findByTenantIdOrderByMonthDesc(tenantId).stream().map(ChargeResponse::of).toList();
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> paymentsForCharge(Long chargeId) {
        if (!charges.existsById(chargeId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Charge not found");
        }
        return payments.findByChargeIdOrderByPaidAtAsc(chargeId).stream().map(PaymentResponse::of).toList();
    }

    /** Called when tenant-service publishes a "tenant checked out" event. */
    @Transactional
    public int markTenantCheckedOut(Long tenantId) {
        return charges.markTenantCheckedOut(tenantId);
    }
}
