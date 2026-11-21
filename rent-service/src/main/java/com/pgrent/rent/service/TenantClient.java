package com.pgrent.rent.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * SYNCHRONOUS communication: rent-service calls tenant-service over REST and waits for the answer.
 * The caller's JWT is forwarded so tenant-service knows who is asking.
 */
@Component
public class TenantClient {

    /** The fields of tenant-service's response that we care about. */
    public record TenantDto(Long id, String name, String phone, Long roomId, String roomNumber,
                            BigDecimal monthlyRent, LocalDate moveInDate, LocalDate moveOutDate,
                            String status) {
    }

    private final RestClient client;

    public TenantClient(RestClient.Builder builder, @Value("${app.tenant-service-url}") String baseUrl) {
        this.client = builder.baseUrl(baseUrl).build();
    }

    public List<TenantDto> getActiveTenants(String token) {
        try {
            return client.get()
                    .uri("/api/tenants?status=ACTIVE")
                    .header("Authorization", "Bearer " + token)
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<TenantDto>>() {
                    });
        } catch (RestClientException e) {
            throw unavailable(e);
        }
    }

    public TenantDto getTenant(Long id, String token) {
        try {
            return client.get()
                    .uri("/api/tenants/{id}", id)
                    .header("Authorization", "Bearer " + token)
                    .retrieve()
                    .onStatus(status -> status.value() == 404, (req, res) -> {
                        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Tenant " + id + " not found");
                    })
                    .body(TenantDto.class);
        } catch (RestClientException e) {
            throw unavailable(e);
        }
    }

    private ResponseStatusException unavailable(RestClientException e) {
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "tenant-service is not reachable: " + e.getMessage());
    }
}
