package com.pgrent.complaint.domain;

import java.time.Instant;

/** One step in the history of a complaint. Stored inside the complaint document. */
public record TimelineEntry(ComplaintStatus status, String note, String by, Instant at) {
}
