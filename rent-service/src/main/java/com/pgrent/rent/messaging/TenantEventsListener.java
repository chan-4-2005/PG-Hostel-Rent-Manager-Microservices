package com.pgrent.rent.messaging;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pgrent.common.events.TenantCheckedOutEvent;
import com.pgrent.common.events.Topics;
import com.pgrent.rent.service.RentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * ASYNCHRONOUS communication: tenant-service does not call us. It drops a message on Kafka,
 * and this method runs whenever a message arrives — even if we were down when it was sent.
 */
@Component
public class TenantEventsListener {

    private static final Logger log = LoggerFactory.getLogger(TenantEventsListener.class);

    private final ObjectMapper objectMapper;
    private final RentService rentService;

    public TenantEventsListener(ObjectMapper objectMapper, RentService rentService) {
        this.objectMapper = objectMapper;
        this.rentService = rentService;
    }

    @KafkaListener(topics = Topics.TENANT_CHECKED_OUT)
    public void onTenantCheckedOut(String message) throws JsonProcessingException {
        TenantCheckedOutEvent event = objectMapper.readValue(message, TenantCheckedOutEvent.class);
        int updated = rentService.markTenantCheckedOut(event.tenantId());
        log.info("Tenant {} checked out: flagged {} rent charge(s)", event.tenantId(), updated);
    }
}
