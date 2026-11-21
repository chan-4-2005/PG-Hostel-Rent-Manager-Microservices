package com.pgrent.tenant.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pgrent.common.events.TenantCheckedOutEvent;
import com.pgrent.common.events.Topics;
import com.pgrent.common.security.AuthUser;
import com.pgrent.tenant.domain.AppUser;
import com.pgrent.tenant.domain.Room;
import com.pgrent.tenant.domain.Tenant;
import com.pgrent.tenant.domain.TenantStatus;
import com.pgrent.tenant.repo.AppUserRepository;
import com.pgrent.tenant.repo.RoomRepository;
import com.pgrent.tenant.repo.TenantRepository;
import com.pgrent.tenant.web.Dtos.TenantRequest;
import com.pgrent.tenant.web.Dtos.TenantResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@Service
public class TenantService {

    private static final Logger log = LoggerFactory.getLogger(TenantService.class);

    private final TenantRepository tenants;
    private final RoomRepository rooms;
    private final AppUserRepository users;
    private final PasswordEncoder encoder;
    private final KafkaTemplate<String, String> kafka;
    private final ObjectMapper objectMapper;

    public TenantService(TenantRepository tenants, RoomRepository rooms, AppUserRepository users,
                         PasswordEncoder encoder, KafkaTemplate<String, String> kafka,
                         ObjectMapper objectMapper) {
        this.tenants = tenants;
        this.rooms = rooms;
        this.users = users;
        this.encoder = encoder;
        this.kafka = kafka;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public TenantResponse create(TenantRequest req) {
        Room room = rooms.findById(req.roomId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));
        long occupied = tenants.countByRoomIdAndStatus(room.getId(), TenantStatus.ACTIVE);
        if (occupied >= room.getCapacity()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Room " + room.getRoomNumber() + " is full (capacity " + room.getCapacity() + ")");
        }
        if (users.existsByUsername(req.username())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already taken");
        }
        LocalDate moveIn = req.moveInDate() != null ? req.moveInDate() : LocalDate.now();
        Tenant tenant = tenants.save(new Tenant(req.name(), req.phone(), room, moveIn));
        users.save(new AppUser(req.username(), encoder.encode(req.password()), "TENANT", tenant.getId()));
        return TenantResponse.of(tenant);
    }

    @Transactional(readOnly = true)
    public List<TenantResponse> list(TenantStatus status) {
        List<Tenant> result = status == null
                ? tenants.findAllByOrderByNameAsc()
                : tenants.findByStatusOrderByNameAsc(status);
        return result.stream().map(TenantResponse::of).toList();
    }

    /** Owners can read any tenant; a tenant can only read themselves. */
    @Transactional(readOnly = true)
    public TenantResponse get(Long id, AuthUser caller) {
        if (caller.isTenant() && !id.equals(caller.tenantId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only view your own details");
        }
        Tenant tenant = tenants.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tenant not found"));
        return TenantResponse.of(tenant);
    }

    @Transactional
    public TenantResponse checkOut(Long id) {
        Tenant tenant = tenants.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tenant not found"));
        if (tenant.getStatus() == TenantStatus.CHECKED_OUT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Tenant already checked out");
        }
        tenant.checkOut(LocalDate.now());
        users.findByTenantId(id).ifPresent(AppUser::disable); // checked-out tenants cannot log in

        publishAfterCommit(new TenantCheckedOutEvent(
                tenant.getId(), tenant.getName(), tenant.getRoom().getRoomNumber(), tenant.getMoveOutDate()));
        return TenantResponse.of(tenant);
    }

    /** Sends the Kafka message only after the database transaction has really committed. */
    private void publishAfterCommit(TenantCheckedOutEvent event) {
        final String json;
        try {
            json = objectMapper.writeValueAsString(event);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not serialize event", e);
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                try {
                    kafka.send(Topics.TENANT_CHECKED_OUT, String.valueOf(event.tenantId()), json);
                } catch (Exception e) {
                    // The database change is already saved. In a real system you would use the
                    // "outbox pattern" so the event is never lost. Here we just log it.
                    log.error("Could not publish checkout event for tenant {}", event.tenantId(), e);
                }
            }
        });
    }
}
