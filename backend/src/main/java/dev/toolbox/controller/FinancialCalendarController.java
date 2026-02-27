package dev.toolbox.controller;

import dev.toolbox.models.dto.CalendarEventDTO;
import dev.toolbox.services.FinancialCalendarService;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/calendar")
public class FinancialCalendarController {

  @Autowired private FinancialCalendarService calendarService;

  @GetMapping("/{year}/{month}")
  public ResponseEntity<List<CalendarEventDTO>> getEventsForMonth(
      @PathVariable int year, @PathVariable int month) {
    return ResponseEntity.ok(calendarService.getEventsForMonth(year, month));
  }
}
