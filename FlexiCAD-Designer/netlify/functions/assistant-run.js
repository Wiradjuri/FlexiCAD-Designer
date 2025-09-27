/**
 * Assistant Run API - Creates threads, runs assistants, and polls for completion
 * Uses OpenAI Assistants API with File Search capability
 * 
 * Server-side function to keep API keys secure
 */

const OpenAI = require('openai');

// Logging utilities
const ts = () => new Date().toISOString();
const banner = (label) => console.log(`\n===== ${label} @ ${ts()} =====`);
const logKV = (k,v) => console.log(`[${ts()}] ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Poll run status until completion
 */
async function pollRunStatus(threadId, runId, maxWaitMs = 60000) {
  const startTime = Date.now();
  const pollInterval = 2000; // 2 seconds
  
  while (Date.now() - startTime < maxWaitMs) {
    const run = await openai.beta.threads.runs.retrieve(threadId, runId);
    logKV('run status', run.status);
    
    if (run.status === 'completed') {
      return { success: true, run };
    } else if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
      return { success: false, run, error: `Run ${run.status}: ${run.last_error?.message || 'Unknown error'}` };
    } else if (run.status === 'requires_action') {
      // Handle tool calls if needed
      logKV('requires_action', run.required_action);
      return { success: false, run, error: 'Run requires action - tool calls not implemented in this function' };
    }
    
    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  return { success: false, error: 'Timeout waiting for run completion' };
}

export const handler = async (event, context) => {
  banner('Assistant Run API Handler');
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    logKV('method', 'OPTIONS preflight');
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    logKV('method', `${event.httpMethod} not allowed`);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Method not allowed'
      })
    };
  }

  try {
    // Validate API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable not set');
    }

    // Validate assistant ID
    if (!process.env.OPENAI_ASSISTANT_ID) {
      throw new Error('OPENAI_ASSISTANT_ID environment variable not set');
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
      logKV('request body parsed', 'success');
    } catch (error) {
      throw new Error('Invalid JSON in request body');
    }

    // Validate required fields
    const { userPrompt, metadata = {} } = requestBody;
    if (!userPrompt || typeof userPrompt !== 'string') {
      throw new Error('userPrompt is required and must be a string');
    }

    logKV('userPrompt length', userPrompt.length);
    logKV('metadata', metadata);

    const startTime = Date.now();

    // Create a new thread
    logKV('creating thread', 'starting');
    const thread = await openai.beta.threads.create();
    logKV('thread created', thread.id);

    // Add message to thread
    logKV('adding message', 'starting');
    const message = await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: userPrompt
    });
    logKV('message added', message.id);

    // Run the assistant
    logKV('starting assistant run', 'starting');
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID,
      instructions: "Consult the attached OpenSCAD examples before answering. Provide parametric, printable OpenSCAD code when requested."
    });
    logKV('run started', run.id);

    // Poll for completion
    logKV('polling for completion', 'starting');
    const result = await pollRunStatus(thread.id, run.id);
    
    if (!result.success) {
      throw new Error(result.error);
    }

    // Get the final messages
    logKV('retrieving messages', 'starting');
    const messages = await openai.beta.threads.messages.list(thread.id);
    logKV('messages retrieved', messages.data.length);

    // Find the assistant's response (most recent message that's not from user)
    const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
    
    if (!assistantMessage) {
      throw new Error('No assistant response found');
    }

    // Extract text content
    const textContent = assistantMessage.content
      .filter(content => content.type === 'text')
      .map(content => content.text.value)
      .join('\n');

    const endTime = Date.now();
    const duration = endTime - startTime;

    logKV('assistant run completed', 'success');
    logKV('duration_ms', duration);
    banner('Assistant Run API Complete');

    const response = {
      ok: true,
      content: textContent,
      metadata: {
        ...metadata,
        thread_id: thread.id,
        run_id: run.id,
        message_id: assistantMessage.id,
        duration_ms: duration,
        assistant_id: process.env.OPENAI_ASSISTANT_ID
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response, null, 2)
    };

  } catch (error) {
    logKV('error', error.message);
    logKV('stack', error.stack);

    // Determine appropriate error status code
    let statusCode = 500;
    if (error.message.includes('API key') || error.message.includes('ASSISTANT_ID')) {
      statusCode = 503; // Service unavailable
    } else if (error.message.includes('required') || error.message.includes('Invalid JSON')) {
      statusCode = 400; // Bad request
    }

    const errorResponse = {
      ok: false,
      error: error.message,
      metadata: {
        error_occurred: true,
        error_message: error.message
      }
    };

    return {
      statusCode,
      headers,
      body: JSON.stringify(errorResponse, null, 2)
    };
  }
};