package com.example.mongo.repos;

import com.example.mongo.models.FinancialGoal;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface FinancialGoalRepository extends MongoRepository<FinancialGoal, String> {

  List<FinancialGoal> findAllByUserId(String userId);
}
