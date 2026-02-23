package com.example.mongo.repos;

import com.example.mongo.models.CalendarEvent;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CalendarEventRepository extends MongoRepository<CalendarEvent, String> {
  List<CalendarEvent> findByUserIdAndDateBetween(String userId, LocalDate start, LocalDate end);
}
