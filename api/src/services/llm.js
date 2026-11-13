// The one place the backend talks to the LLM (Groq).
import Groq, { APIConnectionError, APIError, AuthenticationError, PermissionDeniedError, RateLimitError } from 'groq-sdk';
import { HttpError } from '../lib/errors.js';

const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

let client;
function getClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new HttpError(503, 'AI_NOT_CONFIGURED', 'The AI features need GROQ_API_KEY to be set on the server.');
  }
  client ??= new Groq({ apiKey: process.env.GROQ_API_KEY });
  return client;
}

// Turn SDK errors into clear API errors the UI can show.
function toHttpError(err) {
  if (err instanceof AuthenticationError || err instanceof PermissionDeniedError) {
    return new HttpError(503, 'AI_NOT_CONFIGURED', 'The AI service rejected our key. Check GROQ_API_KEY.');
  }
  if (err instanceof RateLimitError) {
    return new HttpError(503, 'AI_BUSY', 'The AI service is busy right now. Please try again in a moment.');
  }
  if (err instanceof APIConnectionError) {
    return new HttpError(503, 'AI_UNAVAILABLE', "Couldn't reach the AI service. Please try again.");
  }
  if (err instanceof APIError) {
    return new HttpError(502, 'AI_ERROR', 'The AI service returned an error. Please try again.');
  }
  return err;
}

// One chat completion. Returns the assistant message ({ content, tool_calls }).
export async function chat(params) {
  try {
    const response = await getClient().chat.completions.create({ model: MODEL, temperature: 0, ...params });
    return response.choices[0].message;
  } catch (err) {
    throw toHttpError(err);
  }
}
