package com.example.mongo.controller;

import com.example.mongo.models.FinancialGoal;
import com.example.mongo.services.FinancialGoalService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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

    /** CREATE */
    @PostMapping
    public FinancialGoal createGoal(@RequestBody FinancialGoal goal) {
        return service.saveGoal(goal);
    }

    /** READ ALL */
    @GetMapping
    public Page<FinancialGoal> getAllGoals(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return service.getAll(PageRequest.of(page, size));
    }

    /** READ ONE */
    @GetMapping("/{id}")
    public FinancialGoal getGoal(@PathVariable String id) {
        return service.getGoal(id);
    }

    /** UPDATE (same as create but ensures ID is kept) */
    @PutMapping("/{id}")
    public FinancialGoal updateGoal(
            @PathVariable String id,
            @RequestBody FinancialGoal updated
    ) {
        updated.setId(id);
        return service.saveGoal(updated);
    }

    /** DELETE ONE */
    @DeleteMapping("/{id}")
    public void deleteGoal(@PathVariable String id) {
        service.delete(id);
    }

    /** DELETE ALL */
    @DeleteMapping
    public void deleteAll() {
        service.deleteAll();
    }

    /** PROJECTION */
    @GetMapping("/{id}/projection")
    public String getProjection(@PathVariable String id) {
        FinancialGoal g = service.getGoal(id);
        return service.getProjection(g);
    }
}
