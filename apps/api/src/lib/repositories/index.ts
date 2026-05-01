import type { Env } from "../../index";
import { createAgentStateRepository } from "./agentStateRepository";
import { createAgentsRepository } from "./agentsRepository";
import { createAgentEvaluationsRepository } from "./agentEvaluationsRepository";
import { createAgentForecastsRepository } from "./agentForecastsRepository";
import { createEventsRepository } from "./eventsRepository";
import { createForecastOutcomesRepository } from "./forecastOutcomesRepository";
import { createMarketCasesRepository } from "./marketCasesRepository";
import { createMarketSnapshotsRepository } from "./marketSnapshotsRepository";
import { createMemoryUpdatesRepository } from "./memoryUpdatesRepository";
import { createMessagesRepository } from "./messagesRepository";
import { createRoomCoverageRepository } from "./roomCoverageRepository";
import { createKnowledgeProcessingJobsRepository } from "./knowledgeProcessingJobsRepository";
import { createMessageReactionsRepository } from "./messageReactionsRepository";
import { createMarketQuestionMessagesRepository } from "./marketQuestionMessagesRepository";
import { createMarketQuestionThreadsRepository } from "./marketQuestionThreadsRepository";
import { createThesesRepository } from "./thesesRepository";
import { createTrainingExamplesRepository } from "./trainingExamplesRepository";
import { createDecisionLogRepository } from "./decisionLogRepository";
import { createFetchedNewsRepository } from "./fetchedNewsRepository";
import { createUsersRepository } from "./usersRepository";
import { createMemberCommentsRepository } from "./memberCommentsRepository";

export function createRepositories(env: Env) {
  return {
    decisionLog: createDecisionLogRepository(env),
    fetchedNews: createFetchedNewsRepository(env),
    agentState: createAgentStateRepository(env),
    agents: createAgentsRepository(env),
    agentEvaluations: createAgentEvaluationsRepository(env),
    agentForecasts: createAgentForecastsRepository(env),
    forecastOutcomes: createForecastOutcomesRepository(env),
    marketSnapshots: createMarketSnapshotsRepository(env),
    marketCases: createMarketCasesRepository(env),
    messageReactions: createMessageReactionsRepository(env),
    marketQuestionThreads: createMarketQuestionThreadsRepository(env),
    marketQuestionMessages: createMarketQuestionMessagesRepository(env),
    knowledgeProcessingJobs: createKnowledgeProcessingJobsRepository(env),
    theses: createThesesRepository(env),
    events: createEventsRepository(env),
    messages: createMessagesRepository(env),
    roomCoverage: createRoomCoverageRepository(env),
    memoryUpdates: createMemoryUpdatesRepository(env),
    trainingExamples: createTrainingExamplesRepository(env),
    users: createUsersRepository(env),
    memberComments: createMemberCommentsRepository(env)
  };
}
