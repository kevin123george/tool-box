package com.example.mongo.services;

import com.example.mongo.config.AuthUtils;
import com.example.mongo.exception.ResourceNotFoundException;
import com.example.mongo.models.PdfAnnotation;
import com.example.mongo.models.PdfDocument;
import com.example.mongo.models.dto.PdfDocumentDTO;
import com.example.mongo.repos.PdfAnnotationRepository;
import com.example.mongo.repos.PdfDocumentRepository;
import java.io.IOException;
import java.time.Instant;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PdfService {

  private static final long MAX_FILE_SIZE = 14L * 1024 * 1024; // 14 MB

  @Autowired private PdfDocumentRepository pdfDocumentRepository;
  @Autowired private PdfAnnotationRepository pdfAnnotationRepository;
  @Autowired private AuthUtils authUtils;

  private PdfDocument findOwned(String id) {
    String userId = authUtils.getCurrentUserId();
    return pdfDocumentRepository
        .findById(id)
        .filter(doc -> userId.equals(doc.getUserId()))
        .orElseThrow(() -> new ResourceNotFoundException("PdfDocument", "id", id));
  }

  public PdfDocumentDTO upload(MultipartFile file) throws IOException {
    if (file.isEmpty()) {
      throw new IllegalArgumentException("File is empty");
    }
    String contentType = file.getContentType();
    if (contentType == null || !contentType.equals("application/pdf")) {
      throw new IllegalArgumentException("Only PDF files are allowed");
    }
    if (file.getSize() > MAX_FILE_SIZE) {
      throw new IllegalArgumentException("File exceeds 14 MB limit");
    }

    PdfDocument doc = new PdfDocument();
    doc.setUserId(authUtils.getCurrentUserId());
    doc.setFilename(file.getOriginalFilename());
    doc.setFileSize(file.getSize());
    doc.setData(file.getBytes());
    doc.setTotalPages(0);
    doc.setLastPage(1);

    return new PdfDocumentDTO(pdfDocumentRepository.save(doc));
  }

  public List<PdfDocumentDTO> listAll() {
    String userId = authUtils.getCurrentUserId();
    return pdfDocumentRepository.findAllByUserId(userId).stream().map(PdfDocumentDTO::new).toList();
  }

  public byte[] getFileBytes(String id) {
    return findOwned(id).getData();
  }

  public void delete(String id) {
    PdfDocument doc = findOwned(id);
    String userId = authUtils.getCurrentUserId();
    pdfAnnotationRepository.deleteByPdfIdAndUserId(id, userId);
    pdfDocumentRepository.delete(doc);
  }

  public PdfDocumentDTO saveProgress(String id, int lastPage) {
    PdfDocument doc = findOwned(id);
    doc.setLastPage(lastPage);
    doc.setLastReadAt(Instant.now());
    return new PdfDocumentDTO(pdfDocumentRepository.save(doc));
  }

  public PdfDocumentDTO saveTotalPages(String id, int totalPages) {
    PdfDocument doc = findOwned(id);
    if (doc.getTotalPages() == 0) {
      doc.setTotalPages(totalPages);
      pdfDocumentRepository.save(doc);
    }
    return new PdfDocumentDTO(doc);
  }

  public List<PdfAnnotation> getAnnotations(String pdfId) {
    PdfDocument doc = findOwned(pdfId);
    return pdfAnnotationRepository.findAllByPdfIdAndUserId(pdfId, doc.getUserId());
  }

  public PdfAnnotation createAnnotation(String pdfId, PdfAnnotation annotation) {
    findOwned(pdfId); // ownership guard
    String userId = authUtils.getCurrentUserId();
    annotation.setPdfId(pdfId);
    annotation.setUserId(userId);
    return pdfAnnotationRepository.save(annotation);
  }

  public void deleteAnnotation(String pdfId, String annotId) {
    findOwned(pdfId); // ownership guard
    String userId = authUtils.getCurrentUserId();
    pdfAnnotationRepository
        .findById(annotId)
        .filter(a -> userId.equals(a.getUserId()) && pdfId.equals(a.getPdfId()))
        .ifPresent(pdfAnnotationRepository::delete);
  }
}
