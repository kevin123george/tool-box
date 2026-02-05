package com.example.mongo.controller;

import com.example.mongo.models.dto.DCFRequestDTO;
import com.example.mongo.models.dto.DCFResultDTO;
import com.example.mongo.services.DCFService;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dcf")
@CrossOrigin(origins = "*")
public class DCFController {

  @Autowired private DCFService dcfService;

  @GetMapping("/defaults/{symbol}")
  public ResponseEntity<Map<String, Object>> getDefaults(@PathVariable String symbol) {
    return ResponseEntity.ok(dcfService.getDefaults(symbol));
  }

  @PostMapping("/calculate")
  public ResponseEntity<DCFResultDTO> calculate(@RequestBody DCFRequestDTO request) {
    DCFResultDTO result = dcfService.calculateDCF(request);
    return ResponseEntity.ok(result);
  }
}
