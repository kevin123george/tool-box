package dev.toolbox.controller;

import dev.toolbox.models.Subscription;
import dev.toolbox.models.dto.SubscriptionSummaryDTO;
import dev.toolbox.services.SubscriptionService;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/subscriptions")
public class SubscriptionController {

  @Autowired private SubscriptionService subscriptionService;

  @GetMapping
  public ResponseEntity<List<Subscription>> getAllSubscriptions() {
    return ResponseEntity.ok(subscriptionService.getAllSubscriptions());
  }

  @GetMapping("/active")
  public ResponseEntity<List<Subscription>> getActiveSubscriptions() {
    return ResponseEntity.ok(subscriptionService.getActiveSubscriptions());
  }

  @GetMapping("/{id}")
  public ResponseEntity<Subscription> getById(@PathVariable String id) {
    return ResponseEntity.ok(subscriptionService.getById(id));
  }

  @PostMapping
  public ResponseEntity<Subscription> create(@RequestBody Subscription subscription) {
    return ResponseEntity.status(HttpStatus.CREATED).body(subscriptionService.create(subscription));
  }

  @PutMapping("/{id}")
  public ResponseEntity<Subscription> update(
      @PathVariable String id, @RequestBody Subscription subscription) {
    return ResponseEntity.ok(subscriptionService.update(id, subscription));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable String id) {
    subscriptionService.delete(id);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/summary")
  public ResponseEntity<SubscriptionSummaryDTO> getSummary() {
    return ResponseEntity.ok(subscriptionService.getSummary());
  }
}
