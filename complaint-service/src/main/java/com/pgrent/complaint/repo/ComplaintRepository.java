package com.pgrent.complaint.repo;

import com.pgrent.complaint.domain.Complaint;
import com.pgrent.complaint.domain.ComplaintStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Collection;
import java.util.List;

public interface ComplaintRepository extends MongoRepository<Complaint, String> {

    List<Complaint> findAllByOrderByCreatedAtDesc();

    List<Complaint> findByTenantIdOrderByCreatedAtDesc(Long tenantId);

    List<Complaint> findByTenantIdAndStatusIn(Long tenantId, Collection<ComplaintStatus> statuses);
}
