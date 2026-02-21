package com.example.mongo.models.dto;

import com.example.mongo.models.PdfDocument;
import java.time.Instant;

public class PdfDocumentDTO {

  private String id;
  private String userId;
  private String filename;
  private long fileSize;
  private int totalPages;
  private int lastPage;
  private Instant lastReadAt;
  private Instant createdAt;
  private Instant updatedAt;

  public PdfDocumentDTO() {}

  public PdfDocumentDTO(PdfDocument doc) {
    this.id = doc.getId();
    this.userId = doc.getUserId();
    this.filename = doc.getFilename();
    this.fileSize = doc.getFileSize();
    this.totalPages = doc.getTotalPages();
    this.lastPage = doc.getLastPage();
    this.lastReadAt = doc.getLastReadAt();
    this.createdAt = doc.getCreatedAt();
    this.updatedAt = doc.getUpdatedAt();
  }

  public double getProgressPercent() {
    if (totalPages <= 0) return 0.0;
    return Math.min(100.0, (lastPage * 100.0) / totalPages);
  }

  public String getId() {
    return id;
  }

  public String getUserId() {
    return userId;
  }

  public String getFilename() {
    return filename;
  }

  public long getFileSize() {
    return fileSize;
  }

  public int getTotalPages() {
    return totalPages;
  }

  public int getLastPage() {
    return lastPage;
  }

  public Instant getLastReadAt() {
    return lastReadAt;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }
}
