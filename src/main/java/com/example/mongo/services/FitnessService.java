package com.example.mongo.services;

import com.example.mongo.models.WeightEntry;
import com.example.mongo.models.WorkoutLog;
import com.example.mongo.models.dto.FitnessStats;
import com.example.mongo.repos.WeightEntryRepository;
import com.example.mongo.repos.WorkoutLogRepository;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class FitnessService {

  @Autowired private WorkoutLogRepository workoutLogRepository;
  @Autowired private WeightEntryRepository weightEntryRepository;

  // ===== WORKOUT METHODS =====

  public WorkoutLog logWorkout(WorkoutLog workout) {
    if (workout.getWorkoutDate() != null) {
      workout.setDayOfWeek(workout.getWorkoutDate().getDayOfWeek());
    }
    return workoutLogRepository.save(workout);
  }

  public Optional<WorkoutLog> getWorkoutById(String id) {
    return workoutLogRepository.findById(id);
  }

  public List<WorkoutLog> getWorkoutsForWeek(LocalDate dateInWeek) {
    LocalDate weekStart = dateInWeek.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    LocalDate weekEnd = weekStart.plusDays(6);
    return workoutLogRepository.findByWorkoutDateBetween(weekStart, weekEnd);
  }

  public Page<WorkoutLog> getWorkoutHistory(int page, int size) {
    Pageable pageable = PageRequest.of(page, size);
    return workoutLogRepository.findAllByOrderByWorkoutDateDesc(pageable);
  }

  public List<WorkoutLog> getRecentWorkouts() {
    return workoutLogRepository.findTop30ByOrderByWorkoutDateDesc();
  }

  public WorkoutLog updateWorkout(String id, WorkoutLog workoutDetails) {
    return workoutLogRepository
        .findById(id)
        .map(
            workout -> {
              workout.setWorkoutDate(workoutDetails.getWorkoutDate());
              workout.setDayOfWeek(
                  workoutDetails.getWorkoutDate() != null
                      ? workoutDetails.getWorkoutDate().getDayOfWeek()
                      : null);
              workout.setExerciseType(workoutDetails.getExerciseType());
              workout.setDurationMinutes(workoutDetails.getDurationMinutes());
              workout.setExercises(workoutDetails.getExercises());
              workout.setNotes(workoutDetails.getNotes());
              workout.setCompleted(workoutDetails.isCompleted());
              workout.setCaloriesBurned(workoutDetails.getCaloriesBurned());
              return workoutLogRepository.save(workout);
            })
        .orElse(null);
  }

  public void deleteWorkout(String id) {
    workoutLogRepository.deleteById(id);
  }

  // ===== WEIGHT METHODS =====

  public WeightEntry logWeight(WeightEntry entry) {
    // If an entry exists for this date, update it
    Optional<WeightEntry> existing = weightEntryRepository.findByDate(entry.getDate());
    if (existing.isPresent()) {
      WeightEntry existingEntry = existing.get();
      existingEntry.setWeight(entry.getWeight());
      existingEntry.setNotes(entry.getNotes());
      return weightEntryRepository.save(existingEntry);
    }
    return weightEntryRepository.save(entry);
  }

  public List<WeightEntry> getWeightHistory(int days) {
    LocalDate endDate = LocalDate.now();
    LocalDate startDate = endDate.minusDays(days);
    return weightEntryRepository.findByDateBetween(startDate, endDate);
  }

  public List<WeightEntry> getAllWeightHistory() {
    return weightEntryRepository.findAllByOrderByDateDesc();
  }

  public Optional<WeightEntry> getLatestWeight() {
    return weightEntryRepository.findTopByOrderByDateDesc();
  }

  public void deleteWeightEntry(String id) {
    weightEntryRepository.deleteById(id);
  }

  // ===== STATS METHODS =====

  public FitnessStats calculateStats() {
    FitnessStats stats = new FitnessStats();

    // Get all completed workouts sorted by date
    List<WorkoutLog> completedWorkouts = workoutLogRepository.findByCompletedTrueOrderByWorkoutDateDesc();

    // Total workouts
    stats.setTotalWorkouts(completedWorkouts.size());

    // This week workouts
    LocalDate today = LocalDate.now();
    LocalDate weekStart = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    long thisWeekCount =
        completedWorkouts.stream()
            .filter(w -> w.getWorkoutDate() != null && !w.getWorkoutDate().isBefore(weekStart))
            .count();
    stats.setThisWeekWorkouts((int) thisWeekCount);

    // Calculate streaks
    int currentStreak = calculateCurrentStreak(completedWorkouts);
    int longestStreak = calculateLongestStreak(completedWorkouts);
    stats.setCurrentStreak(currentStreak);
    stats.setLongestStreak(longestStreak);

    // Weight stats
    List<WeightEntry> weights = weightEntryRepository.findAllByOrderByDateAsc();
    if (!weights.isEmpty()) {
      double avgWeight = weights.stream().mapToDouble(WeightEntry::getWeight).average().orElse(0.0);
      stats.setAverageWeight(Math.round(avgWeight * 10) / 10.0);

      if (weights.size() >= 2) {
        double firstWeight = weights.get(0).getWeight();
        double lastWeight = weights.get(weights.size() - 1).getWeight();
        stats.setWeightChange(Math.round((lastWeight - firstWeight) * 10) / 10.0);
      }
    }

    return stats;
  }

  private int calculateCurrentStreak(List<WorkoutLog> completedWorkouts) {
    if (completedWorkouts.isEmpty()) return 0;

    // Sort by date descending
    completedWorkouts.sort(Comparator.comparing(WorkoutLog::getWorkoutDate).reversed());

    LocalDate today = LocalDate.now();
    LocalDate expectedDate = today;

    // Check if we worked out today or yesterday to start the streak
    if (!completedWorkouts.isEmpty()) {
      LocalDate lastWorkoutDate = completedWorkouts.get(0).getWorkoutDate();
      if (lastWorkoutDate == null) return 0;

      // If last workout was more than 1 day ago, streak is broken
      if (lastWorkoutDate.isBefore(today.minusDays(1))) {
        return 0;
      }
      expectedDate = lastWorkoutDate;
    }

    int streak = 0;
    for (WorkoutLog workout : completedWorkouts) {
      if (workout.getWorkoutDate() == null) continue;

      if (workout.getWorkoutDate().equals(expectedDate)) {
        streak++;
        expectedDate = expectedDate.minusDays(1);
      } else if (workout.getWorkoutDate().isBefore(expectedDate)) {
        // Gap found, streak broken
        break;
      }
      // If same date as previous, skip (multiple workouts same day)
    }

    return streak;
  }

  private int calculateLongestStreak(List<WorkoutLog> completedWorkouts) {
    if (completedWorkouts.isEmpty()) return 0;

    // Sort by date ascending
    completedWorkouts.sort(Comparator.comparing(WorkoutLog::getWorkoutDate));

    int longestStreak = 0;
    int currentStreak = 0;
    LocalDate lastDate = null;

    for (WorkoutLog workout : completedWorkouts) {
      if (workout.getWorkoutDate() == null) continue;

      if (lastDate == null) {
        currentStreak = 1;
      } else if (workout.getWorkoutDate().equals(lastDate.plusDays(1))) {
        currentStreak++;
      } else if (!workout.getWorkoutDate().equals(lastDate)) {
        // Gap or not consecutive day
        longestStreak = Math.max(longestStreak, currentStreak);
        currentStreak = 1;
      }
      // If same date, don't increment (multiple workouts same day)

      lastDate = workout.getWorkoutDate();
    }

    return Math.max(longestStreak, currentStreak);
  }
}
