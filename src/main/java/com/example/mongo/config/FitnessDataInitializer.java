package com.example.mongo.config;

import com.example.mongo.models.WorkoutLog;
import com.example.mongo.models.WorkoutLog.ExerciseDetail;
import com.example.mongo.models.WorkoutPlan;
import com.example.mongo.models.WorkoutTemplate;
import com.example.mongo.repos.WorkoutPlanRepository;
import com.example.mongo.repos.WorkoutTemplateRepository;
import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class FitnessDataInitializer implements CommandLineRunner {

  @Autowired private WorkoutTemplateRepository templateRepository;
  @Autowired private WorkoutPlanRepository planRepository;

  @Override
  public void run(String... args) {
    // Only initialize if no templates exist
    if (templateRepository.count() > 0) {
      return;
    }

    // Create default templates
    WorkoutTemplate pushDay = createPushTemplate();
    WorkoutTemplate pullDay = createPullTemplate();
    WorkoutTemplate legsDay = createLegsTemplate();
    WorkoutTemplate cardioDay = createCardioTemplate();
    WorkoutTemplate restDay = createRestTemplate();

    templateRepository.save(pushDay);
    templateRepository.save(pullDay);
    templateRepository.save(legsDay);
    templateRepository.save(cardioDay);
    templateRepository.save(restDay);

    // Create default PPL plan
    WorkoutPlan pplPlan = new WorkoutPlan();
    pplPlan.setName("Push/Pull/Legs (PPL)");
    pplPlan.setActive(true);
    pplPlan.setNotes("Classic 5-day PPL split. Adjust exercises as needed.");

    Map<DayOfWeek, String> schedule = new HashMap<>();
    schedule.put(DayOfWeek.MONDAY, pushDay.getId());
    schedule.put(DayOfWeek.TUESDAY, pullDay.getId());
    schedule.put(DayOfWeek.WEDNESDAY, legsDay.getId());
    schedule.put(DayOfWeek.THURSDAY, pushDay.getId());
    schedule.put(DayOfWeek.FRIDAY, pullDay.getId());
    // Saturday and Sunday are rest days (no template assigned)
    pplPlan.setSchedule(schedule);

    planRepository.save(pplPlan);
  }

  private WorkoutTemplate createPushTemplate() {
    WorkoutTemplate template = new WorkoutTemplate();
    template.setName("Push Day");
    template.setExerciseType(WorkoutLog.ExerciseType.PUSH);
    template.setEstimatedDuration(60);
    template.setNotes("Chest, Shoulders, Triceps");

    List<ExerciseDetail> exercises = new ArrayList<>();
    exercises.add(createExercise("Bench Press", 4, 8, 60.0));
    exercises.add(createExercise("Overhead Press", 4, 8, 40.0));
    exercises.add(createExercise("Incline Dumbbell Press", 3, 10, 22.5));
    exercises.add(createExercise("Lateral Raises", 3, 12, 10.0));
    exercises.add(createExercise("Tricep Pushdowns", 3, 12, 20.0));
    exercises.add(createExercise("Tricep Dips", 3, 10, null));
    template.setExercises(exercises);

    return template;
  }

  private WorkoutTemplate createPullTemplate() {
    WorkoutTemplate template = new WorkoutTemplate();
    template.setName("Pull Day");
    template.setExerciseType(WorkoutLog.ExerciseType.PULL);
    template.setEstimatedDuration(60);
    template.setNotes("Back, Biceps, Rear Delts");

    List<ExerciseDetail> exercises = new ArrayList<>();
    exercises.add(createExercise("Deadlift", 4, 6, 100.0));
    exercises.add(createExercise("Pull-ups", 4, 8, null));
    exercises.add(createExercise("Barbell Rows", 4, 8, 60.0));
    exercises.add(createExercise("Face Pulls", 3, 15, 15.0));
    exercises.add(createExercise("Barbell Curls", 3, 10, 25.0));
    exercises.add(createExercise("Hammer Curls", 3, 12, 12.5));
    template.setExercises(exercises);

    return template;
  }

  private WorkoutTemplate createLegsTemplate() {
    WorkoutTemplate template = new WorkoutTemplate();
    template.setName("Legs Day");
    template.setExerciseType(WorkoutLog.ExerciseType.LEGS);
    template.setEstimatedDuration(60);
    template.setNotes("Quads, Hamstrings, Glutes, Calves");

    List<ExerciseDetail> exercises = new ArrayList<>();
    exercises.add(createExercise("Squats", 4, 8, 80.0));
    exercises.add(createExercise("Romanian Deadlift", 4, 10, 60.0));
    exercises.add(createExercise("Leg Press", 3, 12, 120.0));
    exercises.add(createExercise("Leg Curls", 3, 12, 40.0));
    exercises.add(createExercise("Leg Extensions", 3, 12, 40.0));
    exercises.add(createExercise("Calf Raises", 4, 15, 60.0));
    template.setExercises(exercises);

    return template;
  }

  private WorkoutTemplate createCardioTemplate() {
    WorkoutTemplate template = new WorkoutTemplate();
    template.setName("Cardio Day");
    template.setExerciseType(WorkoutLog.ExerciseType.CARDIO);
    template.setEstimatedDuration(45);
    template.setNotes("Light cardio and active recovery");

    List<ExerciseDetail> exercises = new ArrayList<>();
    ExerciseDetail running = new ExerciseDetail();
    running.setName("Running/Jogging");
    running.setDurationSeconds(1800); // 30 min
    running.setNotes("Moderate pace");
    exercises.add(running);

    ExerciseDetail stretching = new ExerciseDetail();
    stretching.setName("Stretching");
    stretching.setDurationSeconds(900); // 15 min
    exercises.add(stretching);

    template.setExercises(exercises);
    return template;
  }

  private WorkoutTemplate createRestTemplate() {
    WorkoutTemplate template = new WorkoutTemplate();
    template.setName("Rest Day");
    template.setExerciseType(WorkoutLog.ExerciseType.REST);
    template.setEstimatedDuration(0);
    template.setNotes("Recovery day - light walking or stretching optional");
    template.setExercises(new ArrayList<>());
    return template;
  }

  private ExerciseDetail createExercise(String name, int sets, int reps, Double weight) {
    ExerciseDetail exercise = new ExerciseDetail();
    exercise.setName(name);
    exercise.setSets(sets);
    exercise.setReps(reps);
    exercise.setWeight(weight);
    return exercise;
  }
}
