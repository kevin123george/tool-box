package com.example.mongo.repos;

import com.example.mongo.models.WorkoutPlan;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkoutPlanRepository extends MongoRepository<WorkoutPlan, String> {

  Optional<WorkoutPlan> findByActiveTrue();

  List<WorkoutPlan> findAllByOrderByNameAsc();
}
