package dev.toolbox.services;

import com.mailersend.sdk.MailerSend;
import com.mailersend.sdk.MailerSendResponse;
import com.mailersend.sdk.emails.Email;
import com.mailersend.sdk.exceptions.MailerSendException;
import dev.toolbox.repos.UserRepo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EmailService {

  @Value("${mailersend.api.key:}")
  private String apiKey;

  @Value("${app.notification.from.email:noreply@toolbox.local}")
  private String fromEmail;

  @Value("${app.notification.from.name:ToolBox}")
  private String fromName;

  @Autowired private UserRepo userRepo;

  public void send(String to, String subject, String htmlBody) {
    if (apiKey == null || apiKey.isBlank()) {
      log.warn("MailerSend API key not configured — skipping email: {}", subject);
      return;
    }
    if (to == null || to.isBlank()) {
      log.warn("No recipient address — skipping email: {}", subject);
      return;
    }
    try {
      Email email = new Email();
      email.setFrom(fromName, fromEmail);
      email.addRecipient("", to);
      email.setSubject(subject);
      email.setHtml(htmlBody);

      MailerSend ms = new MailerSend();
      ms.setToken(apiKey);
      MailerSendResponse response = ms.emails().send(email);
      log.info(
          "Email sent to {} [{}] status={} messageId={} rateLimit={}/{}",
          to,
          subject,
          response.responseStatusCode,
          response.messageId,
          response.rateLimitRemaining,
          response.rateLimit);
    } catch (MailerSendException e) {
      log.error(
          "Failed to send email to {} [{}]: status={} body={} error={}",
          to,
          subject,
          e.code,
          e.responseBody,
          e.getMessage());
    }
  }

  /** Send to all users with the ADMIN role. */
  public void sendToAdmins(String subject, String htmlBody) {
    userRepo.findByRole("ADMIN").forEach(admin -> send(admin.getEmail(), subject, htmlBody));
  }

  public void sendPriceAlert(
      String to, String symbol, String direction, double targetPrice, double currentPrice) {
    String subject = String.format("Price Alert: %s %s €%.2f", symbol, direction, targetPrice);
    String html =
        String.format(
            "<h2>Price Alert Triggered</h2>"
                + "<p><strong>%s</strong> is now <strong>€%.2f</strong>.</p>"
                + "<p>Your alert was set for %s €%.2f.</p>",
            symbol, currentPrice, direction, targetPrice);
    send(to, subject, html);
  }

  public void sendPasswordReset(String to, String name, String resetUrl) {
    String subject = "Reset your ToolBox password";
    String html =
        String.format(
            "<h2>Password Reset Request</h2>"
                + "<p>Hi <strong>%s</strong>,</p>"
                + "<p>Click the link below to reset your password. It expires in 24 hours.</p>"
                + "<p><a href='%s' style='font-size:16px;'>Reset Password</a></p>"
                + "<p style='opacity:0.5;font-size:12px;'>If you didn't request this, you can ignore this email.</p>",
            name, resetUrl);
    send(to, subject, html);
  }

  public void sendSystemAlert(String subject, String message) {
    String html = "<h2>System Alert</h2><p>" + message + "</p>";
    sendToAdmins(subject, html);
  }

  public void sendSubscriptionReminder(
      String to, String name, String provider, String renewalDate, double amount) {
    String subject = String.format("Reminder: %s renews on %s", name, renewalDate);
    String html =
        String.format(
            "<h2>Subscription Renewal Reminder</h2>"
                + "<p><strong>%s</strong> (%s) renews on <strong>%s</strong> — €%.2f</p>"
                + "<p><a href='/finance.html?tab=subscriptions'>View Subscriptions</a></p>",
            name, provider, renewalDate, amount);
    send(to, subject, html);
  }
}
