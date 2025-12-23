package com.example.mongo.services;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

@Service
public class MongoDumpService {

  private final MongoTemplate mongoTemplate;

  public MongoDumpService(MongoTemplate mongoTemplate) {
    this.mongoTemplate = mongoTemplate;
  }

  public Map<String, List<Document>> dumpAllCollections() {
    Map<String, List<Document>> dump = new HashMap<>();

    for (String collectionName : mongoTemplate.getCollectionNames()) {
      List<Document> documents =
          mongoTemplate.getCollection(collectionName).find().into(new ArrayList<>());
      dump.put(collectionName, documents);
    }

    return dump;
  }
}
