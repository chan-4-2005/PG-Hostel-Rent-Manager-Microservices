package com.pgrent.rent.repo;

import com.pgrent.rent.domain.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findByChargeIdOrderByPaidAtAsc(Long chargeId);
}
