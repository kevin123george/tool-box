package com.example.mongo.repos;

import com.example.mongo.models.PdfDocument;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PdfDocumentRepository extends MongoRepository<PdfDocument, String> {
  List<PdfDocument> findAllByUserId(String userId);
}
