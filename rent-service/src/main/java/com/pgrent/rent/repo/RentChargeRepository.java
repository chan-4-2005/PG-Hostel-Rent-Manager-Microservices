package com.pgrent.rent.repo;

import com.pgrent.rent.domain.ChargeStatus;
import com.pgrent.rent.domain.RentCharge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RentChargeRepository extends JpaRepository<RentCharge, Long> {

    boolean existsByTenantIdAndMonth(Long tenantId, String month);

    List<RentCharge> findByTenantIdOrderByMonthDesc(Long tenantId);

    List<RentCharge> findByMonthOrderByRoomNumberAsc(String month);

    List<RentCharge> findByMonthAndStatusOrderByRoomNumberAsc(String month, ChargeStatus status);

    List<RentCharge> findAllByOrderByMonthDescRoomNumberAsc();

    @Modifying
    @Query("update RentCharge c set c.tenantCheckedOut = true where c.tenantId = :tenantId")
    int markTenantCheckedOut(@Param("tenantId") Long tenantId);
}
