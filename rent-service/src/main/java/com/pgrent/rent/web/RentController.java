package com.pgrent.rent.web;

import com.pgrent.common.security.AuthUser;
import com.pgrent.common.security.CurrentUser;
import com.pgrent.rent.domain.ChargeStatus;
import com.pgrent.rent.service.RentService;
import com.pgrent.rent.web.Dtos.ChargeResponse;
import com.pgrent.rent.web.Dtos.CreateChargeRequest;
import com.pgrent.rent.web.Dtos.GenerateResult;
import com.pgrent.rent.web.Dtos.PaymentRequest;
import com.pgrent.rent.web.Dtos.PaymentResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/rent")
public class RentController {

    private final RentService rent;

    public RentController(RentService rent) {
        this.rent = rent;
    }

    /** Create this month's (or the given month's) rent for every active tenant. */
    @PostMapping("/charges/generate")
    @PreAuthorize("hasRole('OWNER')")
    public GenerateResult generate(@RequestParam(required = false) String month) {
        YearMonth ym = month == null ? YearMonth.now() : RentService.parseMonth(month);
        return rent.generateForMonth(ym, CurrentUser.token());
    }

    /** Create one charge for one tenant. */
    @PostMapping("/charges")
    @PreAuthorize("hasRole('OWNER')")
    @ResponseStatus(HttpStatus.CREATED)
    public ChargeResponse createCharge(@Valid @RequestBody CreateChargeRequest req) {
        return rent.createCharge(req.tenantId(), RentService.parseMonth(req.month()), CurrentUser.token());
    }

    @GetMapping("/charges")
    @PreAuthorize("hasRole('OWNER')")
    public List<ChargeResponse> list(@RequestParam(required = false) String month,
                                     @RequestParam(required = false) ChargeStatus status) {
        return rent.listCharges(month, status);
    }

    @PostMapping("/payments")
    @PreAuthorize("hasRole('OWNER')")
    @ResponseStatus(HttpStatus.CREATED)
    public ChargeResponse recordPayment(@Valid @RequestBody PaymentRequest req) {
        return rent.recordPayment(req);
    }

    @GetMapping("/charges/{chargeId}/payments")
    @PreAuthorize("hasRole('OWNER')")
    public List<PaymentResponse> payments(@PathVariable Long chargeId) {
        return rent.paymentsForCharge(chargeId);
    }

    /** Owner: any tenant. Tenant: only their own id (checked inside the service). */
    @GetMapping("/tenants/{tenantId}/dues")
    public List<ChargeResponse> duesForTenant(@PathVariable Long tenantId) {
        return rent.duesForTenant(tenantId, CurrentUser.get());
    }

    @GetMapping("/my-dues")
    @PreAuthorize("hasRole('TENANT')")
    public List<ChargeResponse> myDues() {
        AuthUser me = CurrentUser.get();
        return rent.duesForTenant(me.tenantId(), me);
    }
}
