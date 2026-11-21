package com.pgrent.tenant.service;

import com.pgrent.tenant.domain.Room;
import com.pgrent.tenant.domain.TenantStatus;
import com.pgrent.tenant.repo.RoomRepository;
import com.pgrent.tenant.repo.TenantRepository;
import com.pgrent.tenant.web.Dtos.RoomRequest;
import com.pgrent.tenant.web.Dtos.RoomResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class RoomService {

    private final RoomRepository rooms;
    private final TenantRepository tenants;

    public RoomService(RoomRepository rooms, TenantRepository tenants) {
        this.rooms = rooms;
        this.tenants = tenants;
    }

    @Transactional
    public RoomResponse create(RoomRequest req) {
        if (rooms.existsByRoomNumber(req.roomNumber())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Room " + req.roomNumber() + " already exists");
        }
        Room room = rooms.save(new Room(req.roomNumber(), req.floor(), req.monthlyRent(), req.capacity()));
        return RoomResponse.of(room, 0);
    }

    @Transactional(readOnly = true)
    public List<RoomResponse> list() {
        return rooms.findAll().stream()
                .map(r -> RoomResponse.of(r, tenants.countByRoomIdAndStatus(r.getId(), TenantStatus.ACTIVE)))
                .sorted((a, b) -> a.roomNumber().compareToIgnoreCase(b.roomNumber()))
                .toList();
    }
}
