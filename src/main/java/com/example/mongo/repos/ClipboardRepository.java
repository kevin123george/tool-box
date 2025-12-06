package com.example.mongo.repos;

import com.example.mongo.models.ClipboardItem;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ClipboardRepository extends MongoRepository<ClipboardItem, String> {
}
