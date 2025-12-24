package com.example.mongo.services;

import com.example.mongo.models.PushSubscription;
import com.example.mongo.repos.PushSubscriptionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import java.security.GeneralSecurityException;
import java.security.Security;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class WebPushService {

  @Value("${vapid.public.key}")
  private String publicKey;

  @Value("${vapid.private.key}")
  private String privateKey;

  @Value("${vapid.subject}")
  private String subject;

  @Autowired private PushSubscriptionRepository subscriptionRepository;

  private PushService pushService;
  private ObjectMapper objectMapper = new ObjectMapper();

  @PostConstruct
  public void init() throws GeneralSecurityException {
    Security.addProvider(new BouncyCastleProvider());
    pushService = new PushService();
    pushService.setPublicKey(publicKey);
    pushService.setPrivateKey(privateKey);
    pushService.setSubject(subject);
    log.info("WebPushService initialized successfully");
  }

  public void sendNotificationToAll(String title, String body, String type) {
    List<PushSubscription> subscriptions = subscriptionRepository.findAll();

    for (PushSubscription subscription : subscriptions) {
      try {
        sendNotification(subscription, title, body, type, new HashMap<>());
      } catch (Exception e) {
        log.error(
            "Failed to send notification to {}: {}", subscription.getEndpoint(), e.getMessage());
        // Remove invalid subscriptions (410 Gone or 404 Not Found)
        if (e.getMessage() != null
            && (e.getMessage().contains("410") || e.getMessage().contains("404"))) {
          log.info("Removing invalid subscription: {}", subscription.getId());
          subscriptionRepository.delete(subscription);
        }
      }
    }
  }

  public void sendNotification(
      PushSubscription subscription,
      String title,
      String body,
      String type,
      Map<String, String> data)
      throws Exception {

    Map<String, Object> payload = new HashMap<>();
    payload.put("title", title);
    payload.put("body", body);
    payload.put("type", type);
    payload.put("data", data);
    payload.put("timestamp", System.currentTimeMillis());
    payload.put("icon", "/icon.png");
    payload.put("badge", "/badge.png");
    payload.put("vibrate", new int[] {200, 100, 200});

    String jsonPayload = objectMapper.writeValueAsString(payload);

    Notification notification =
        new Notification(
            subscription.getEndpoint(),
            subscription.getP256dh(),
            subscription.getAuth(),
            jsonPayload.getBytes());

    pushService.send(notification);
    log.info("Notification sent successfully to {}", subscription.getEndpoint());
  }

  public void sendSystemAlert(String title, String body, String type, Map<String, String> data) {
    List<PushSubscription> subscriptions = subscriptionRepository.findAll();

    if (subscriptions.isEmpty()) {
      log.debug("No subscriptions found, skipping notification");
      return;
    }

    for (PushSubscription subscription : subscriptions) {
      try {
        sendNotification(subscription, title, body, type, data);
      } catch (Exception e) {
        log.error("Failed to send alert to {}: {}", subscription.getEndpoint(), e.getMessage());
      }
    }
  }
}
