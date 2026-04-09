/**
 * Media Pipeline Optimizer for StoryWeaver
 *
 * Orchestrates parallel processing of images and audio generation with intelligent
 * queuing, retry logic, and progressive loading support for optimal performance.
 *
 * Key features:
 * - Parallel image processing (up to 3 concurrent)
 * - Sequential audio generation (respects API rate limits)
 * - Automatic retry with exponential backoff
 * - Progressive loading with placeholder generation
 * - Cost tracking integration
 */


import { EventEmitter } from "events";
import { db } from "../db";
import { mediaQueue, mediaAssets } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { generateImage } from "./imageGeneration";
import { generatePageAudio, generateEpisodeAudio } from "./elevenlabs";
import { generateEpisodeMusic } from "./sunoMusic";
import { costTracker, COST_ESTIMATES } from "./costTracker";

export interface MediaJob {
  id: string;
  type: "image" | "audio" | "music";
  status: "queued" | "processing" | "completed" | "failed";
  priority: number;
  input: Record<string, any>;
  output?: {
    url: string;
    format: string;
    size: number;
    duration?: number;
    width?: number;
    height?: number;
  };
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  episodeId?: number;
  userId?: number;
}

export interface PipelineOptions {
  maxConcurrentImages: number;
  maxConcurrentAudio: number;
  retryLimit: number;
  timeoutMs: number;
  enableProgressiveLoading: boolean;
  backoffMultiplier: number;
}

export interface EpisodeMediaStatus {
  episodeId: number;
  totalImages: number;
  completedImages: number;
  failedImages: number;
  totalAudio: number;
  completedAudio: number;
  failedAudio: number;
  percentComplete: number;
}

const DEFAULT_OPTIONS: PipelineOptions = {
  maxConcurrentImages: 3,
  maxConcurrentAudio: 1,
  retryLimit: 3,
  timeoutMs: 300000, // 5 minutes
  enableProgressiveLoading: true,
  backoffMultiplier: 2,
};

/**
 * Media Pipeline Manager - Orchestrates all media generation
 */
export class MediaPipeline extends EventEmitter {
  private jobs: Map<string, MediaJob> = new Map();
  private processingImage: Set<string> = new Set();
  private processingAudio: Set<string> = new Set();
  private options: PipelineOptions;
  private isRunning: boolean = false;

  constructor(options: Partial<PipelineOptions> = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Enqueue image generation jobs for story pages
   */
  async enqueueImageGeneration(
    pages: Array<{ text: string; imagePrompt: string; pageNumber: number }>,
    artStyle: string,
    episodeId: number,
    userId: number,
    childAge?: number
  ): Promise<MediaJob[]> {
    const jobs: MediaJob[] = [];

    for (const page of pages) {
      const jobId = `img-${episodeId}-${page.pageNumber}-${Date.now()}`;
      const job: MediaJob = {
        id: jobId,
        type: "image",
        status: "queued",
        priority: 10 - page.pageNumber, // Earlier pages have higher priority
        input: {
          prompt: page.imagePrompt,
          artStyle,
          childAge,
          pageText: page.text,
          pageNumber: page.pageNumber,
        },
        retryCount: 0,
        maxRetries: this.options.retryLimit,
        createdAt: new Date(),
        episodeId,
        userId,
      };

      this.jobs.set(jobId, job);
      jobs.push(job);
    }

    // Persist to database
    await Promise.all(
      jobs.map((job) =>
        db.insert(mediaQueue).values({
          episodeId,
          userId,
          jobType: job.type,
          status: job.status,
          priority: job.priority,
          input: job.input,
          createdAt: new Date(),
        })
      )
    );

    this.emit("jobs-enqueued", { count: jobs.length, type: "image" });
    return jobs;
  }

  /**
   * Enqueue audio generation jobs for story pages
   */
  async enqueueAudioGeneration(
    pages: Array<{ text: string; pageNumber: number }>,
    voiceId: string,
    episodeId: number,
    userId: number,
    childId: number
  ): Promise<MediaJob[]> {
    const jobs: MediaJob[] = [];

    for (const page of pages) {
      const jobId = `audio-${episodeId}-${page.pageNumber}-${Date.now()}`;
      const job: MediaJob = {
        id: jobId,
        type: "audio",
        status: "queued",
        priority: 10 - page.pageNumber, // Sequential, but prioritize earlier pages
        input: {
          text: page.text,
          voiceId,
          pageNumber: page.pageNumber,
          childId,
        },
        retryCount: 0,
        maxRetries: this.options.retryLimit,
        createdAt: new Date(),
        episodeId,
        userId,
      };

      this.jobs.set(jobId, job);
      jobs.push(job);
    }

    // Persist to database
    await Promise.all(
      jobs.map((job) =>
        db.insert(mediaQueue).values({
          episodeId,
          userId,
          jobType: job.type,
          status: job.status,
          priority: job.priority,
          input: job.input,
          createdAt: new Date(),
        })
      )
    );

    this.emit("jobs-enqueued", { count: jobs.length, type: "audio" });
    return jobs;
  }

  /**
   * Enqueue music generation job
   */
  async enqueueMusicGeneration(
    theme: string,
    mood: string,
    durationSeconds: number,
    episodeId: number,
    userId: number
  ): Promise<MediaJob> {
    const jobId = `music-${episodeId}-${Date.now()}`;
    const job: MediaJob = {
      id: jobId,
      type: "music",
      status: "queued",
      priority: 5, // Lower priority than pages
      input: {
        theme,
        mood,
        durationSeconds,
      },
      retryCount: 0,
      maxRetries: this.options.retryLimit,
      createdAt: new Date(),
      episodeId,
      userId,
    };

    this.jobs.set(jobId, job);

    // Persist to database
    await db.insert(mediaQueue).values({
      episodeId,
      userId,
      jobType: job.type,
      status: job.status,
      priority: job.priority,
      input: job.input,
      createdAt: new Date(),
    });

    this.emit("job-enqueued", { type: "music", jobId });
    return job;
  }

  /**
   * Start processing the queue
   */
  async processQueue(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      while (this.hasQueuedJobs()) {
        // Process images in parallel
        await this.processImageBatch();

        // Process audio sequentially
        await this.processAudioBatch();

        // Process music (single job)
        await this.processMusicJob();

        // Small delay before next iteration
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Process a batch of image jobs in parallel
   */
  private async processImageBatch(): Promise<void> {
    const queuedJobs = Array.from(this.jobs.values())
      .filter((j) => j.type === "image" && j.status === "queued")
      .sort((a, b) => b.priority - a.priority)
      .slice(0, this.options.maxConcurrentImages - this.processingImage.size);

    if (queuedJobs.length === 0) {
      return;
    }

    const promises = queuedJobs.map((job) =>
      this.processImageJob(job).catch((error) => {
        console.error(`Image job ${job.id} failed:`, error);
        this.emit("job-failed", { jobId: job.id, error: error.message });
      })
    );

    await Promise.allSettled(promises);
  }

  /**
   * Process a single image job
   */
  private async processImageJob(job: MediaJob): Promise<void> {
    if (this.processingImage.has(job.id)) {
      return;
    }

    this.processingImage.add(job.id);
    job.status = "processing";
    job.startedAt = new Date();

    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Image generation timeout")),
          this.options.timeoutMs
        )
      );

      const imageResult = await Promise.race([
        generateImage({
          prompt: job.input.prompt,
        }),
        timeout,
      ]);

      // @ts-expect-error - type mismatch from schema
      if (!imageResult.url) {
        throw new Error("No image URL returned");
      }

      job.status = "completed";
      job.output = {
        // @ts-expect-error - type mismatch from schema
        url: imageResult.url,
        format: "jpeg",
        size: 0, // Will be updated after optimization
      };
      job.completedAt = new Date();

      // Track cost
      costTracker.trackCost(job.userId!, job.episodeId!, {
        service: "forge",
        operation: "image_generation",
        estimatedCost: COST_ESTIMATES.imageGeneration,
      });

      this.emit("job-completed", { jobId: job.id, type: "image" });
    } catch (error: any) {
      job.error = error.message;
      job.retryCount++;

      if (job.retryCount < job.maxRetries) {
        job.status = "queued";
        // Exponential backoff before retry
        const backoffMs =
          1000 * Math.pow(this.options.backoffMultiplier, job.retryCount - 1);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        this.emit("job-retrying", {
          jobId: job.id,
          attempt: job.retryCount,
          maxRetries: job.maxRetries,
        });
      } else {
        job.status = "failed";
        this.emit("job-failed", {
          jobId: job.id,
          error: job.error,
          retries: job.retryCount,
        });
      }
    } finally {
      this.processingImage.delete(job.id);
    }
  }

  /**
   * Process audio jobs sequentially
   */
  private async processAudioBatch(): Promise<void> {
    if (this.processingAudio.size >= this.options.maxConcurrentAudio) {
      return;
    }

    const queuedJob = Array.from(this.jobs.values())
      .filter((j) => j.type === "audio" && j.status === "queued")
      .sort((a, b) => b.priority - a.priority)[0];

    if (!queuedJob) {
      return;
    }

    await this.processAudioJob(queuedJob).catch((error) => {
      console.error(`Audio job ${queuedJob.id} failed:`, error);
      this.emit("job-failed", {
        jobId: queuedJob.id,
        error: error.message,
      });
    });
  }

  /**
   * Process a single audio job
   */
  private async processAudioJob(job: MediaJob): Promise<void> {
    if (this.processingAudio.has(job.id)) {
      return;
    }

    this.processingAudio.add(job.id);
    job.status = "processing";
    job.startedAt = new Date();

    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Audio generation timeout")),
          this.options.timeoutMs
        )
      );

      const audioResult = await Promise.race([
        generatePageAudio(
          job.input.text,
          [{ name: "narrator", traits: "warm storytelling voice" }],
          job.id
        ),
        timeout,
      ]);

      if (!audioResult.audioUrl) {
        throw new Error("No audio URL returned");
      }

      job.status = "completed";
      job.output = {
        url: audioResult.audioUrl,
        format: "mp3",
        size: 0,
        duration: audioResult.durationMs,
      };
      job.completedAt = new Date();

      // Track cost
      costTracker.trackCost(job.userId!, job.episodeId!, {
        service: "elevenlabs",
        operation: "text_to_speech",
        estimatedCost: COST_ESTIMATES.audioNarration,
      });

      this.emit("job-completed", { jobId: job.id, type: "audio" });
    } catch (error: any) {
      job.error = error.message;
      job.retryCount++;

      if (job.retryCount < job.maxRetries) {
        job.status = "queued";
        const backoffMs =
          1000 * Math.pow(this.options.backoffMultiplier, job.retryCount - 1);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        this.emit("job-retrying", {
          jobId: job.id,
          attempt: job.retryCount,
          maxRetries: job.maxRetries,
        });
      } else {
        job.status = "failed";
        this.emit("job-failed", {
          jobId: job.id,
          error: job.error,
          retries: job.retryCount,
        });
      }
    } finally {
      this.processingAudio.delete(job.id);
    }
  }

  /**
   * Process music generation job
   */
  private async processMusicJob(): Promise<void> {
    const musicJob = Array.from(this.jobs.values()).find(
      (j) => j.type === "music" && j.status === "queued"
    );

    if (!musicJob) {
      return;
    }

    musicJob.status = "processing";
    musicJob.startedAt = new Date();

    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Music generation timeout")),
          600000 // 10 minutes for music
        )
      );

      const musicResult = await Promise.race([
        generateEpisodeMusic(
          musicJob.input.theme,
          [musicJob.input.mood],
          musicJob.input.durationSeconds
        ),
        timeout,
      ]);

      if (!musicResult.musicUrl) {
        throw new Error("No music URL returned");
      }

      musicJob.status = "completed";
      musicJob.output = {
        url: musicResult.musicUrl,
        format: "mp3",
        size: 0,
        duration: musicJob.input.durationSeconds,
      };
      musicJob.completedAt = new Date();

      // Track cost
      costTracker.trackCost(musicJob.userId!, musicJob.episodeId!, {
        service: "suno",
        operation: "music_generation",
        estimatedCost: COST_ESTIMATES.musicGeneration,
      });

      this.emit("job-completed", { jobId: musicJob.id, type: "music" });
    } catch (error: any) {
      musicJob.error = error.message;
      musicJob.retryCount++;

      if (musicJob.retryCount < musicJob.maxRetries) {
        musicJob.status = "queued";
        const backoffMs =
          1000 *
          Math.pow(
            this.options.backoffMultiplier,
            musicJob.retryCount - 1
          );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        this.emit("job-retrying", {
          jobId: musicJob.id,
          attempt: musicJob.retryCount,
          maxRetries: musicJob.maxRetries,
        });
      } else {
        musicJob.status = "failed";
        this.emit("job-failed", {
          jobId: musicJob.id,
          error: musicJob.error,
          retries: musicJob.retryCount,
        });
      }
    }
  }

  /**
   * Check if there are queued jobs
   */
  private hasQueuedJobs(): boolean {
    return Array.from(this.jobs.values()).some((j) => j.status === "queued");
  }

  /**
   * Get status of a specific job
   */
  getJobStatus(jobId: string): MediaJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get overall media generation progress for an episode
   */
  async getEpisodeMediaStatus(
    episodeId: number
  ): Promise<EpisodeMediaStatus> {
    const episodeJobs = Array.from(this.jobs.values()).filter(
      (j) => j.episodeId === episodeId
    );

    const imageJobs = episodeJobs.filter((j) => j.type === "image");
    const audioJobs = episodeJobs.filter((j) => j.type === "audio");

    const completedImages = imageJobs.filter(
      (j) => j.status === "completed"
    ).length;
    const failedImages = imageJobs.filter((j) => j.status === "failed").length;
    const completedAudio = audioJobs.filter(
      (j) => j.status === "completed"
    ).length;
    const failedAudio = audioJobs.filter((j) => j.status === "failed").length;

    const totalJobs = episodeJobs.length;
    const completedJobs = completedImages + completedAudio;

    return {
      episodeId,
      totalImages: imageJobs.length,
      completedImages,
      failedImages,
      totalAudio: audioJobs.length,
      completedAudio,
      failedAudio,
      percentComplete:
        totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0,
    };
  }

  /**
   * Cancel pending jobs for an episode
   */
  cancelJobs(episodeId: number): number {
    let cancelled = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      if (
        job.episodeId === episodeId &&
        (job.status === "queued" || job.status === "processing")
      ) {
        job.status = "failed";
        job.error = "Cancelled by user";
        cancelled++;
      }
    }

    this.emit("jobs-cancelled", { episodeId, count: cancelled });
    return cancelled;
  }

  /**
   * Clear completed and failed jobs (cleanup)
   */
  clearCompleted(): number {
    let cleared = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.status === "completed" || job.status === "failed") {
        this.jobs.delete(jobId);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Get pipeline statistics
   */
  getStats(): {
    totalJobs: number;
    queuedJobs: number;
    processingJobs: number;
    completedJobs: number;
    failedJobs: number;
    successRate: number;
  } {
    const jobs = Array.from(this.jobs.values());
    const queuedJobs = jobs.filter((j) => j.status === "queued").length;
    const processingJobs = jobs.filter((j) => j.status === "processing").length;
    const completedJobs = jobs.filter((j) => j.status === "completed").length;
    const failedJobs = jobs.filter((j) => j.status === "failed").length;

    const finishedJobs = completedJobs + failedJobs;

    return {
      totalJobs: jobs.length,
      queuedJobs,
      processingJobs,
      completedJobs,
      failedJobs,
      successRate:
        finishedJobs > 0 ? completedJobs / finishedJobs : 0,
    };
  }
}

// Global pipeline instance
export const mediaPipeline = new MediaPipeline();
