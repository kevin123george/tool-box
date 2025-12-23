package com.example.mongo.controller;

import com.example.mongo.services.MongoDumpService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import org.bson.Document;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/dump")
public class MongoDumpController {

  private final MongoDumpService dumpService;
  private final ObjectMapper objectMapper;

  public MongoDumpController(MongoDumpService dumpService, ObjectMapper objectMapper) {
    this.dumpService = dumpService;
    this.objectMapper = objectMapper;
  }

  @GetMapping("/download")
  public ResponseEntity<byte[]> downloadDump() throws Exception {

    Map<String, List<Document>> dump = dumpService.dumpAllCollections();

    byte[] jsonBytes = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(dump);

    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=mongo-dump.json")
        .contentType(MediaType.APPLICATION_JSON)
        .body(jsonBytes);
  }

  @GetMapping("/save")
  public ResponseEntity<String> saveDumpToFile() throws Exception {

    Map<String, List<Document>> dump = dumpService.dumpAllCollections();

    Path path = Paths.get("mongo-dump.json");
    Files.write(path, objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(dump));

    return ResponseEntity.ok("Dump saved to " + path.toAbsolutePath());
  }
}
