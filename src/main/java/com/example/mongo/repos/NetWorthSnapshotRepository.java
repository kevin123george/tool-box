package com.example.mongo.repos;

import com.example.mongo.models.NetWorthSnapshot;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NetWorthSnapshotRepository extends MongoRepository<NetWorthSnapshot, String> {

  List<NetWorthSnapshot> findAllByOrderByDateAsc();

  List<NetWorthSnapshot> findAllByOrderByDateDesc();

  Optional<NetWorthSnapshot> findByDate(LocalDate date);

  List<NetWorthSnapshot> findByDateBetweenOrderByDateAsc(LocalDate start, LocalDate end);
}
