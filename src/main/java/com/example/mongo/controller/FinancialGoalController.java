package com.example.mongo.controller;

import com.example.mongo.models.FinancialGoal;
import com.example.mongo.services.FinancialGoalService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/goal")
@CrossOrigin
public class FinancialGoalController {

    private final FinancialGoalService service;

    public FinancialGoalController(FinancialGoalService service) {
        this.service = service;
    }

    @PostMapping
    public FinancialGoal saveGoal(@RequestBody FinancialGoal goal) {
        return service.saveGoal(goal);
    }

    @GetMapping("/{id}")
    public FinancialGoal getGoal(@PathVariable String id) {
        return service.getGoal(id);
    }

    @GetMapping("/{id}/projection")
    public String getProjection(@PathVariable String id) {
        FinancialGoal g = service.getGoal(id);
        return service.getProjection(g);
    }


    @GetMapping
    public List<FinancialGoal> getAllGoals() {
        return service.getAll();
    }

    @DeleteMapping("/deleteAll")
    public void deleteAllGoals() {
        service.deleteAll();
    }
}
