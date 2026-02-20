package com.example.mongo.repos;

import com.example.mongo.models.WorkoutLog;
import com.example.mongo.models.WorkoutTemplate;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkoutTemplateRepository extends MongoRepository<WorkoutTemplate, String> {

  List<WorkoutTemplate> findByExerciseType(WorkoutLog.ExerciseType exerciseType);

  List<WorkoutTemplate> findAllByOrderByNameAsc();

  List<WorkoutTemplate> findAllByUserIdOrderByNameAsc(String userId);

  List<WorkoutTemplate> findAllByUserId(String userId);
}
