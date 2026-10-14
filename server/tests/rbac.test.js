const {
  startTestApp,
  stopTestApp,
  clearDatabase,
  createUser,
  loginAs,
} = require('./helpers/setup');
const Lead = require('../models/Lead');
const Contact = require('../models/Contact');
const Deal = require('../models/Deal');
const Activity = require('../models/Activity');

let app;
let admin;
let alice; // sales exec
let bob; // another sales exec
let aliceAgent;
let bobAgent;
let adminAgent;

const makeLead = (owner, overrides = {}) =>
  Lead.create({ name: 'Rahul Verma', company: 'Infosys', assignedTo: owner._id, ...overrides });
const makeContact = (owner) => Contact.create({ name: 'Priya Nair', owner: owner._id });
const makeDeal = async (owner, overrides = {}) => {
  const contact = await makeContact(owner);
  return Deal.create({
    title: 'ERP Rollout',
    value: 500000,
    contact: contact._id,
    owner: owner._id,
    ...overrides,
  });
};

beforeAll(async () => {
  app = await startTestApp();
});
afterAll(stopTestApp);
beforeEach(async () => {
  await clearDatabase();
  admin = await createUser({ role: 'admin' });
  alice = await createUser({ name: 'Alice' });
  bob = await createUser({ name: 'Bob' });
  [adminAgent, aliceAgent, bobAgent] = await Promise.all([
    loginAs(app, admin),
    loginAs(app, alice),
    loginAs(app, bob),
  ]);
});

describe('Deal access', () => {
  test('a sales exec cannot read another users deal', async () => {
    const bobsDeal = await makeDeal(bob);
    const res = await aliceAgent.get(`/api/deals/${bobsDeal._id}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    // the owner can still read it
    await bobAgent.get(`/api/deals/${bobsDeal._id}`).expect(200);
  });

  test('a sales exec cannot update, move or delete another users deal', async () => {
    const bobsDeal = await makeDeal(bob);
    await aliceAgent.put(`/api/deals/${bobsDeal._id}`).send({ title: 'Hijacked' }).expect(404);
    await aliceAgent.patch(`/api/deals/${bobsDeal._id}/stage`).send({ stage: 'won' }).expect(404);
    await aliceAgent.delete(`/api/deals/${bobsDeal._id}`).expect(404);

    const unchanged = await Deal.findById(bobsDeal._id);
    expect(unchanged.title).toBe('ERP Rollout');
    expect(unchanged.stage).toBe('new');
  });

  test('deal lists only contain the execs own deals; admin sees all', async () => {
    await makeDeal(alice);
    await makeDeal(bob);
    await makeDeal(bob);

    const aliceList = await aliceAgent.get('/api/deals');
    expect(aliceList.body.data.items).toHaveLength(1);
    const adminList = await adminAgent.get('/api/deals');
    expect(adminList.body.data.items).toHaveLength(3);
  });

  test('an exec can move their own deal between stages', async () => {
    const deal = await makeDeal(alice);
    const res = await aliceAgent.patch(`/api/deals/${deal._id}/stage`).send({ stage: 'proposal' });
    expect(res.status).toBe(200);
    expect(res.body.data.stage).toBe('proposal');
  });

  test('an invalid stage is rejected (422)', async () => {
    const deal = await makeDeal(alice);
    await aliceAgent.patch(`/api/deals/${deal._id}/stage`).send({ stage: 'maybe' }).expect(422);
  });

  test('an exec cannot attach a deal to someone elses contact', async () => {
    const bobsContact = await makeContact(bob);
    const res = await aliceAgent
      .post('/api/deals')
      .send({ title: 'Sneaky', value: 1000, contact: bobsContact._id });
    expect(res.status).toBe(404);
  });

  test('an exec cannot assign a new deal to another owner; an admin can', async () => {
    const contact = await makeContact(alice);
    const execRes = await aliceAgent
      .post('/api/deals')
      .send({ title: 'Mine', value: 1000, contact: contact._id, owner: bob._id })
      .expect(201);
    expect(execRes.body.data.owner).toBe(alice._id.toString());

    const adminRes = await adminAgent
      .post('/api/deals')
      .send({ title: 'Assigned', value: 1000, contact: contact._id, owner: bob._id })
      .expect(201);
    expect(adminRes.body.data.owner).toBe(bob._id.toString());
  });
});

describe('Lead access', () => {
  test('an exec cannot read or edit another users lead', async () => {
    const bobsLead = await makeLead(bob);
    await aliceAgent.get(`/api/leads/${bobsLead._id}`).expect(404);
    await aliceAgent.put(`/api/leads/${bobsLead._id}`).send({ status: 'contacted' }).expect(404);
    await aliceAgent.delete(`/api/leads/${bobsLead._id}`).expect(404);
  });

  test('leads created by an exec are always assigned to themselves', async () => {
    const res = await aliceAgent
      .post('/api/leads')
      .send({ name: 'Meera Shah', company: 'Wipro', source: 'website', assignedTo: bob._id })
      .expect(201);
    expect(res.body.data.assignedTo).toBe(alice._id.toString());
  });

  test('only an admin can reassign a lead', async () => {
    const lead = await makeLead(alice);

    await aliceAgent.put(`/api/leads/${lead._id}`).send({ assignedTo: bob._id }).expect(200);
    expect((await Lead.findById(lead._id)).assignedTo.equals(alice._id)).toBe(true);

    await adminAgent.put(`/api/leads/${lead._id}`).send({ assignedTo: bob._id }).expect(200);
    expect((await Lead.findById(lead._id)).assignedTo.equals(bob._id)).toBe(true);
  });

  test('search and filters work together with pagination', async () => {
    await makeLead(alice, { name: 'Anil Kapoor', company: 'Tata Steel', status: 'qualified' });
    await makeLead(alice, { name: 'Sunita Rao', company: 'Tata Motors', source: 'website' });
    await makeLead(alice, { name: 'Vikram Singh', company: 'Reliance', source: 'website' });

    const search = await aliceAgent.get('/api/leads?search=tata');
    expect(search.body.data.pagination.total).toBe(2);

    const filtered = await aliceAgent.get('/api/leads?status=new&source=website&limit=1&page=2');
    expect(filtered.body.data.items).toHaveLength(1);
    expect(filtered.body.data.pagination).toMatchObject({ total: 2, pages: 2, page: 2 });
  });

  test('converting a lead creates a contact + deal and blocks double conversion', async () => {
    const lead = await makeLead(alice);
    const res = await aliceAgent
      .post(`/api/leads/${lead._id}/convert`)
      .send({ value: 250000, dealTitle: 'Infosys Rollout' });
    expect(res.status).toBe(201);
    expect(res.body.data.deal.stage).toBe('qualified');
    expect(res.body.data.contact.linkedLead).toBe(lead._id.toString());
    expect(res.body.data.lead.status).toBe('qualified');

    await aliceAgent.post(`/api/leads/${lead._id}/convert`).send({ value: 1 }).expect(409);
  });
});

describe('Contacts and activities', () => {
  test('an exec cannot read another users contact', async () => {
    const bobsContact = await makeContact(bob);
    await aliceAgent.get(`/api/contacts/${bobsContact._id}`).expect(404);
    const list = await aliceAgent.get('/api/contacts');
    expect(list.body.data.items).toHaveLength(0);
  });

  test('an exec cannot log an activity against someone elses lead', async () => {
    const bobsLead = await makeLead(bob);
    await aliceAgent
      .post('/api/activities')
      .send({
        type: 'call',
        description: 'Intro call',
        relatedTo: { kind: 'Lead', item: bobsLead._id },
      })
      .expect(404);
  });

  test('pending follow-ups include due-today and overdue items only', async () => {
    const lead = await makeLead(alice);
    const day = 24 * 60 * 60 * 1000;
    const base = {
      type: 'call',
      relatedTo: { kind: 'Lead', item: lead._id },
      createdBy: alice._id,
    };
    await Activity.create([
      { ...base, description: 'overdue', followUpDate: new Date(Date.now() - 2 * day) },
      { ...base, description: 'today', followUpDate: new Date() },
      { ...base, description: 'future', followUpDate: new Date(Date.now() + 3 * day) },
      { ...base, description: 'done', followUpDate: new Date(Date.now() - day), completed: true },
      { ...base, description: 'no date' },
    ]);

    const res = await aliceAgent.get('/api/activities/follow-ups');
    expect(res.status).toBe(200);
    expect(res.body.data.map((a) => a.description)).toEqual(['overdue', 'today']);
  });
});

describe('Dashboard aggregation', () => {
  test('is scoped per user and computes pipeline value and conversion rate', async () => {
    await makeDeal(alice, { value: 100000, stage: 'proposal' });
    await makeDeal(alice, { value: 50000, stage: 'new' });
    await makeDeal(alice, { value: 70000, stage: 'won' });
    await makeDeal(alice, { value: 30000, stage: 'lost' });
    await makeDeal(alice, { value: 20000, stage: 'lost' });
    await makeDeal(bob, { value: 900000, stage: 'qualified' });
    await makeLead(alice, { source: 'website' });
    await makeLead(bob, { source: 'event' });

    const aliceRes = await aliceAgent.get('/api/dashboard');
    expect(aliceRes.status).toBe(200);
    expect(aliceRes.body.data.pipelineValue).toBe(150000); // open deals only, Bob excluded
    expect(aliceRes.body.data.conversionRate).toBe(33.3); // 1 won / (1 won + 2 lost)
    expect(aliceRes.body.data.dealsByStage).toHaveLength(5);
    expect(aliceRes.body.data.leadsBySource.find((s) => s.source === 'website').count).toBe(1);
    expect(aliceRes.body.data.leadsBySource.find((s) => s.source === 'event').count).toBe(0);

    const adminRes = await adminAgent.get('/api/dashboard');
    expect(adminRes.body.data.pipelineValue).toBe(1050000);
    expect(adminRes.body.data.totalLeads).toBe(2);
  });
});
