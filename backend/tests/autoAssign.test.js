import { resetDatabase } from '../src/config/db.js';
import * as taskRepository from '../src/repositories/taskRepository.js';
import * as taskService from '../src/services/taskService.js';
import { toSqlDateTime } from '../src/utils/dates.js';

describe('Scheduled Auto-Assignment Logic', () => {
  beforeEach(() => {
    resetDatabase();
  });

  const adminUser = { id: 2, fullName: 'System Administrator', isAdmin: true };

  it('schedules auto-assignment when creating a task with autoAssignDelayMinutes', async () => {
    const deadline = toSqlDateTime(new Date(Date.now() + 7 * 86400000));
    const task = await taskService.createTask(
      {
        title: 'Auto-scheduled task',
        projectId: 1,
        priority: 'HIGH',
        estimatedHours: 5,
        deadline,
        requiredSkills: [],
        autoAssignDelayMinutes: 10
      },
      adminUser
    );

    expect(task.status).toBe('PENDING');
    expect(task.assigned_employee_id).toBeNull();
    expect(task.auto_assign_at).not.toBeNull();

    const history = await taskRepository.getHistory(task.id);
    const scheduledLog = history.find((h) => h.action === 'AUTO_ASSIGN_SCHEDULED');
    expect(scheduledLog).toBeDefined();
    expect(scheduledLog.details).toContain('10 minute(s)');
  });

  it('allows scheduling and cancelling auto-assignment on an existing pending task', async () => {
    const deadline = toSqlDateTime(new Date(Date.now() + 7 * 86400000));
    const task = await taskService.createTask(
      {
        title: 'Unassigned task',
        projectId: 1,
        priority: 'MEDIUM',
        estimatedHours: 4,
        deadline,
        requiredSkills: []
      },
      adminUser
    );

    expect(task.auto_assign_at).toBeNull();

    // Schedule
    const scheduled = await taskService.scheduleTaskAutoAssign(task.id, { delayMinutes: 15 }, adminUser);
    expect(scheduled.auto_assign_at).not.toBeNull();

    // Cancel
    const cancelled = await taskService.cancelTaskAutoAssign(task.id, adminUser);
    expect(cancelled.auto_assign_at).toBeNull();

    const history = await taskRepository.getHistory(task.id);
    expect(history.some((h) => h.action === 'AUTO_ASSIGN_CANCELLED')).toBe(true);
  });

  it('automatically allocates the best match candidate when timer expires', async () => {
    const deadline = toSqlDateTime(new Date(Date.now() + 7 * 86400000));
    // JavaScript skill (id 1): John Doe has EXPERT (100)
    const task = await taskService.createTask(
      {
        title: 'Task ready for auto-assignment',
        projectId: 1,
        priority: 'HIGH',
        estimatedHours: 4,
        deadline,
        requiredSkills: [{ skillId: 1, minProficiencyLevel: 'ADVANCED' }]
      },
      adminUser
    );

    // Simulate expired timer (set auto_assign_at in the past)
    const pastTime = toSqlDateTime(new Date(Date.now() - 5000));
    await taskRepository.setAutoAssignAt(task.id, pastTime);

    // Run due auto-assignments
    const results = await taskService.processDueAutoAssignments();
    expect(results.length).toBe(1);
    expect(results[0].taskId).toBe(task.id);

    const updatedTask = await taskRepository.getTaskById(task.id);
    expect(updatedTask.status).toBe('ASSIGNED');
    expect(updatedTask.assigned_employee_id).not.toBeNull();
    expect(updatedTask.auto_assign_at).toBeNull();

    const history = await taskRepository.getHistory(task.id);
    const autoLog = history.find((h) => h.action === 'AUTO_ASSIGNED');
    expect(autoLog).toBeDefined();
    expect(autoLog.details).toContain('Assigned to');
  });

  it('handles gracefully when no candidate is eligible upon timer expiration', async () => {
    const deadline = toSqlDateTime(new Date(Date.now() + 7 * 86400000));
    // Task requires membership on Project 2 (requires_membership = 1), but requires Flutter (skill 3)
    // In demo seed, Project 2 members: Jane (Designer), Nusrat (Full-Stack), Tanvir (Product) - none have Flutter.
    const task = await taskService.createTask(
      {
        title: 'Impossible task',
        projectId: 2,
        priority: 'MEDIUM',
        estimatedHours: 4,
        deadline,
        requiredSkills: [{ skillId: 3, minProficiencyLevel: 'EXPERT' }]
      },
      adminUser
    );

    // Set auto_assign_at in the past
    const pastTime = toSqlDateTime(new Date(Date.now() - 5000));
    await taskRepository.setAutoAssignAt(task.id, pastTime);

    const results = await taskService.processDueAutoAssignments();
    expect(results.length).toBe(0);

    const updatedTask = await taskRepository.getTaskById(task.id);
    expect(updatedTask.status).toBe('PENDING');
    expect(updatedTask.assigned_employee_id).toBeNull();
    expect(updatedTask.auto_assign_at).toBeNull(); // Cleared so it doesn't loop forever

    const history = await taskRepository.getHistory(task.id);
    const failLog = history.find((h) => h.action === 'AUTO_ASSIGN_FAILED');
    expect(failLog).toBeDefined();
  });
});
