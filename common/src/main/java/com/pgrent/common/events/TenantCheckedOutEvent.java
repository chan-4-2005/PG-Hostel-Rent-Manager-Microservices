package com.pgrent.common.events;

import java.time.LocalDate;

/**
 * Published by tenant-service when a tenant checks out.
 * rent-service and complaint-service both listen to it.
 */
public record TenantCheckedOutEvent(Long tenantId,
                                    String tenantName,
                                    String roomNumber,
                                    LocalDate checkoutDate) {
}
