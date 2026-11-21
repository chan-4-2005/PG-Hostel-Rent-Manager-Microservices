package com.pgrent.tenant.repo;

import com.pgrent.tenant.domain.Tenant;
import com.pgrent.tenant.domain.TenantStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TenantRepository extends JpaRepository<Tenant, Long> {

    List<Tenant> findByStatusOrderByNameAsc(TenantStatus status);

    List<Tenant> findAllByOrderByNameAsc();

    long countByRoomIdAndStatus(Long roomId, TenantStatus status);
}
