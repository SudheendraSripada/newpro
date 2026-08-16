export function generateStudyPlan(validTasks, parsedDailyHours, daysRemaining) {
    const dailyPlan = [];
    let currentDay = 1;
    let dayHoursRemaining = parsedDailyHours;
    let currentDayTasks = [];

    const today = new Date(); today.setHours(0, 0, 0, 0);

    // Create deep copy of tasks to deplete iteratively
    let remainingTasks = validTasks.map((t, idx) => ({ ...t, id: idx, hoursLeft: parseFloat(t.estimatedHours) }));

    while (remainingTasks.length > 0 && currentDay <= daysRemaining) {
      let currentTask = remainingTasks[0];

      if (currentTask.hoursLeft <= dayHoursRemaining) {
        // Can finish this task today
        currentDayTasks.push({
          taskId: currentTask.id,
          name: currentTask.name,
          hoursSpent: currentTask.hoursLeft,
          completedTaskPartially: false
        });
        dayHoursRemaining -= currentTask.hoursLeft;
        remainingTasks.shift(); // Remove finished task
      } else {
        // Task takes longer than remaining time today
        currentDayTasks.push({
          taskId: currentTask.id,
          name: currentTask.name,
          hoursSpent: dayHoursRemaining,
          completedTaskPartially: true
        });
        currentTask.hoursLeft -= dayHoursRemaining;
        dayHoursRemaining = 0;
      }

      // If day is full or no tasks left, close the day
      if (dayHoursRemaining === 0 || remainingTasks.length === 0) {
        dailyPlan.push({
          dayIndex: currentDay,
          date: new Date(today.getTime() + (currentDay - 1) * 24 * 60 * 60 * 1000).toLocaleDateString(),
          assignments: currentDayTasks,
          completed: false
        });
        currentDay++;
        dayHoursRemaining = parsedDailyHours;
        currentDayTasks = [];
      }
    }
    
    return dailyPlan;
}
