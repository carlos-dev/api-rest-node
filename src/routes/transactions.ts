import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { knex } from '../database';
import { checkSessionIdExists } from '../middlewares/check-session-id-exists';

export async function transactionsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', async (request, response) => {
    console.log(`[${request.method} ${request.url}]`);
    const isCreatingTransactions =
      request.method === 'POST' && request.url === '/transactions';

    if (!isCreatingTransactions) checkSessionIdExists(request, response);
  });

  app.get('/', async (request) => {
    const { sessionId } = request.cookies;
    console.log({ sessionId });

    const transactions = await knex('transactions')
      .select()
      .where({ session_id: sessionId });

    return {
      transactions,
    };
  });

  app.get('/:id', async (request) => {
    const getTransactionParamsSchema = z.object({
      id: z.string().uuid(),
    });
    const { id } = getTransactionParamsSchema.parse(request.params);
    const { sessionId } = request.cookies;

    const transaction = await knex('transactions')
      .select()
      .where({
        id,
        session_id: sessionId,
      })
      .first();

    return transaction;
  });

  app.get('/summary', async (request) => {
    const { sessionId } = request.cookies;

    const summary = await knex('transactions')
      .where({ session_id: sessionId })
      .sum('amount', { as: 'amount' })
      .first();

    return { summary };
  });

  app.post('/', async (request, response) => {
    const createTransactionBodySchema = z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(['credit', 'debit']),
    });

    const { amount, title, type } = createTransactionBodySchema.parse(
      request.body,
    );

    let sessionId = request.cookies.sessionId;
    console.log({ sessionId });

    if (!sessionId) {
      sessionId = crypto.randomUUID();

      response.cookie('sessionId', sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    await knex('transactions').insert({
      id: crypto.randomUUID(),
      title,
      amount: type === 'credit' ? amount : amount * -1,
      session_id: sessionId,
    });

    return response.status(201).send();
  });
}
