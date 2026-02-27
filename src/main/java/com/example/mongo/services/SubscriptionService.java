package com.example.mongo.services;

import com.example.mongo.config.AuthUtils;
import com.example.mongo.models.Subscription;
import com.example.mongo.models.UsersEntity;
import com.example.mongo.models.dto.SubscriptionSummaryDTO;
import com.example.mongo.repos.SubscriptionRepository;
import com.example.mongo.repos.UserRepo;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class SubscriptionService {

  @Autowired private SubscriptionRepository subscriptionRepository;

  @Autowired private EmailService emailService;

  @Autowired private UserRepo userRepo;

  @Autowired private AuthUtils authUtils;

  public List<Subscription> getAllSubscriptions() {
    return subscriptionRepository.findAllByUserId(authUtils.getCurrentUserId());
  }

  public List<Subscription> getActiveSubscriptions() {
    return subscriptionRepository.findByActiveTrueAndUserId(authUtils.getCurrentUserId());
  }

  public Subscription getById(String id) {
    String userId = authUtils.getCurrentUserId();
    Subscription sub =
        subscriptionRepository
            .findById(id)
            .orElseThrow(() -> new RuntimeException("Subscription not found: " + id));
    if (!userId.equals(sub.getUserId())) throw new RuntimeException("Access denied");
    return sub;
  }

  public Subscription create(Subscription subscription) {
    subscription.setUserId(authUtils.getCurrentUserId());
    return subscriptionRepository.save(subscription);
  }

  public Subscription update(String id, Subscription updated) {
    Subscription existing = getById(id);
    existing.setName(updated.getName());
    existing.setProvider(updated.getProvider());
    existing.setAmount(updated.getAmount());
    existing.setCurrency(updated.getCurrency());
    existing.setBillingCycle(updated.getBillingCycle());
    existing.setNextBillingDate(updated.getNextBillingDate());
    existing.setCategory(updated.getCategory());
    existing.setActive(updated.isActive());
    existing.setNotes(updated.getNotes());
    return subscriptionRepository.save(existing);
  }

  public void delete(String id) {
    String userId = authUtils.getCurrentUserId();
    subscriptionRepository
        .findById(id)
        .ifPresent(
            sub -> {
              if (userId.equals(sub.getUserId())) subscriptionRepository.deleteById(id);
            });
  }

  public SubscriptionSummaryDTO getSummary() {
    String userId = authUtils.getCurrentUserId();
    List<Subscription> active = subscriptionRepository.findByActiveTrueAndUserId(userId);

    double totalMonthly = active.stream().mapToDouble(Subscription::getMonthlyEquivalent).sum();

    double totalAnnual = active.stream().mapToDouble(Subscription::getAnnualEquivalent).sum();

    Map<String, Double> costByCategory =
        active.stream()
            .collect(
                Collectors.groupingBy(
                    s -> s.getCategory() != null ? s.getCategory() : "Other",
                    Collectors.summingDouble(Subscription::getMonthlyEquivalent)));

    return new SubscriptionSummaryDTO(totalMonthly, totalAnnual, active.size(), costByCategory);
  }

  public void checkRenewalReminders() {
    checkRenewalReminders(authUtils.getCurrentUserId());
  }

  public void checkRenewalReminders(String userId) {
    UsersEntity user = userRepo.findById(userId).orElse(null);
    if (user == null || !user.isEmailNotificationsEnabled()) return;

    LocalDate today = LocalDate.now();
    LocalDate threeDaysFromNow = today.plusDays(3);

    List<Subscription> upcomingRenewals =
        subscriptionRepository.findByNextBillingDateBetweenAndActiveTrueAndUserId(
            today, threeDaysFromNow, userId);

    for (Subscription sub : upcomingRenewals) {
      try {
        emailService.sendSubscriptionReminder(
            user.getEmail(),
            sub.getName(),
            sub.getProvider(),
            sub.getNextBillingDate().toString(),
            sub.getAmount());
        log.info("Sent subscription reminder for {} to {}", sub.getName(), user.getEmail());
      } catch (Exception e) {
        log.error("Failed to send subscription reminder: {}", e.getMessage());
      }
    }
  }

  public List<Subscription> getSubscriptionsForMonth(int year, int month) {
    String userId = authUtils.getCurrentUserId();
    LocalDate start = LocalDate.of(year, month, 1);
    LocalDate end = start.plusMonths(1).minusDays(1);
    return subscriptionRepository.findByNextBillingDateBetweenAndActiveTrueAndUserId(
        start, end, userId);
  }
}
