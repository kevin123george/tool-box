package com.example.mongo.repos;

import com.example.mongo.models.WeightEntry;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WeightEntryRepository extends MongoRepository<WeightEntry, String> {

  List<WeightEntry> findByDateBetween(LocalDate start, LocalDate end);

  Optional<WeightEntry> findTopByOrderByDateDesc();

  List<WeightEntry> findTop30ByOrderByDateDesc();

  Optional<WeightEntry> findByDate(LocalDate date);

  List<WeightEntry> findAllByOrderByDateAsc();

  List<WeightEntry> findAllByOrderByDateDesc();

  List<WeightEntry> findByDateBetweenAndUserId(
      java.time.LocalDate start, java.time.LocalDate end, String userId);

  Optional<WeightEntry> findTopByUserIdOrderByDateDesc(String userId);

  Optional<WeightEntry> findByDateAndUserId(java.time.LocalDate date, String userId);

  List<WeightEntry> findAllByUserIdOrderByDateAsc(String userId);

  List<WeightEntry> findAllByUserIdOrderByDateDesc(String userId);
}
