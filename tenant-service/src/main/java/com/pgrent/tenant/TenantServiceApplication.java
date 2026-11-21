package com.pgrent.tenant;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.TimeZone;

// scanBasePackages also picks up the shared GlobalExceptionHandler from the common module
@SpringBootApplication(scanBasePackages = {"com.pgrent.tenant", "com.pgrent.common.web"})
public class TenantServiceApplication {

    public static void main(String[] args) {
        // PostgreSQL does not accept the old name "Asia/Calcutta" that some computers report.
        // Use the current name before the database connection is opened.
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Kolkata"));
        SpringApplication.run(TenantServiceApplication.class, args);
    }
}