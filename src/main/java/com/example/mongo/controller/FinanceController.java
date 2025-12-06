package com.example.mongo.controller;

import com.example.mongo.models.BankAccount;
import com.example.mongo.services.BankAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/finance")   // <-- FIXED
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class FinanceController {

    private final BankAccountService service;

    @GetMapping
    public List<BankAccount> getAll() {
        return service.getAll();
    }

    @GetMapping("/{id}")
    public BankAccount getById(@PathVariable String id) {
        return service.getById(id);
    }

    @PostMapping
    public BankAccount create(@RequestBody BankAccount account) {
        return service.create(account);
    }

    @PutMapping("/{id}")
    public BankAccount update(@PathVariable String id, @RequestBody BankAccount account) {
        return service.update(id, account);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable String id) {
        service.delete(id);
    }
}
