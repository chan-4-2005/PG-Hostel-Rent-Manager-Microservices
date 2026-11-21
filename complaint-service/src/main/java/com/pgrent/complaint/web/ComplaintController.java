package com.pgrent.complaint.web;

import com.pgrent.common.security.AuthUser;
import com.pgrent.common.security.CurrentUser;
import com.pgrent.complaint.domain.ComplaintStatus;
import com.pgrent.complaint.service.ComplaintService;
import com.pgrent.complaint.web.Dtos.ComplaintResponse;
import com.pgrent.complaint.web.Dtos.CreateComplaintRequest;
import com.pgrent.complaint.web.Dtos.StatusUpdateRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/complaints")
public class ComplaintController {

    private final ComplaintService complaints;

    public ComplaintController(ComplaintService complaints) {
        this.complaints = complaints;
    }

    @PostMapping
    @PreAuthorize("hasRole('TENANT')")
    @ResponseStatus(HttpStatus.CREATED)
    public ComplaintResponse create(@Valid @RequestBody CreateComplaintRequest req) {
        return complaints.create(req, CurrentUser.get(), CurrentUser.token());
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('TENANT')")
    public List<ComplaintResponse> mine() {
        return complaints.mine(CurrentUser.get().tenantId());
    }

    @GetMapping
    @PreAuthorize("hasRole('OWNER')")
    public List<ComplaintResponse> list(@RequestParam(required = false) ComplaintStatus status,
                                        @RequestParam(required = false) String room) {
        return complaints.list(status, room);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('OWNER')")
    public ComplaintResponse updateStatus(@PathVariable String id,
                                          @Valid @RequestBody StatusUpdateRequest req) {
        AuthUser caller = CurrentUser.get();
        return complaints.updateStatus(id, req, caller);
    }
}
