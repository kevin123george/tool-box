package com.example.mongo.controller;

import com.example.mongo.models.BankAccount;
import com.example.mongo.models.dto.FinanceSummaryDTO;
import com.example.mongo.services.BankAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/finance")   // <-- FIXED
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class FinanceController {

    private final BankAccountService service;

//    @GetMapping
//    public List<BankAccount> getAll() {
//        return service.getAll();
//    }

    @GetMapping
    public Page<BankAccount> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return service.getAll(PageRequest.of(page, size));
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

    @GetMapping("/summary")
    public FinanceSummaryDTO getSummary() {
        return service.getSummary();
    }
}
