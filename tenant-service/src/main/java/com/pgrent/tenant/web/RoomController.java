package com.pgrent.tenant.web;

import com.pgrent.tenant.service.RoomService;
import com.pgrent.tenant.web.Dtos.RoomRequest;
import com.pgrent.tenant.web.Dtos.RoomResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rooms")
@PreAuthorize("hasRole('OWNER')")
public class RoomController {

    private final RoomService rooms;

    public RoomController(RoomService rooms) {
        this.rooms = rooms;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RoomResponse create(@Valid @RequestBody RoomRequest req) {
        return rooms.create(req);
    }

    @GetMapping
    public List<RoomResponse> list() {
        return rooms.list();
    }
}
