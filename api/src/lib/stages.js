// Pipeline stages and the ONLY moves allowed between them.
// The API enforces it, and the UI shows the moves it allows on each card.

export const STAGES = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'];

export const STAGE_TRANSITIONS = {
  APPLIED: ['SCREENING', 'REJECTED'],
  SCREENING: ['INTERVIEW', 'REJECTED'],
  INTERVIEW: ['OFFER', 'REJECTED'],
  OFFER: ['HIRED', 'REJECTED'],
  HIRED: [],
  REJECTED: [],
};

export const STAGE_LABELS = {
  APPLIED: 'Applied',
  SCREENING: 'Screening',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
};

export function allowedNextStages(from) {
  return [...STAGE_TRANSITIONS[from]];
}

export function canTransition(from, to) {
  return STAGE_TRANSITIONS[from].includes(to);
}

export function isFinal(stage) {
  return STAGE_TRANSITIONS[stage].length === 0;
}

// Plain-English reason a move isn't allowed (sent back to the UI).
export function transitionError(from, to) {
  const fromLabel = STAGE_LABELS[from];
  if (from === to) return `The application is already in ${fromLabel}.`;
  if (isFinal(from)) return `Can't move from ${fromLabel} to ${STAGE_LABELS[to]}: ${fromLabel} is a final stage.`;
  const allowed = STAGE_TRANSITIONS[from].map((s) => STAGE_LABELS[s]).join(' or ');
  return `Can't move from ${fromLabel} to ${STAGE_LABELS[to]}. From ${fromLabel} the next stage can only be ${allowed}.`;
}

// The AI assistant may only make this one move: Applied -> Screening (the
// first step, which is what auto-scoring proposes). Every other move, including
// later stages and rejections, must be done by the recruiter with the card
// buttons. Checked in code, so it holds whatever the AI decides.
export const COPILOT_FROM_STAGE = 'APPLIED';
export const COPILOT_TO_STAGE = 'SCREENING';

export function copilotCanMove(from, to) {
  return from === COPILOT_FROM_STAGE && to === COPILOT_TO_STAGE;
}

export const COPILOT_MOVE_REFUSAL =
  'The assistant can only move candidates from Applied to Screening. Any other move (later stages or rejecting) must be done by the recruiter with the buttons on the candidate\'s card.';
