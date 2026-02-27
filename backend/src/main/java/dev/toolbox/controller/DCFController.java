package dev.toolbox.controller;

import dev.toolbox.models.dto.DCFRequestDTO;
import dev.toolbox.models.dto.DCFResultDTO;
import dev.toolbox.services.DCFService;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dcf")
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
