package com.example.mongo.controller;

import com.example.mongo.models.WeightEntry;
import com.example.mongo.models.WorkoutLog;
import com.example.mongo.models.dto.FitnessStats;
import com.example.mongo.services.FitnessService;
import java.time.LocalDate;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/fitness")
@CrossOrigin(origins = "*")
public class FitnessController {

  @Autowired private FitnessService fitnessService;

  // ===== WORKOUT ENDPOINTS =====

  @GetMapping("/workouts")
  public Page<WorkoutLog> getWorkouts(
      @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
    return fitnessService.getWorkoutHistory(page, size);
  }

  @GetMapping("/workouts/week")
  public List<WorkoutLog> getWeekWorkouts(
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
          LocalDate date) {
    LocalDate targetDate = date != null ? date : LocalDate.now();
    return fitnessService.getWorkoutsForWeek(targetDate);
  }

  @GetMapping("/workouts/recent")
  public List<WorkoutLog> getRecentWorkouts() {
    return fitnessService.getRecentWorkouts();
  }

  @GetMapping("/workouts/{id}")
  public ResponseEntity<WorkoutLog> getWorkout(@PathVariable String id) {
    return fitnessService
        .getWorkoutById(id)
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.notFound().build());
  }

  @PostMapping("/workouts")
  public WorkoutLog logWorkout(@RequestBody WorkoutLog workout) {
    return fitnessService.logWorkout(workout);
  }

  @PutMapping("/workouts/{id}")
  public ResponseEntity<WorkoutLog> updateWorkout(
      @PathVariable String id, @RequestBody WorkoutLog workout) {
    WorkoutLog updated = fitnessService.updateWorkout(id, workout);
    if (updated != null) {
      return ResponseEntity.ok(updated);
    }
    return ResponseEntity.notFound().build();
  }

  @DeleteMapping("/workouts/{id}")
  public ResponseEntity<Void> deleteWorkout(@PathVariable String id) {
    fitnessService.deleteWorkout(id);
    return ResponseEntity.ok().build();
  }

  // ===== WEIGHT ENDPOINTS =====

  @GetMapping("/weight")
  public List<WeightEntry> getWeightHistory(@RequestParam(defaultValue = "30") int days) {
    return fitnessService.getWeightHistory(days);
  }

  @GetMapping("/weight/all")
  public List<WeightEntry> getAllWeightHistory() {
    return fitnessService.getAllWeightHistory();
  }

  @GetMapping("/weight/latest")
  public ResponseEntity<WeightEntry> getLatestWeight() {
    return fitnessService
        .getLatestWeight()
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.notFound().build());
  }

  @PostMapping("/weight")
  public WeightEntry logWeight(@RequestBody WeightEntry entry) {
    if (entry.getDate() == null) {
      entry.setDate(LocalDate.now());
    }
    return fitnessService.logWeight(entry);
  }

  @DeleteMapping("/weight/{id}")
  public ResponseEntity<Void> deleteWeightEntry(@PathVariable String id) {
    fitnessService.deleteWeightEntry(id);
    return ResponseEntity.ok().build();
  }

  // ===== STATS ENDPOINTS =====

  @GetMapping("/stats")
  public FitnessStats getStats() {
    return fitnessService.calculateStats();
  }
}
