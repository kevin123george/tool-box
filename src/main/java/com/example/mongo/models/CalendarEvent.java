package com.example.mongo.models;

import java.time.Instant;
import java.time.LocalDate;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@Document(collection = "calendar_events")
public class CalendarEvent {

  @Id private String id;

  @Indexed private String userId;

  private LocalDate date;
  private LocalDate endDate; // null = single-day; set for multi-day ranges (vacation etc.)
  private String title;
  private String description;
  private EventType eventType;

  @CreatedDate private Instant createdAt;

  public enum EventType {
    VACATION,
    HOLIDAY,
    APPOINTMENT,
    REMINDER,
    BIRTHDAY,
    OTHER
  }
}
