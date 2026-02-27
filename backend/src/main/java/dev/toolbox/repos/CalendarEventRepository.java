package dev.toolbox.repos;

import dev.toolbox.models.CalendarEvent;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

public interface CalendarEventRepository extends MongoRepository<CalendarEvent, String> {

  /**
   * Returns all events that overlap the given [start, end] range.
   *
   * <p>Single-day events (endDate is null/missing): date must be within [start, end]. Multi-day
   * events (endDate is set): the event overlaps when date <= end AND endDate >= start.
   */
  @Query(
      "{ 'userId': ?0, '$or': ["
          + "  { 'endDate': null,           'date': { '$gte': ?1, '$lte': ?2 } },"
          + "  { 'endDate': { '$gte': ?1 }, 'date': { '$lte': ?2 }            }"
          + "] }")
  List<CalendarEvent> findOverlappingByUserId(String userId, LocalDate start, LocalDate end);
}
