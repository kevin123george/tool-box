package com.example.mongo.models;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "workout_templates")
public class WorkoutTemplate {

  @Id private String id;

  private String name; // e.g., "Push Day A", "Pull Day B"
  private WorkoutLog.ExerciseType exerciseType;
  private List<WorkoutLog.ExerciseDetail> exercises = new ArrayList<>();
  private Integer estimatedDuration; // in minutes
  private String notes;

  @CreatedDate private Instant createdAt;
  @LastModifiedDate private Instant updatedAt;

  public WorkoutTemplate() {}

  public WorkoutTemplate(
      String name,
      WorkoutLog.ExerciseType exerciseType,
      List<WorkoutLog.ExerciseDetail> exercises,
      Integer estimatedDuration,
      String notes) {
    this.name = name;
    this.exerciseType = exerciseType;
    this.exercises = exercises != null ? exercises : new ArrayList<>();
    this.estimatedDuration = estimatedDuration;
    this.notes = notes;
  }
}
