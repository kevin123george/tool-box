package com.example.mongo.controller;

import com.example.mongo.models.dto.CalendarEventDTO;
import com.example.mongo.services.FinancialCalendarService;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/calendar")
@CrossOrigin(origins = "*")
public class FinancialCalendarController {

  @Autowired private FinancialCalendarService calendarService;

  @GetMapping("/{year}/{month}")
  public ResponseEntity<List<CalendarEventDTO>> getEventsForMonth(
      @PathVariable int year, @PathVariable int month) {
    return ResponseEntity.ok(calendarService.getEventsForMonth(year, month));
  }
}
