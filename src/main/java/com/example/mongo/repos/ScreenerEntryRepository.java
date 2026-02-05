package com.example.mongo.repos;

import com.example.mongo.models.ScreenerEntry;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ScreenerEntryRepository extends MongoRepository<ScreenerEntry, String> {

  Optional<ScreenerEntry> findBySymbol(String symbol);

  List<ScreenerEntry> findBySector(String sector);

  @org.springframework.data.mongodb.repository.Query(value = "{}", fields = "{'sector': 1}")
  List<ScreenerEntry> findDistinctSectors();
}
