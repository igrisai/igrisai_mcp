import { CronJob } from './types/deadHand.js';

export class CronScheduler {
  private jobs: Map<string, CronJob> = new Map();
  private scheduledTasks: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Schedule a dead hand check for a user
   */
  scheduleDeadHandCheck(
    userAddress: string,
    timeoutSeconds: number,
    callback: (userAddress: string) => Promise<void>
  ): string {
    const jobId = `deadhand_${userAddress}_${Date.now()}`;
    const scheduledAt = new Date(Date.now() + timeoutSeconds * 1000);

    // Create cron job entry
    const job: CronJob = {
      id: jobId,
      userAddress,
      scheduledAt,
      timeoutSeconds,
      isExecuted: false
    };

    this.jobs.set(jobId, job);

    // Schedule the task to run once after timeoutSeconds
    const timeoutId = setTimeout(async () => {
      try {
        console.log(`Executing dead hand check for ${userAddress}`);
        await callback(userAddress);
        
        // Mark as executed and clean up
        job.isExecuted = true;
        this.cleanupJob(jobId);
      } catch (error) {
        console.error(`Error executing dead hand check for ${userAddress}:`, error);
        // Still clean up on error to prevent memory leaks
        job.isExecuted = true;
        this.cleanupJob(jobId);
      }
    }, timeoutSeconds * 1000);

    // Store the timeout ID instead of cron task
    this.scheduledTasks.set(jobId, timeoutId);

    console.log(`Scheduled dead hand check for ${userAddress} in ${timeoutSeconds} seconds (Job ID: ${jobId})`);
    return jobId;
  }

  /**
   * Cancel a scheduled dead hand check
   */
  cancelDeadHandCheck(jobId: string): boolean {
    const timeoutId = this.scheduledTasks.get(jobId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.scheduledTasks.delete(jobId);
      this.jobs.delete(jobId);
      console.log(`Cancelled dead hand check job: ${jobId}`);
      return true;
    }
    return false;
  }

  /**
   * Get all active jobs
   */
  getActiveJobs(): CronJob[] {
    return Array.from(this.jobs.values()).filter(job => !job.isExecuted);
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): CronJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get job by user address
   */
  getJobByUserAddress(userAddress: string): CronJob | undefined {
    return Array.from(this.jobs.values()).find(job => 
      job.userAddress === userAddress && !job.isExecuted
    );
  }

  /**
   * Clean up completed jobs
   */
  private cleanupJob(jobId: string): void {
    const timeoutId = this.scheduledTasks.get(jobId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.scheduledTasks.delete(jobId);
    }
    this.jobs.delete(jobId);
  }

  /**
   * Clean up all jobs
   */
  cleanupAllJobs(): void {
    this.scheduledTasks.forEach(timeoutId => clearTimeout(timeoutId));
    this.scheduledTasks.clear();
    this.jobs.clear();
    console.log('All cron jobs cleaned up');
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    totalJobs: number;
    activeJobs: number;
    completedJobs: number;
  } {
    const totalJobs = this.jobs.size;
    const activeJobs = Array.from(this.jobs.values()).filter(job => !job.isExecuted).length;
    const completedJobs = totalJobs - activeJobs;

    return {
      totalJobs,
      activeJobs,
      completedJobs
    };
  }
}
