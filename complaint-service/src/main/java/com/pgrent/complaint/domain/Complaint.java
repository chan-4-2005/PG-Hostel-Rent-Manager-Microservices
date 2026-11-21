package com.pgrent.complaint.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * A maintenance complaint. Stored as ONE MongoDB document, including its photo links and its
 * whole status history (timeline) — no joins needed.
 */
@Document("complaints")
public class Complaint {

    @Id
    private String id;

    @Indexed
    private Long tenantId;

    private String tenantName;
    private String roomNumber;
    private Category category;
    private String description;
    private List<String> photoUrls = new ArrayList<>();
    private ComplaintStatus status = ComplaintStatus.OPEN;
    private Instant createdAt;
    private Instant updatedAt;
    private List<TimelineEntry> timeline = new ArrayList<>();

    protected Complaint() {
    }

    public Complaint(Long tenantId, String tenantName, String roomNumber, Category category,
                     String description, List<String> photoUrls) {
        this.tenantId = tenantId;
        this.tenantName = tenantName;
        this.roomNumber = roomNumber;
        this.category = category;
        this.description = description;
        if (photoUrls != null) {
            this.photoUrls = new ArrayList<>(photoUrls);
        }
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
        this.timeline.add(new TimelineEntry(ComplaintStatus.OPEN, "Complaint raised", tenantName, now));
    }

    public void changeStatus(ComplaintStatus newStatus, String note, String by) {
        Instant now = Instant.now();
        this.status = newStatus;
        this.updatedAt = now;
        this.timeline.add(new TimelineEntry(newStatus, note, by, now));
    }

    public String getId() { return id; }
    public Long getTenantId() { return tenantId; }
    public String getTenantName() { return tenantName; }
    public String getRoomNumber() { return roomNumber; }
    public Category getCategory() { return category; }
    public String getDescription() { return description; }
    public List<String> getPhotoUrls() { return photoUrls; }
    public ComplaintStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public List<TimelineEntry> getTimeline() { return timeline; }
}
