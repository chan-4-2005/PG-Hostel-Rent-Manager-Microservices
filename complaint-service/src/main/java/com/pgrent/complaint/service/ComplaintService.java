package com.pgrent.complaint.service;

import com.pgrent.common.security.AuthUser;
import com.pgrent.complaint.domain.Complaint;
import com.pgrent.complaint.domain.ComplaintStatus;
import com.pgrent.complaint.repo.ComplaintRepository;
import com.pgrent.complaint.service.TenantClient.TenantDto;
import com.pgrent.complaint.web.Dtos.ComplaintResponse;
import com.pgrent.complaint.web.Dtos.CreateComplaintRequest;
import com.pgrent.complaint.web.Dtos.StatusUpdateRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class ComplaintService {

    private final ComplaintRepository complaints;
    private final TenantClient tenantClient;

    public ComplaintService(ComplaintRepository complaints, TenantClient tenantClient) {
        this.complaints = complaints;
        this.tenantClient = tenantClient;
    }

    /** The tenant id and room come from the verified token and tenant-service, never from the request body. */
    public ComplaintResponse create(CreateComplaintRequest req, AuthUser caller, String token) {
        TenantDto tenant = tenantClient.getTenant(caller.tenantId(), token);
        if (!"ACTIVE".equals(tenant.status())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Checked-out tenants cannot raise complaints");
        }
        List<String> photos = req.photoUrls() == null ? List.of() : req.photoUrls();
        for (String url : photos) {
            if (url == null || !(url.startsWith("http://") || url.startsWith("https://"))) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Photo links must start with http:// or https://");
            }
        }
        Complaint complaint = new Complaint(tenant.id(), tenant.name(), tenant.roomNumber(),
                req.category(), req.description().trim(), photos);
        return ComplaintResponse.of(complaints.save(complaint));
    }

    public List<ComplaintResponse> list(ComplaintStatus status, String room) {
        return complaints.findAllByOrderByCreatedAtDesc().stream()
                .filter(c -> status == null || c.getStatus() == status)
                .filter(c -> room == null || room.isBlank() || c.getRoomNumber().equalsIgnoreCase(room.trim()))
                .map(ComplaintResponse::of)
                .toList();
    }

    public List<ComplaintResponse> mine(Long tenantId) {
        return complaints.findByTenantIdOrderByCreatedAtDesc(tenantId).stream()
                .map(ComplaintResponse::of).toList();
    }

    public ComplaintResponse updateStatus(String id, StatusUpdateRequest req, AuthUser caller) {
        Complaint complaint = complaints.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint not found"));
        if (complaint.getStatus() == ComplaintStatus.CLOSED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A closed complaint cannot be changed");
        }
        if (complaint.getStatus() == req.status()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Complaint is already " + req.status());
        }
        complaint.changeStatus(req.status(), req.note(), caller.username());
        return ComplaintResponse.of(complaints.save(complaint));
    }

    /** Called when tenant-service publishes a "tenant checked out" event. */
    public int closeOpenComplaintsOfTenant(Long tenantId) {
        List<Complaint> open = complaints.findByTenantIdAndStatusIn(
                tenantId, List.of(ComplaintStatus.OPEN, ComplaintStatus.IN_PROGRESS));
        for (Complaint c : open) {
            c.changeStatus(ComplaintStatus.CLOSED, "Closed automatically: tenant checked out", "system");
        }
        complaints.saveAll(open);
        return open.size();
    }
}
