package com.example.mongo.controller;

import com.example.mongo.models.StockHoldingHistory;
import com.example.mongo.repos.StockHoldingHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/hist")
@CrossOrigin
public class Hist {

  @Autowired private StockHoldingHistoryRepository repository;

  /** READ ALL */
  @GetMapping
  public Iterable<StockHoldingHistory> getAllHistories() {
    return repository.findAll();
  }
}
