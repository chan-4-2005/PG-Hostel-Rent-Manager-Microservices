package com.pgrent.complaint;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {"com.pgrent.complaint", "com.pgrent.common.web"})
public class ComplaintServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(ComplaintServiceApplication.class, args);
    }
}
