package com.example.mongo.controller;

import com.example.mongo.models.WeightEntry;
import com.example.mongo.models.WorkoutLog;
import com.example.mongo.models.WorkoutPlan;
import com.example.mongo.models.WorkoutTemplate;
import com.example.mongo.models.dto.FitnessAnalyticsDTO;
import com.example.mongo.models.dto.FitnessStats;
import com.example.mongo.services.FitnessService;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
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

  // ===== TEMPLATE ENDPOINTS =====

  @GetMapping("/templates")
  public List<WorkoutTemplate> getTemplates() {
    return fitnessService.getAllTemplates();
  }

  @GetMapping("/templates/{id}")
  public ResponseEntity<WorkoutTemplate> getTemplate(@PathVariable String id) {
    return fitnessService
        .getTemplateById(id)
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.notFound().build());
  }

  @PostMapping("/templates")
  public WorkoutTemplate createTemplate(@RequestBody WorkoutTemplate template) {
    return fitnessService.createTemplate(template);
  }

  @PutMapping("/templates/{id}")
  public ResponseEntity<WorkoutTemplate> updateTemplate(
      @PathVariable String id, @RequestBody WorkoutTemplate template) {
    WorkoutTemplate updated = fitnessService.updateTemplate(id, template);
    if (updated != null) {
      return ResponseEntity.ok(updated);
    }
    return ResponseEntity.notFound().build();
  }

  @DeleteMapping("/templates/{id}")
  public ResponseEntity<Void> deleteTemplate(@PathVariable String id) {
    fitnessService.deleteTemplate(id);
    return ResponseEntity.ok().build();
  }

  // ===== PLAN ENDPOINTS =====

  @GetMapping("/plans")
  public List<WorkoutPlan> getPlans() {
    return fitnessService.getAllPlans();
  }

  @GetMapping("/plans/active")
  public ResponseEntity<WorkoutPlan> getActivePlan() {
    return fitnessService
        .getActivePlan()
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.notFound().build());
  }

  @GetMapping("/plans/{id}")
  public ResponseEntity<WorkoutPlan> getPlan(@PathVariable String id) {
    return fitnessService
        .getPlanById(id)
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.notFound().build());
  }

  @PostMapping("/plans")
  public WorkoutPlan createPlan(@RequestBody WorkoutPlan plan) {
    return fitnessService.createPlan(plan);
  }

  @PutMapping("/plans/{id}")
  public ResponseEntity<WorkoutPlan> updatePlan(
      @PathVariable String id, @RequestBody WorkoutPlan plan) {
    WorkoutPlan updated = fitnessService.updatePlan(id, plan);
    if (updated != null) {
      return ResponseEntity.ok(updated);
    }
    return ResponseEntity.notFound().build();
  }

  @PutMapping("/plans/{id}/activate")
  public ResponseEntity<Void> activatePlan(@PathVariable String id) {
    fitnessService.setActivePlan(id);
    return ResponseEntity.ok().build();
  }

  @DeleteMapping("/plans/{id}")
  public ResponseEntity<Void> deletePlan(@PathVariable String id) {
    fitnessService.deletePlan(id);
    return ResponseEntity.ok().build();
  }

  // ===== TODAY'S WORKOUT =====

  @GetMapping("/today")
  public ResponseEntity<Map<String, Object>> getTodaysWorkout() {
    Map<String, Object> result = new java.util.HashMap<>();

    // Get scheduled template for today
    WorkoutTemplate scheduled = fitnessService.getTodaysScheduledWorkout();
    result.put("scheduledTemplate", scheduled);

    // Get today's logged workout if exists
    WorkoutLog todaysLog = fitnessService.getTodaysWorkout();
    result.put("todaysWorkout", todaysLog);

    // Get active plan name
    fitnessService.getActivePlan().ifPresent(plan -> result.put("planName", plan.getName()));

    return ResponseEntity.ok(result);
  }

  // ===== QUICK LOG FROM TEMPLATE =====

  @PostMapping("/workouts/from-template/{templateId}")
  public ResponseEntity<WorkoutLog> logFromTemplate(
      @PathVariable String templateId,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
          LocalDate date) {
    LocalDate targetDate = date != null ? date : LocalDate.now();
    WorkoutLog workout = fitnessService.logFromTemplate(templateId, targetDate);
    if (workout != null) {
      return ResponseEntity.ok(workout);
    }
    return ResponseEntity.notFound().build();
  }

  // ===== ANALYTICS ENDPOINTS =====

  @GetMapping("/analytics")
  public FitnessAnalyticsDTO getAnalytics(@RequestParam(defaultValue = "12") int weeks) {
    return fitnessService.getAnalytics(weeks);
  }

  @GetMapping("/analytics/workouts-by-type")
  public Map<String, Integer> getWorkoutsByType() {
    return fitnessService.getWorkoutsByType();
  }
}
