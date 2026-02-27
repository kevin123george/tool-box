package dev.toolbox.models;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "workout_logs")
public class WorkoutLog {

  @Id private String id;

  @Indexed private String userId;

  private LocalDate workoutDate;
  private DayOfWeek dayOfWeek;
  private ExerciseType exerciseType;
  private Integer durationMinutes;
  private List<ExerciseDetail> exercises = new ArrayList<>();
  private String notes;
  private boolean completed = false;
  private Integer caloriesBurned;

  @CreatedDate private Instant createdAt;
  @LastModifiedDate private Instant updatedAt;

  public enum ExerciseType {
    PUSH,
    PULL,
    LEGS,
    CARDIO,
    FULL_BODY,
    CORE,
    REST
  }

  @Data
  public static class ExerciseDetail {
    private String name;
    private Integer sets;
    private Integer reps;
    private Double weight; // in kg
    private Integer durationSeconds; // for cardio/timed exercises
    private String notes;
  }

  public WorkoutLog() {}

  public WorkoutLog(
      LocalDate workoutDate,
      ExerciseType exerciseType,
      Integer durationMinutes,
      String notes,
      boolean completed) {
    this.workoutDate = workoutDate;
    this.dayOfWeek = workoutDate != null ? workoutDate.getDayOfWeek() : null;
    this.exerciseType = exerciseType;
    this.durationMinutes = durationMinutes;
    this.notes = notes;
    this.completed = completed;
  }
}
