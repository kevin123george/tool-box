package dev.toolbox.repos;

import dev.toolbox.models.PdfAnnotation;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PdfAnnotationRepository extends MongoRepository<PdfAnnotation, String> {
  List<PdfAnnotation> findAllByPdfIdAndUserId(String pdfId, String userId);

  void deleteByPdfIdAndUserId(String pdfId, String userId);
}
