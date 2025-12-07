package com.example.mongo.repos;

import com.example.mongo.models.FinancialGoal;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface FinancialGoalRepository extends MongoRepository<FinancialGoal, String> {}
