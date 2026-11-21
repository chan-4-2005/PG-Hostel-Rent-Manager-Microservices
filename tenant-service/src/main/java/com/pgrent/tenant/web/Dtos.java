package com.pgrent.tenant.web;

import com.pgrent.tenant.domain.Room;
import com.pgrent.tenant.domain.Tenant;
import com.pgrent.tenant.domain.TenantStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Request and response shapes (JSON) for this service's API. */
public final class Dtos {

    private Dtos() {
    }

    // ---------- auth ----------
    public record LoginRequest(@NotBlank String username, @NotBlank String password) {
    }

    public record RegisterOwnerRequest(@NotBlank String username,
                                       @NotBlank @Size(min = 6, message = "must be at least 6 characters") String password,
                                       @NotBlank String signupCode) {
    }

    public record LoginResponse(String token, String username, String role, Long tenantId) {
    }

    // ---------- rooms ----------
    public record RoomRequest(@NotBlank String roomNumber,
                              @Min(0) int floor,
                              @NotNull @DecimalMin(value = "1", message = "must be at least 1") BigDecimal monthlyRent,
                              @Min(value = 1, message = "must be at least 1") int capacity) {
    }

    public record RoomResponse(Long id, String roomNumber, int floor, BigDecimal monthlyRent,
                               int capacity, long occupied) {
        public static RoomResponse of(Room r, long occupied) {
            return new RoomResponse(r.getId(), r.getRoomNumber(), r.getFloor(),
                    r.getMonthlyRent(), r.getCapacity(), occupied);
        }
    }

    // ---------- tenants ----------
    public record TenantRequest(@NotBlank String name,
                                @NotBlank String phone,
                                @NotNull Long roomId,
                                LocalDate moveInDate,
                                @NotBlank String username,
                                @NotBlank @Size(min = 6, message = "must be at least 6 characters") String password) {
    }

    public record TenantResponse(Long id, String name, String phone, Long roomId, String roomNumber,
                                 BigDecimal monthlyRent, LocalDate moveInDate, LocalDate moveOutDate,
                                 TenantStatus status) {
        public static TenantResponse of(Tenant t) {
            return new TenantResponse(t.getId(), t.getName(), t.getPhone(),
                    t.getRoom().getId(), t.getRoom().getRoomNumber(), t.getRoom().getMonthlyRent(),
                    t.getMoveInDate(), t.getMoveOutDate(), t.getStatus());
        }
    }
}
