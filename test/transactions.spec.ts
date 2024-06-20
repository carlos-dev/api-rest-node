import { execSync } from 'node:child_process';
import {
  test,
  expect,
  beforeAll,
  afterAll,
  describe,
  beforeEach,
} from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('Transactions Routes', () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    execSync('npm run knex migrate:rollback --all');
    execSync('npm run knex migrate:latest');
  });

  test('should be able to create a new transaction', async () => {
    const response = await request(app.server).post('/transactions').send({
      title: 'new transaction',
      amount: 5000,
      type: 'credit',
    });

    expect(response.statusCode).toEqual(201);
  });

  test('should be able to list all transactions', async () => {
    const createTransactionsResponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'new transaction',
        amount: 5000,
        type: 'credit',
      });

    const cookie = createTransactionsResponse.get('Set-Cookie');

    const listTransactionsResponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookie ?? []);

    expect(listTransactionsResponse.body.transactions).toEqual([
      expect.objectContaining({
        title: 'new transaction',
        amount: 5000,
      }),
    ]);
  });

  test('should be able to to get specific transactions', async () => {
    const createTransactionsResponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'new transaction',
        amount: 5000,
        type: 'credit',
      });

    const cookie = createTransactionsResponse.get('Set-Cookie');

    const listTransactionsResponse = await request(app.server)
      .get(`/transactions`)
      .set('Cookie', cookie ?? []);

    const transactionId = listTransactionsResponse.body.transactions[0].id;

    const getTransactionResponse = await request(app.server)
      .get(`/transactions/${transactionId}`)
      .set('Cookie', cookie ?? []);

    expect(getTransactionResponse.body).toEqual(
      expect.objectContaining({
        title: 'new transaction',
        amount: 5000,
      }),
    );
  });

  test('should be able to get the summary', async () => {
    const createTransactionsResponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'credit transaction',
        amount: 5000,
        type: 'credit',
      });

    const cookie = createTransactionsResponse.get('Set-Cookie');

    await request(app.server)
      .post('/transactions')
      .set('Cookie', cookie ?? [])
      .send({
        title: 'debit transaction',
        amount: 2000,
        type: 'debit',
      });

    const summaryTransactionsResponse = await request(app.server)
      .get('/transactions/summary')
      .set('Cookie', cookie ?? []);
    console.log(
      'summaryTransactionsResponse',
      summaryTransactionsResponse.body,
    );

    expect(summaryTransactionsResponse.body.summary).toEqual({
      amount: 3000,
    });
  });
});
