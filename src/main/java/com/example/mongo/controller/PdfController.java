package com.example.mongo.controller;

import com.example.mongo.models.PdfAnnotation;
import com.example.mongo.models.dto.PdfDocumentDTO;
import com.example.mongo.services.PdfService;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/pdfs")
@CrossOrigin(origins = "*")
public class PdfController {

  @Autowired private PdfService pdfService;

  @PostMapping("/upload")
  public PdfDocumentDTO upload(@RequestParam("file") MultipartFile file) throws IOException {
    return pdfService.upload(file);
  }

  @GetMapping
  public List<PdfDocumentDTO> listAll() {
    return pdfService.listAll();
  }

  @GetMapping("/{id}/file")
  public ResponseEntity<byte[]> getFile(@PathVariable String id) {
    byte[] data = pdfService.getFileBytes(id);
    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_PDF)
        .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
        .body(data);
  }

  @DeleteMapping("/{id}")
  public void delete(@PathVariable String id) {
    pdfService.delete(id);
  }

  @PatchMapping("/{id}/progress")
  public PdfDocumentDTO saveProgress(
      @PathVariable String id, @RequestBody Map<String, Integer> body) {
    return pdfService.saveProgress(id, body.get("lastPage"));
  }

  @PatchMapping("/{id}/totalPages")
  public PdfDocumentDTO saveTotalPages(
      @PathVariable String id, @RequestBody Map<String, Integer> body) {
    return pdfService.saveTotalPages(id, body.get("totalPages"));
  }

  @GetMapping("/{id}/annotations")
  public List<PdfAnnotation> getAnnotations(@PathVariable String id) {
    return pdfService.getAnnotations(id);
  }

  @PostMapping("/{id}/annotations")
  public PdfAnnotation createAnnotation(
      @PathVariable String id, @RequestBody PdfAnnotation annotation) {
    return pdfService.createAnnotation(id, annotation);
  }

  @DeleteMapping("/{id}/annotations/{aid}")
  public void deleteAnnotation(@PathVariable String id, @PathVariable String aid) {
    pdfService.deleteAnnotation(id, aid);
  }
}
