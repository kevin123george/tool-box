package com.example.mongo.controller;

import com.example.mongo.models.PushSubscription;
import com.example.mongo.repos.PushSubscriptionRepository;
import com.example.mongo.services.WebPushService;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/push")
public class PushSubscriptionController {

  @Value("${vapid.public.key}")
  private String publicKey;

  @Autowired private PushSubscriptionRepository subscriptionRepository;

  @Autowired private WebPushService webPushService;

  @GetMapping("/public-key")
  public ResponseEntity<PublicKeyResponse> getPublicKey() {
    return ResponseEntity.ok(new PublicKeyResponse(publicKey));
  }

  @PostMapping("/subscribe")
  public ResponseEntity<String> subscribe(@RequestBody SubscriptionRequest request) {
    PushSubscription subscription =
        subscriptionRepository.findByEndpoint(request.getEndpoint()).orElse(new PushSubscription());

    subscription.setEndpoint(request.getEndpoint());
    subscription.setP256dh(request.getKeys().getP256dh());
    subscription.setAuth(request.getKeys().getAuth());
    subscription.setDeviceName(request.getDeviceName());
    subscription.setUserAgent(request.getUserAgent());
    subscription.setSubscribedAt(
        subscription.getSubscribedAt() != null
            ? subscription.getSubscribedAt()
            : LocalDateTime.now());
    subscription.setLastUsed(LocalDateTime.now());

    subscriptionRepository.save(subscription);

    return ResponseEntity.ok("Subscribed successfully");
  }

  @PostMapping("/unsubscribe")
  public ResponseEntity<String> unsubscribe(@RequestBody UnsubscribeRequest request) {
    subscriptionRepository
        .findByEndpoint(request.getEndpoint())
        .ifPresent(subscriptionRepository::delete);
    return ResponseEntity.ok("Unsubscribed successfully");
  }

  @GetMapping("/subscriptions")
  public ResponseEntity<List<PushSubscription>> getAllSubscriptions() {
    return ResponseEntity.ok(subscriptionRepository.findAll());
  }

  @PostMapping("/test")
  public ResponseEntity<Map<String, Object>> testNotification() {
    List<PushSubscription> subscriptions = subscriptionRepository.findAll();

    if (subscriptions.isEmpty()) {
      Map<String, Object> response = new HashMap<>();
      response.put("success", false);
      response.put("message", "No devices subscribed");
      return ResponseEntity.ok(response);
    }

    webPushService.sendNotificationToAll(
        "🎉 Test Notification", "This is a test from your homelab server!", "test");

    Map<String, Object> response = new HashMap<>();
    response.put("success", true);
    response.put("message", "Test notification sent to " + subscriptions.size() + " device(s)");
    response.put("deviceCount", subscriptions.size());
    return ResponseEntity.ok(response);
  }

  @Data
  @AllArgsConstructor
  @NoArgsConstructor
  public static class PublicKeyResponse {
    private String publicKey;
  }

  @Data
  public static class SubscriptionRequest {
    private String endpoint;
    private Keys keys;
    private String deviceName;
    private String userAgent;
  }

  @Data
  public static class Keys {
    private String p256dh;
    private String auth;
  }

  @Data
  public static class UnsubscribeRequest {
    private String endpoint;
  }
}
