package dev.toolbox.services;

import dev.toolbox.config.AuthUtils;
import dev.toolbox.exception.ResourceNotFoundException;
import dev.toolbox.models.CalendarEvent;
import dev.toolbox.repos.CalendarEventRepository;
import java.time.LocalDate;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class CalendarEventService {

  @Autowired private CalendarEventRepository repo;
  @Autowired private AuthUtils authUtils;

  public CalendarEvent create(CalendarEvent event) {
    event.setUserId(authUtils.getCurrentUserId());
    return repo.save(event);
  }

  public List<CalendarEvent> getForMonth(int year, int month) {
    LocalDate start = LocalDate.of(year, month, 1);
    LocalDate end = start.plusMonths(1).minusDays(1);
    return repo.findOverlappingByUserId(authUtils.getCurrentUserId(), start, end);
  }

  public void delete(String id) {
    CalendarEvent event =
        repo.findById(id)
            .filter(e -> e.getUserId().equals(authUtils.getCurrentUserId()))
            .orElseThrow(() -> new ResourceNotFoundException("CalendarEvent", "id", id));
    repo.deleteById(event.getId());
  }
}
