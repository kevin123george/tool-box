package com.example.mongo.models;

import java.time.DayOfWeek;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "workout_plans")
public class WorkoutPlan {

  @Id private String id;

  private String name; // e.g., "PPL Split", "Upper/Lower", "Full Body 3x"
  private Map<DayOfWeek, String> schedule = new HashMap<>(); // Maps day to template ID
  private boolean active = false;
  private String notes;

  @CreatedDate private Instant createdAt;
  @LastModifiedDate private Instant updatedAt;

  public WorkoutPlan() {}

  public WorkoutPlan(String name, Map<DayOfWeek, String> schedule, boolean active, String notes) {
    this.name = name;
    this.schedule = schedule != null ? schedule : new HashMap<>();
    this.active = active;
    this.notes = notes;
  }
}
