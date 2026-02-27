package dev.toolbox.controller;

import dev.toolbox.models.CalendarEvent;
import dev.toolbox.services.CalendarEventService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/events")
@CrossOrigin(origins = "*")
public class CalendarEventsController {

  @Autowired private CalendarEventService service;

  @PostMapping
  public ResponseEntity<CalendarEvent> create(@RequestBody CalendarEvent event) {
    return ResponseEntity.ok(service.create(event));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable String id) {
    service.delete(id);
    return ResponseEntity.noContent().build();
  }
}
