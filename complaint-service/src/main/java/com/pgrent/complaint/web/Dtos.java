package com.pgrent.complaint.web;

import com.pgrent.complaint.domain.Category;
import com.pgrent.complaint.domain.Complaint;
import com.pgrent.complaint.domain.ComplaintStatus;
import com.pgrent.complaint.domain.TimelineEntry;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public final class Dtos {

    private Dtos() {
    }

    public record CreateComplaintRequest(@NotNull Category category,
                                         @NotBlank @Size(max = 1000, message = "must be at most 1000 characters") String description,
                                         @Size(max = 5, message = "at most 5 photo links") List<String> photoUrls) {
    }

    public record StatusUpdateRequest(@NotNull ComplaintStatus status,
                                      @Size(max = 500, message = "must be at most 500 characters") String note) {
    }

    public record ComplaintResponse(String id, Long tenantId, String tenantName, String roomNumber,
                                    Category category, String description, List<String> photoUrls,
                                    ComplaintStatus status, Instant createdAt, Instant updatedAt,
                                    List<TimelineEntry> timeline) {
        public static ComplaintResponse of(Complaint c) {
            return new ComplaintResponse(c.getId(), c.getTenantId(), c.getTenantName(), c.getRoomNumber(),
                    c.getCategory(), c.getDescription(), c.getPhotoUrls(), c.getStatus(),
                    c.getCreatedAt(), c.getUpdatedAt(), c.getTimeline());
        }
    }
}
