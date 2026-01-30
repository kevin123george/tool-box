package com.example.mongo.repos;

import com.example.mongo.models.SavingsGoal;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SavingsGoalRepository extends MongoRepository<SavingsGoal, String> {

  List<SavingsGoal> findAllByOrderByDeadlineAsc();

  List<SavingsGoal> findByNameContainingIgnoreCase(String name);
}
