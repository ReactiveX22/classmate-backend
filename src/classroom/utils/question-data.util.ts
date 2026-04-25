import {
  ApplicationBadRequestException,
  ApplicationForbiddenException,
} from 'src/common/exceptions/application.exception';
import { QuestionData } from 'src/database/schema';

type PollOption = Extract<QuestionData, { mode: 'poll' }>['options'][number];
type PollVote = Extract<QuestionData, { mode: 'poll' }>['votes'][number];

export type PollViewer = {
  id: string;
  name: string | null;
  image: string | null;
};

export type EnrichedQuestionData =
  | {
      mode: 'short_answer';
    }
  | {
      mode: 'poll';
      selectionMode: 'single' | 'multiple';
      options: PollOption[];
      votes: PollVote[];
      viewerVoteOptionIds: string[];
      totalVotes: number;
      results: Array<{
        optionId: string;
        voteCount: number;
        percentage: number;
        voters?: PollViewer[];
      }>;
      canViewVoters: boolean;
    };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizePollOption(option: unknown, index: number): PollOption {
  if (!isObject(option)) {
    throw new ApplicationBadRequestException('Poll options must be objects');
  }

  const id = typeof option.id === 'string' ? option.id.trim() : '';
  const text = typeof option.text === 'string' ? option.text.trim() : '';

  if (!id) {
    throw new ApplicationBadRequestException('Poll option id is required');
  }

  if (!text) {
    throw new ApplicationBadRequestException('Poll options cannot be empty');
  }

  return {
    id,
    text,
    position: index,
  };
}

function normalizePollVotes(value: unknown): PollVote[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isObject)
    .map((vote) => {
      const userId = typeof vote.userId === 'string' ? vote.userId.trim() : '';
      const optionIds = Array.isArray(vote.optionIds)
        ? vote.optionIds
            .filter(
              (optionId): optionId is string => typeof optionId === 'string',
            )
            .map((optionId) => optionId.trim())
            .filter(Boolean)
        : [];
      const votedAt =
        typeof vote.votedAt === 'string' && vote.votedAt
          ? vote.votedAt
          : new Date().toISOString();

      return {
        userId,
        optionIds: Array.from(new Set(optionIds)),
        votedAt,
      };
    })
    .filter((vote) => vote.userId && vote.optionIds.length > 0);
}

export function getDefaultQuestionData(): Extract<
  QuestionData,
  { mode: 'short_answer' }
> {
  return { mode: 'short_answer' };
}

export function isPollQuestionData(
  questionData: QuestionData | null | undefined,
): questionData is Extract<QuestionData, { mode: 'poll' }> {
  return questionData?.mode === 'poll';
}

export function normalizeQuestionDataInput(
  type: string,
  rawQuestionData: unknown,
  existingQuestionData?: QuestionData | null,
): QuestionData | undefined {
  if (type !== 'question') {
    return undefined;
  }

  if (!rawQuestionData) {
    return existingQuestionData ?? getDefaultQuestionData();
  }

  if (!isObject(rawQuestionData)) {
    throw new ApplicationBadRequestException('Invalid question data');
  }

  const mode = rawQuestionData.mode;
  if (mode === undefined || mode === 'short_answer') {
    return getDefaultQuestionData();
  }

  if (mode !== 'poll') {
    throw new ApplicationBadRequestException('Invalid question mode');
  }

  const selectionMode = rawQuestionData.selectionMode;
  if (selectionMode !== 'single' && selectionMode !== 'multiple') {
    throw new ApplicationBadRequestException('Invalid poll selection mode');
  }

  const options = Array.isArray(rawQuestionData.options)
    ? rawQuestionData.options.map(normalizePollOption)
    : [];

  if (options.length < 2) {
    throw new ApplicationBadRequestException(
      'Polls must have at least 2 options',
    );
  }

  const optionIds = options.map((option) => option.id);
  if (new Set(optionIds).size !== optionIds.length) {
    throw new ApplicationBadRequestException('Poll option ids must be unique');
  }

  const existingVotes =
    existingQuestionData?.mode === 'poll' ? existingQuestionData.votes : [];

  return {
    mode: 'poll',
    selectionMode,
    options,
    votes: normalizePollVotes(rawQuestionData.votes ?? existingVotes),
  };
}

export function assertPollStructureEditable(
  existingQuestionData: QuestionData | null | undefined,
  nextQuestionData: QuestionData | undefined,
) {
  if (!isPollQuestionData(existingQuestionData)) return;
  if (existingQuestionData.votes.length === 0) return;
  if (!nextQuestionData || nextQuestionData.mode !== 'poll') {
    throw new ApplicationForbiddenException(
      'This poll cannot be converted after votes have been cast',
    );
  }

  if (existingQuestionData.selectionMode !== nextQuestionData.selectionMode) {
    throw new ApplicationForbiddenException(
      'Poll selection mode cannot be changed after votes have been cast',
    );
  }

  if (existingQuestionData.options.length !== nextQuestionData.options.length) {
    throw new ApplicationForbiddenException(
      'Poll options cannot be added or removed after votes have been cast',
    );
  }

  const existingOptions = new Map(
    existingQuestionData.options.map((option) => [option.id, option.text]),
  );

  for (const option of nextQuestionData.options) {
    if (!existingOptions.has(option.id)) {
      throw new ApplicationForbiddenException(
        'Poll options cannot be changed after votes have been cast',
      );
    }

    if (existingOptions.get(option.id) !== option.text) {
      throw new ApplicationForbiddenException(
        'Poll options cannot be edited after votes have been cast',
      );
    }
  }
}

export function buildPollVote(
  questionData: QuestionData | null | undefined,
  optionIds: string[],
  userId: string,
): Extract<QuestionData, { mode: 'poll' }> {
  if (!isPollQuestionData(questionData)) {
    throw new ApplicationBadRequestException('This question is not a poll');
  }

  const normalizedOptionIds = Array.from(
    new Set(optionIds.map((optionId) => optionId.trim()).filter(Boolean)),
  );

  if (normalizedOptionIds.length === 0) {
    throw new ApplicationBadRequestException(
      'At least one poll option must be selected',
    );
  }

  if (
    questionData.selectionMode === 'single' &&
    normalizedOptionIds.length !== 1
  ) {
    throw new ApplicationBadRequestException(
      'Single choice polls only allow one option',
    );
  }

  const validOptionIds = new Set(
    questionData.options.map((option) => option.id),
  );
  if (normalizedOptionIds.some((optionId) => !validOptionIds.has(optionId))) {
    throw new ApplicationBadRequestException('Invalid poll option selection');
  }

  const nextVotes = questionData.votes.filter((vote) => vote.userId !== userId);
  nextVotes.push({
    userId,
    optionIds: normalizedOptionIds,
    votedAt: new Date().toISOString(),
  });

  return {
    ...questionData,
    votes: nextVotes,
  };
}

export function enrichQuestionData(
  questionData: QuestionData | null | undefined,
  viewerId: string,
  canViewVoters: boolean,
  viewersById: Map<string, PollViewer>,
): EnrichedQuestionData {
  if (!isPollQuestionData(questionData)) {
    return getDefaultQuestionData();
  }

  const counts = new Map<string, number>();
  const votersByOption = new Map<string, PollViewer[]>();

  for (const option of questionData.options) {
    counts.set(option.id, 0);
    votersByOption.set(option.id, []);
  }

  for (const vote of questionData.votes) {
    const viewer = viewersById.get(vote.userId);

    for (const optionId of vote.optionIds) {
      counts.set(optionId, (counts.get(optionId) ?? 0) + 1);

      if (canViewVoters && viewer) {
        votersByOption.get(optionId)?.push(viewer);
      }
    }
  }

  const viewerVoteOptionIds =
    questionData.votes.find((vote) => vote.userId === viewerId)?.optionIds ??
    [];
  const totalVotes = questionData.votes.length;

  return {
    ...questionData,
    viewerVoteOptionIds,
    totalVotes,
    canViewVoters,
    results: questionData.options.map((option) => {
      const voteCount = counts.get(option.id) ?? 0;
      const percentage =
        totalVotes === 0 ? 0 : Math.round((voteCount / totalVotes) * 100);

      return {
        optionId: option.id,
        voteCount,
        percentage,
        ...(canViewVoters
          ? { voters: votersByOption.get(option.id) ?? [] }
          : {}),
      };
    }),
  };
}

export function collectPollVoterIds(
  posts: Array<{ questionData?: QuestionData | null }>,
): string[] {
  const voterIds = new Set<string>();

  for (const post of posts) {
    if (!isPollQuestionData(post.questionData)) continue;
    for (const vote of post.questionData.votes) {
      voterIds.add(vote.userId);
    }
  }

  return Array.from(voterIds);
}
