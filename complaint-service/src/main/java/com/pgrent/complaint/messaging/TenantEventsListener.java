package com.pgrent.complaint.messaging;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pgrent.common.events.TenantCheckedOutEvent;
import com.pgrent.common.events.Topics;
import com.pgrent.complaint.service.ComplaintService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Receives the SAME "tenant checked out" message as rent-service. Because this service has its own
 * consumer group (complaint-service), Kafka delivers a separate copy to each service.
 */
@Component
public class TenantEventsListener {

    private static final Logger log = LoggerFactory.getLogger(TenantEventsListener.class);

    private final ObjectMapper objectMapper;
    private final ComplaintService complaintService;

    public TenantEventsListener(ObjectMapper objectMapper, ComplaintService complaintService) {
        this.objectMapper = objectMapper;
        this.complaintService = complaintService;
    }

    @KafkaListener(topics = Topics.TENANT_CHECKED_OUT)
    public void onTenantCheckedOut(String message) throws JsonProcessingException {
        TenantCheckedOutEvent event = objectMapper.readValue(message, TenantCheckedOutEvent.class);
        int closed = complaintService.closeOpenComplaintsOfTenant(event.tenantId());
        log.info("Tenant {} checked out: closed {} complaint(s)", event.tenantId(), closed);
    }
}
