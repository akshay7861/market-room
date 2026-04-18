import type {
  CreateMarketCaseInput,
  KnowledgeCategory,
  KnowledgeProcessingJob,
  KnowledgeProcessingJobItem,
  KnowledgeProcessingReviewStatus
} from "@market-room/shared";
import type { Env } from "../../index";

type KnowledgeProcessingJobRow = Omit<KnowledgeProcessingJob, "items">;
type KnowledgeProcessingJobItemRow = Omit<KnowledgeProcessingJobItem, "marketCases"> & {
  marketCasesJson: string | null;
};
type ApprovedKnowledgeDocumentRow = {
  id: string;
  jobId: string;
  sourceFilename: string;
  processedFilename: string | null;
  title: string | null;
  summary: string | null;
  category: KnowledgeCategory;
  distilledMarkdown: string;
  reviewNotes: string | null;
  persistedAt: string | null;
  createdAt: string;
};

export function createKnowledgeProcessingJobsRepository(env: Env) {
  return {
    async createJob(input: {
      id: string;
      agentId: string;
      category: KnowledgeCategory;
      processingModel: string;
      totalFiles: number;
      createdAt: string;
      items: Array<{ id: string; sourceFilename: string; createdAt: string }>;
    }): Promise<void> {
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO knowledge_processing_jobs
            (id, agent_id, category, status, processing_model, total_files, processed_files, completed_files, failed_files, created_at)
           VALUES (?, ?, ?, 'queued', ?, ?, 0, 0, 0, ?)`
        ).bind(input.id, input.agentId, input.category, input.processingModel, input.totalFiles, input.createdAt),
        ...input.items.map((item) =>
          env.DB.prepare(
          `INSERT INTO knowledge_processing_job_items
              (id, job_id, source_filename, status, market_case_count, review_status, created_at, updated_at)
             VALUES (?, ?, ?, 'pending', 0, NULL, ?, ?)`
          ).bind(item.id, input.id, item.sourceFilename, item.createdAt, item.createdAt)
        )
      ]);
    },

    async getJob(jobId: string): Promise<KnowledgeProcessingJob | null> {
      const job = await env.DB.prepare(
        `SELECT
          id,
          agent_id AS agentId,
          category,
          status,
          processing_model AS processingModel,
          total_files AS totalFiles,
          processed_files AS processedFiles,
          completed_files AS completedFiles,
          failed_files AS failedFiles,
          last_error AS lastError,
          created_at AS createdAt,
          started_at AS startedAt,
          completed_at AS completedAt
        FROM knowledge_processing_jobs
        WHERE id = ?
        LIMIT 1`
      ).bind(jobId).first<KnowledgeProcessingJobRow>();

      if (!job) {
        return null;
      }

      const items = await this.listItems(jobId);
      return { ...job, items };
    },

    async listByAgent(agentId: string, limit = 10): Promise<KnowledgeProcessingJob[]> {
      const result = await env.DB.prepare(
        `SELECT
          id,
          agent_id AS agentId,
          category,
          status,
          processing_model AS processingModel,
          total_files AS totalFiles,
          processed_files AS processedFiles,
          completed_files AS completedFiles,
          failed_files AS failedFiles,
          last_error AS lastError,
          created_at AS createdAt,
          started_at AS startedAt,
          completed_at AS completedAt
        FROM knowledge_processing_jobs
        WHERE agent_id = ?
        ORDER BY created_at DESC
        LIMIT ?`
      ).bind(agentId, limit).all<KnowledgeProcessingJobRow>();

      const jobs = result.results;
      return Promise.all(
        jobs.map(async (job) => ({
          ...job,
          items: await this.listItems(job.id)
        }))
      );
    },

    async listItems(jobId: string): Promise<KnowledgeProcessingJobItem[]> {
      const result = await env.DB.prepare(
        `SELECT
          id,
          job_id AS jobId,
          source_filename AS sourceFilename,
          status,
          processed_filename AS processedFilename,
          title,
          summary,
          market_case_count AS marketCaseCount,
          distilled_markdown AS distilledMarkdown,
          market_cases_json AS marketCasesJson,
          review_status AS reviewStatus,
          review_notes AS reviewNotes,
          reviewed_at AS reviewedAt,
          persisted_at AS persistedAt,
          error_message AS errorMessage,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM knowledge_processing_job_items
        WHERE job_id = ?
        ORDER BY created_at ASC`
      ).bind(jobId).all<KnowledgeProcessingJobItemRow>();

      return result.results.map(mapKnowledgeProcessingJobItemRow);
    },

    async listApprovedKnowledgeByAgent(
      agentId: string,
      limit = 24
    ): Promise<
      Array<{
        id: string;
        jobId: string;
        sourceFilename: string;
        processedFilename: string | null;
        title: string | null;
        summary: string | null;
        category: KnowledgeCategory;
        distilledMarkdown: string;
        reviewNotes: string | null;
        persistedAt: string | null;
        createdAt: string;
      }>
    > {
      const result = await env.DB.prepare(
        `SELECT
          items.id AS id,
          items.job_id AS jobId,
          items.source_filename AS sourceFilename,
          items.processed_filename AS processedFilename,
          items.title AS title,
          items.summary AS summary,
          jobs.category AS category,
          items.distilled_markdown AS distilledMarkdown,
          items.review_notes AS reviewNotes,
          items.persisted_at AS persistedAt,
          items.created_at AS createdAt
        FROM knowledge_processing_job_items AS items
        INNER JOIN knowledge_processing_jobs AS jobs
          ON jobs.id = items.job_id
        WHERE jobs.agent_id = ?
          AND items.status = 'completed'
          AND items.review_status = 'approved'
          AND items.distilled_markdown IS NOT NULL
        ORDER BY COALESCE(items.persisted_at, items.created_at) DESC
        LIMIT ?`
      ).bind(agentId, limit).all<ApprovedKnowledgeDocumentRow>();

      return result.results;
    },

    async listApprovedKnowledgeByIds(
      ids: string[]
    ): Promise<ApprovedKnowledgeDocumentRow[]> {
      if (ids.length === 0) {
        return [];
      }

      const placeholders = ids.map(() => "?").join(", ");
      const result = await env.DB.prepare(
        `SELECT
          items.id AS id,
          items.job_id AS jobId,
          items.source_filename AS sourceFilename,
          items.processed_filename AS processedFilename,
          items.title AS title,
          items.summary AS summary,
          jobs.category AS category,
          items.distilled_markdown AS distilledMarkdown,
          items.review_notes AS reviewNotes,
          items.persisted_at AS persistedAt,
          items.created_at AS createdAt
        FROM knowledge_processing_job_items AS items
        INNER JOIN knowledge_processing_jobs AS jobs
          ON jobs.id = items.job_id
        WHERE items.id IN (${placeholders})
          AND items.status = 'completed'
          AND items.review_status = 'approved'
          AND items.distilled_markdown IS NOT NULL`
      ).bind(...ids).all<ApprovedKnowledgeDocumentRow>();

      const byId = new Map(result.results.map((row) => [row.id, row]));
      return ids.map((id) => byId.get(id)).filter((row): row is ApprovedKnowledgeDocumentRow => Boolean(row));
    },

    async updateItemGovernance(
      agentId: string,
      itemId: string,
      reviewNotes: string | null,
      updatedAt: string
    ): Promise<boolean> {
      const result = await env.DB.prepare(
        `UPDATE knowledge_processing_job_items
         SET review_notes = ?,
             updated_at = ?
         WHERE id = ?
           AND job_id IN (
             SELECT id FROM knowledge_processing_jobs WHERE agent_id = ?
           )`
      ).bind(reviewNotes, updatedAt, itemId, agentId).run();

      return (result.meta.changes || 0) > 0;
    },

    async getItem(jobId: string, itemId: string): Promise<KnowledgeProcessingJobItem | null> {
      const row = await env.DB.prepare(
        `SELECT
          id,
          job_id AS jobId,
          source_filename AS sourceFilename,
          status,
          processed_filename AS processedFilename,
          title,
          summary,
          market_case_count AS marketCaseCount,
          distilled_markdown AS distilledMarkdown,
          market_cases_json AS marketCasesJson,
          review_status AS reviewStatus,
          review_notes AS reviewNotes,
          reviewed_at AS reviewedAt,
          persisted_at AS persistedAt,
          error_message AS errorMessage,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM knowledge_processing_job_items
        WHERE job_id = ? AND id = ?
        LIMIT 1`
      ).bind(jobId, itemId).first<KnowledgeProcessingJobItemRow>();

      return row ? mapKnowledgeProcessingJobItemRow(row) : null;
    },

    async markJobRunning(jobId: string, startedAt: string): Promise<void> {
      await env.DB.prepare(
        `UPDATE knowledge_processing_jobs
         SET status = 'running', started_at = ?
         WHERE id = ?`
      ).bind(startedAt, jobId).run();
    },

    async markJobCompleted(jobId: string, completedAt: string): Promise<void> {
      await env.DB.prepare(
        `UPDATE knowledge_processing_jobs
         SET status = 'completed', completed_at = ?
         WHERE id = ?`
      ).bind(completedAt, jobId).run();
    },

    async markJobFailed(jobId: string, message: string, completedAt: string): Promise<void> {
      await env.DB.prepare(
        `UPDATE knowledge_processing_jobs
         SET status = 'failed', last_error = ?, completed_at = ?
         WHERE id = ?`
      ).bind(message, completedAt, jobId).run();
    },

    async markItemRunning(jobId: string, itemId: string, updatedAt: string): Promise<void> {
      await env.DB.batch([
        env.DB.prepare(
          `UPDATE knowledge_processing_job_items
           SET status = 'running', updated_at = ?
           WHERE id = ? AND job_id = ?`
        ).bind(updatedAt, itemId, jobId),
        env.DB.prepare(
          `UPDATE knowledge_processing_jobs
           SET processed_files = processed_files
           WHERE id = ?`
        ).bind(jobId)
      ]);
    },

    async markItemCompleted(
      jobId: string,
      itemId: string,
      input: {
        processedFilename: string;
        title: string;
        summary: string;
        marketCaseCount: number;
        distilledMarkdown: string;
        marketCasesJson: string;
        updatedAt: string;
      }
    ): Promise<void> {
      await env.DB.batch([
        env.DB.prepare(
          `UPDATE knowledge_processing_job_items
           SET status = 'completed',
               processed_filename = ?,
               title = ?,
               summary = ?,
               market_case_count = ?,
               distilled_markdown = ?,
               market_cases_json = ?,
               review_status = 'pending',
               updated_at = ?
           WHERE id = ? AND job_id = ?`
        ).bind(
          input.processedFilename,
          input.title,
          input.summary,
          input.marketCaseCount,
          input.distilledMarkdown,
          input.marketCasesJson,
          input.updatedAt,
          itemId,
          jobId
        ),
        env.DB.prepare(
          `UPDATE knowledge_processing_jobs
           SET processed_files = processed_files + 1,
               completed_files = completed_files + 1
           WHERE id = ?`
        ).bind(jobId)
      ]);
    },

    async markItemFailed(jobId: string, itemId: string, message: string, updatedAt: string): Promise<void> {
      await env.DB.batch([
        env.DB.prepare(
          `UPDATE knowledge_processing_job_items
           SET status = 'failed',
               error_message = ?,
               updated_at = ?
           WHERE id = ? AND job_id = ?`
        ).bind(message, updatedAt, itemId, jobId),
        env.DB.prepare(
          `UPDATE knowledge_processing_jobs
           SET processed_files = processed_files + 1,
               failed_files = failed_files + 1,
               last_error = ?
           WHERE id = ?`
        ).bind(message, jobId)
      ]);
    },

    async markItemReviewed(
      jobId: string,
      itemId: string,
      input: {
        reviewStatus: KnowledgeProcessingReviewStatus;
        reviewNotes: string | null;
        reviewedAt: string;
        persistedAt?: string | null;
      }
    ): Promise<void> {
      await env.DB.prepare(
        `UPDATE knowledge_processing_job_items
         SET review_status = ?,
             review_notes = ?,
             reviewed_at = ?,
             persisted_at = ?,
             updated_at = ?
         WHERE id = ? AND job_id = ?`
      )
        .bind(
          input.reviewStatus,
          input.reviewNotes,
          input.reviewedAt,
          input.persistedAt || null,
          input.reviewedAt,
          itemId,
          jobId
        )
        .run();
    }
  };
}

function mapKnowledgeProcessingJobItemRow(row: KnowledgeProcessingJobItemRow): KnowledgeProcessingJobItem {
  return {
    id: row.id,
    jobId: row.jobId,
    sourceFilename: row.sourceFilename,
    status: row.status,
    processedFilename: row.processedFilename,
    title: row.title,
    summary: row.summary,
    marketCaseCount: row.marketCaseCount,
    distilledMarkdown: row.distilledMarkdown,
    reviewStatus: row.reviewStatus,
    reviewNotes: row.reviewNotes,
    reviewedAt: row.reviewedAt,
    persistedAt: row.persistedAt,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    marketCases: parseMarketCases(row.marketCasesJson)
  };
}

function parseMarketCases(value: string | null): CreateMarketCaseInput[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as CreateMarketCaseInput[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
