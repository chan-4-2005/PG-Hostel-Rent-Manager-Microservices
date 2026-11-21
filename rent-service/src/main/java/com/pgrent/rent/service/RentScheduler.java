package com.pgrent.rent.service;

import com.pgrent.common.security.JwtService;
import com.pgrent.rent.web.Dtos.GenerateResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.YearMonth;

/** Creates rent charges for every active tenant at 06:00 on the 1st of each month. */
@Component
public class RentScheduler {

    private static final Logger log = LoggerFactory.getLogger(RentScheduler.class);

    private final RentService rentService;
    private final JwtService jwtService;

    public RentScheduler(RentService rentService, JwtService jwtService) {
        this.rentService = rentService;
        this.jwtService = jwtService;
    }

    // seconds minutes hours day-of-month month day-of-week
    @Scheduled(cron = "0 0 6 1 * *")
    public void generateMonthlyCharges() {
        // No user is logged in during a scheduled job, so we create a short-lived "system" token
        String systemToken = jwtService.generate("rent-scheduler", "OWNER", null);
        try {
            GenerateResult result = rentService.generateForMonth(YearMonth.now(), systemToken);
            log.info("Monthly rent generation for {}: created={}, skipped={}",
                    result.month(), result.created(), result.skipped());
        } catch (Exception e) {
            log.error("Monthly rent generation failed", e);
        }
    }
}
