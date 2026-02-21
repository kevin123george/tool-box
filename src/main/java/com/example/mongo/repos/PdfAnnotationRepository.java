package com.example.mongo.repos;

import com.example.mongo.models.PdfAnnotation;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PdfAnnotationRepository extends MongoRepository<PdfAnnotation, String> {
  List<PdfAnnotation> findAllByPdfIdAndUserId(String pdfId, String userId);

  void deleteByPdfIdAndUserId(String pdfId, String userId);
}
