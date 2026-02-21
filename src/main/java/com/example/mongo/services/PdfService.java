package com.example.mongo.services;

import com.example.mongo.config.AuthUtils;
import com.example.mongo.exception.ResourceNotFoundException;
import com.example.mongo.models.PdfAnnotation;
import com.example.mongo.models.PdfDocument;
import com.example.mongo.models.dto.PdfDocumentDTO;
import com.example.mongo.repos.PdfAnnotationRepository;
import com.example.mongo.repos.PdfDocumentRepository;
import com.mongodb.client.gridfs.model.GridFSFile;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.List;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.gridfs.GridFsResource;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PdfService {

  private static final long MAX_FILE_SIZE = 500L * 1024 * 1024; // 500 MB

  @Autowired private PdfDocumentRepository pdfDocumentRepository;
  @Autowired private PdfAnnotationRepository pdfAnnotationRepository;
  @Autowired private GridFsTemplate gridFsTemplate;
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
      throw new IllegalArgumentException("File exceeds 500 MB limit");
    }

    ObjectId gridFsId =
        gridFsTemplate.store(file.getInputStream(), file.getOriginalFilename(), "application/pdf");

    PdfDocument doc = new PdfDocument();
    doc.setUserId(authUtils.getCurrentUserId());
    doc.setFilename(file.getOriginalFilename());
    doc.setFileSize(file.getSize());
    doc.setGridFsFileId(gridFsId.toString());
    doc.setTotalPages(0);
    doc.setLastPage(1);

    return new PdfDocumentDTO(pdfDocumentRepository.save(doc));
  }

  public List<PdfDocumentDTO> listAll() {
    String userId = authUtils.getCurrentUserId();
    return pdfDocumentRepository.findAllByUserId(userId).stream().map(PdfDocumentDTO::new).toList();
  }

  public InputStream getFileStream(String id) throws IOException {
    PdfDocument doc = findOwned(id);
    GridFSFile gridFsFile =
        gridFsTemplate.findOne(
            new Query(Criteria.where("_id").is(new ObjectId(doc.getGridFsFileId()))));
    if (gridFsFile == null) {
      throw new ResourceNotFoundException("PdfFile", "id", id);
    }
    GridFsResource resource = gridFsTemplate.getResource(gridFsFile);
    return resource.getInputStream();
  }

  public void delete(String id) {
    PdfDocument doc = findOwned(id);
    String userId = authUtils.getCurrentUserId();
    // Delete GridFS file
    if (doc.getGridFsFileId() != null) {
      gridFsTemplate.delete(
          new Query(Criteria.where("_id").is(new ObjectId(doc.getGridFsFileId()))));
    }
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
