package com.example.mongo.repos;

import com.example.mongo.models.WorkoutLog;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkoutLogRepository extends MongoRepository<WorkoutLog, String> {

  List<WorkoutLog> findByWorkoutDateBetween(LocalDate start, LocalDate end);

  List<WorkoutLog> findByDayOfWeek(DayOfWeek day);

  List<WorkoutLog> findTop30ByOrderByWorkoutDateDesc();

  Page<WorkoutLog> findAllByOrderByWorkoutDateDesc(Pageable pageable);

  Optional<WorkoutLog> findByWorkoutDate(LocalDate date);

  List<WorkoutLog> findByCompletedTrueOrderByWorkoutDateDesc();

  long countByCompletedTrue();
}
