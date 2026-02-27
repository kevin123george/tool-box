package dev.toolbox.services;

import dev.toolbox.config.AuthUtils;
import dev.toolbox.models.CalendarEvent;
import dev.toolbox.models.DividendRecord;
import dev.toolbox.models.RecurringTransaction;
import dev.toolbox.models.Subscription;
import dev.toolbox.models.WorkoutLog;
import dev.toolbox.models.dto.CalendarEventDTO;
import dev.toolbox.repos.WorkoutLogRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class FinancialCalendarService {

  @Autowired private RecurringTransactionService recurringTransactionService;

  @Autowired private SubscriptionService subscriptionService;

  @Autowired private DividendService dividendService;

  @Autowired private WorkoutLogRepository workoutLogRepository;
  @Autowired private CalendarEventService calendarEventService;
  @Autowired private AuthUtils authUtils;

  public List<CalendarEventDTO> getEventsForMonth(int year, int month) {
    List<CalendarEventDTO> events = new ArrayList<>();

    LocalDate start = LocalDate.of(year, month, 1);
    LocalDate end = start.plusMonths(1).minusDays(1);

    // Add recurring transactions
    for (RecurringTransaction rt : recurringTransactionService.getActiveTransactions()) {
      LocalDate nextDue = rt.getNextDueDate();

      // Check if the recurring transaction falls within this month
      // We need to check multiple occurrences based on frequency
      LocalDate checkDate = findFirstOccurrenceInMonth(rt, start, end);
      while (checkDate != null && !checkDate.isAfter(end)) {
        String type = "INCOME".equalsIgnoreCase(rt.getCategory()) ? "INCOME" : "EXPENSE";
        events.add(
            new CalendarEventDTO(
                checkDate.getDayOfMonth(),
                rt.getName(),
                rt.getAmount(),
                type,
                "Recurring: " + rt.getCategoryType()));

        // Move to next occurrence
        checkDate = getNextOccurrence(rt, checkDate, end);
      }
    }

    // Add subscriptions
    List<Subscription> subscriptions = subscriptionService.getSubscriptionsForMonth(year, month);
    for (Subscription sub : subscriptions) {
      if (sub.getNextBillingDate() != null) {
        events.add(
            new CalendarEventDTO(
                sub.getNextBillingDate().getDayOfMonth(),
                sub.getName() + " (" + sub.getProvider() + ")",
                sub.getAmount(),
                "SUBSCRIPTION",
                "Subscription"));
      }
    }

    // Add dividends
    List<DividendRecord> dividends = dividendService.getDividendsForMonth(year, month);
    for (DividendRecord div : dividends) {
      if (div.getPaymentDate() != null) {
        events.add(
            new CalendarEventDTO(
                div.getPaymentDate().getDayOfMonth(),
                div.getStockSymbol() + " Dividend",
                div.getAmount(),
                "DIVIDEND",
                "Dividend"));
      }
    }

    // Add workouts
    List<WorkoutLog> workouts =
        workoutLogRepository.findByWorkoutDateBetweenAndUserId(
            start, end, authUtils.getCurrentUserId());
    for (WorkoutLog workout : workouts) {
      if (workout.getWorkoutDate() != null) {
        String exerciseType =
            workout.getExerciseType() != null
                ? workout.getExerciseType().name().replace("_", " ")
                : "Workout";
        CalendarEventDTO event =
            new CalendarEventDTO(
                workout.getWorkoutDate().getDayOfMonth(),
                exerciseType,
                workout.getDurationMinutes() != null ? workout.getDurationMinutes() : 0,
                "WORKOUT",
                "Fitness");
        event.setSubType(
            workout.getExerciseType() != null ? workout.getExerciseType().name() : null);
        event.setCompleted(workout.isCompleted());
        events.add(event);
      }
    }

    // Add personal / custom events — expand multi-day events across each day they cover
    String[] monthAbbr = {
      "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    };
    for (CalendarEvent ce : calendarEventService.getForMonth(year, month)) {
      LocalDate evtEnd = (ce.getEndDate() != null) ? ce.getEndDate() : ce.getDate();
      boolean isRange = !evtEnd.equals(ce.getDate());

      // Build a human-readable range label once (e.g. "Mar 3 – Mar 7")
      String rangeLabel = null;
      if (isRange) {
        rangeLabel =
            monthAbbr[ce.getDate().getMonthValue() - 1]
                + " "
                + ce.getDate().getDayOfMonth()
                + " – "
                + monthAbbr[evtEnd.getMonthValue() - 1]
                + " "
                + evtEnd.getDayOfMonth();
      }

      // Clip to the requested month so we only emit days that fall within [start, end]
      LocalDate dayIter = ce.getDate().isBefore(start) ? start : ce.getDate();
      LocalDate dayLast = evtEnd.isAfter(end) ? end : evtEnd;

      while (!dayIter.isAfter(dayLast)) {
        CalendarEventDTO dto = new CalendarEventDTO();
        dto.setId(ce.getId());
        dto.setDay(dayIter.getDayOfMonth());
        dto.setTitle(ce.getTitle());
        dto.setDescription(ce.getDescription());
        dto.setAmount(0);
        dto.setType(ce.getEventType() != null ? ce.getEventType().name() : "OTHER");
        dto.setSource("Personal");
        dto.setRangeLabel(rangeLabel);
        events.add(dto);
        dayIter = dayIter.plusDays(1);
      }
    }

    // Sort by day
    events.sort((a, b) -> Integer.compare(a.getDay(), b.getDay()));

    return events;
  }

  private LocalDate findFirstOccurrenceInMonth(
      RecurringTransaction rt, LocalDate start, LocalDate end) {
    LocalDate nextDue = rt.getNextDueDate();
    if (nextDue == null) return null;

    // If next due is after the month, check if it would have occurred this month
    if (nextDue.isAfter(end)) {
      // Calculate backwards to see if there's an occurrence in this month
      LocalDate candidate = nextDue;
      while (candidate.isAfter(end)) {
        candidate =
            switch (rt.getFrequency()) {
              case WEEKLY -> candidate.minusWeeks(1);
              case MONTHLY -> candidate.minusMonths(1);
              case YEARLY -> candidate.minusYears(1);
            };
      }
      if (!candidate.isBefore(start)) {
        return candidate;
      }
      return null;
    }

    // If next due is before the month start, advance until we're in range
    while (nextDue.isBefore(start)) {
      nextDue =
          switch (rt.getFrequency()) {
            case WEEKLY -> nextDue.plusWeeks(1);
            case MONTHLY -> nextDue.plusMonths(1);
            case YEARLY -> nextDue.plusYears(1);
          };
    }

    if (!nextDue.isAfter(end)) {
      return nextDue;
    }

    return null;
  }

  private LocalDate getNextOccurrence(RecurringTransaction rt, LocalDate current, LocalDate end) {
    LocalDate next =
        switch (rt.getFrequency()) {
          case WEEKLY -> current.plusWeeks(1);
          case MONTHLY -> current.plusMonths(1);
          case YEARLY -> current.plusYears(1);
        };

    if (next.isAfter(end)) {
      return null;
    }
    return next;
  }
}
