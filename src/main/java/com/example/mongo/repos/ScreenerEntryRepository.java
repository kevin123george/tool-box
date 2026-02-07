package com.example.mongo.repos;

import com.example.mongo.models.ScreenerEntry;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ScreenerEntryRepository extends MongoRepository<ScreenerEntry, String> {

  Optional<ScreenerEntry> findFirstBySymbol(String symbol);

  List<ScreenerEntry> findAllBySymbol(String symbol);

  List<ScreenerEntry> findBySector(String sector);

  void deleteBySymbol(String symbol);
}
