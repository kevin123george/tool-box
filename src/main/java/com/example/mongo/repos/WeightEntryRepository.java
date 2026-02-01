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
}
