package com.example.mongo.controller;

import com.example.mongo.models.SavingsGoal;
import com.example.mongo.services.SavingsGoalService;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/savings-goals")
@CrossOrigin(origins = "*")
public class SavingsGoalController {

  @Autowired private SavingsGoalService savingsGoalService;

  @GetMapping
  public ResponseEntity<List<SavingsGoal>> getAllGoals() {
    return ResponseEntity.ok(savingsGoalService.getAllGoals());
  }

  @GetMapping("/{id}")
  public ResponseEntity<SavingsGoal> getGoalById(@PathVariable String id) {
    return ResponseEntity.ok(savingsGoalService.getGoalById(id));
  }

  @PostMapping
  public ResponseEntity<SavingsGoal> createGoal(@RequestBody SavingsGoal goal) {
    return ResponseEntity.status(HttpStatus.CREATED).body(savingsGoalService.createGoal(goal));
  }

  @PutMapping("/{id}")
  public ResponseEntity<SavingsGoal> updateGoal(
      @PathVariable String id, @RequestBody SavingsGoal goal) {
    return ResponseEntity.ok(savingsGoalService.updateGoal(id, goal));
  }

  @PutMapping("/{id}/contribute")
  public ResponseEntity<SavingsGoal> contribute(
      @PathVariable String id, @RequestBody Map<String, Double> request) {
    Double amount = request.get("amount");
    if (amount == null) {
      return ResponseEntity.badRequest().build();
    }
    return ResponseEntity.ok(savingsGoalService.contribute(id, amount));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteGoal(@PathVariable String id) {
    savingsGoalService.deleteGoal(id);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/summary")
  public ResponseEntity<Map<String, Double>> getSummary() {
    return ResponseEntity.ok(
        Map.of(
            "totalSaved", savingsGoalService.getTotalSaved(),
            "totalTarget", savingsGoalService.getTotalTarget()));
  }
}
