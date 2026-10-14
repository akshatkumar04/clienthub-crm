/**
 * Seed script: `npm run seed`
 * WIPES the users, leads, contacts, deals and activities collections, then inserts demo data:
 * 1 admin, 2 sales executives, 30 leads, 15 contacts, 20 deals and 25 activities.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Lead = require('../models/Lead');
const Contact = require('../models/Contact');
const Deal = require('../models/Deal');
const Activity = require('../models/Activity');

const DEMO_PASSWORD = 'Password@123';
const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (n) => new Date(Date.now() + n * DAY);

const USERS = [
  { name: 'Aarav Mehta', email: 'admin@clienthub.in', role: 'admin' },
  { name: 'Kavya Iyer', email: 'kavya@clienthub.in', role: 'sales_exec' },
  { name: 'Rohan Gupta', email: 'rohan@clienthub.in', role: 'sales_exec' },
];

// name, company, source, status, designation
const PEOPLE = [
  ['Rahul Verma', 'Infosys', 'referral', 'contacted', 'Delivery Manager'],
  ['Priya Nair', 'Tata Consultancy Services', 'website', 'qualified', 'Procurement Head'],
  ['Amit Sharma', 'Reliance Industries', 'event', 'qualified', 'VP Operations'],
  ['Sneha Reddy', 'Wipro', 'website', 'new', 'IT Director'],
  ['Vikram Singh', 'Mahindra & Mahindra', 'cold call', 'contacted', 'Plant Head'],
  ['Anjali Desai', 'HDFC Bank', 'referral', 'qualified', 'Regional Manager'],
  ['Karthik Subramanian', 'Zoho Corporation', 'event', 'new', 'Product Lead'],
  ['Neha Kapoor', 'Flipkart', 'website', 'contacted', 'Category Manager'],
  ['Arjun Malhotra', 'Bajaj Auto', 'cold call', 'unqualified', 'Purchase Manager'],
  ['Pooja Joshi', 'Asian Paints', 'referral', 'qualified', 'Marketing Head'],
  ['Sanjay Patel', 'Larsen & Toubro', 'event', 'contacted', 'Project Director'],
  ['Divya Menon', 'Infosys BPM', 'website', 'new', 'Operations Manager'],
  ['Rajesh Khanna', 'Tata Steel', 'cold call', 'contacted', 'GM Procurement'],
  ['Meera Shah', 'Godrej Consumer Products', 'website', 'qualified', 'Brand Manager'],
  ['Aditya Rao', 'Swiggy', 'referral', 'new', 'City Head'],
  ['Ishita Banerjee', 'ITC Limited', 'event', 'qualified', 'Supply Chain Lead'],
  ['Manish Tiwari', 'Hindustan Unilever', 'cold call', 'unqualified', 'Regional Sales Head'],
  ['Shruti Agarwal', 'Paytm', 'website', 'contacted', 'Partnerships Manager'],
  ['Deepak Chawla', 'Maruti Suzuki', 'referral', 'new', 'Dealer Network Head'],
  ['Lakshmi Narayanan', 'Sun Pharma', 'other', 'contacted', 'Admin Head'],
  ['Harsh Vardhan', 'Adani Ports', 'event', 'qualified', 'Logistics Manager'],
  ['Tanvi Kulkarni', 'Persistent Systems', 'website', 'new', 'Engineering Manager'],
  ['Gaurav Bhatia', 'Dr. Reddys Laboratories', 'cold call', 'contacted', 'Facilities Head'],
  ['Nandini Pillai', 'Titan Company', 'referral', 'qualified', 'Retail Operations Head'],
  ['Siddharth Jain', 'Ola Electric', 'other', 'new', 'Fleet Manager'],
  ['Rekha Choudhary', 'Bharti Airtel', 'website', 'contacted', 'Enterprise Sales Lead'],
  ['Yash Thakur', 'Hero MotoCorp', 'event', 'unqualified', 'Vendor Manager'],
  ['Aishwarya Hegde', 'Mphasis', 'referral', 'new', 'Head of Delivery'],
  ['Pranav Kulshreshtha', 'Zomato', 'website', 'contacted', 'Growth Manager'],
  ['Bhavna Trivedi', 'Kotak Mahindra Bank', 'other', 'new', 'Branch Head'],
];

const DEAL_TITLES = [
  'ERP Rollout',
  'Cloud Migration',
  'CRM Licences',
  'Annual Maintenance Contract',
  'Data Analytics Suite',
  'Warehouse Automation',
  'Digital Marketing Retainer',
  'Fleet Management Platform',
  'HR Portal Implementation',
  'Cybersecurity Audit',
  'Retail POS Upgrade',
  'Supply Chain Dashboard',
  'Mobile App Development',
  'Customer Support Platform',
  'IoT Sensor Deployment',
  'Payment Gateway Integration',
  'Training & Onboarding Programme',
  'Procurement Automation',
  'Business Intelligence Reporting',
  'Network Infrastructure Refresh',
];

// [stage, value in INR, days until expected close]
const DEAL_PLAN = [
  ['new', 450000, 45],
  ['new', 820000, 60],
  ['new', 310000, 30],
  ['new', 1250000, 75],
  ['qualified', 1800000, 40],
  ['qualified', 950000, 35],
  ['qualified', 2400000, 55],
  ['qualified', 670000, 25],
  ['qualified', 1100000, 50],
  ['proposal', 3200000, 20],
  ['proposal', 1450000, 15],
  ['proposal', 2750000, 28],
  ['proposal', 880000, 10],
  ['won', 2100000, -12],
  ['won', 1350000, -25],
  ['won', 3800000, -40],
  ['won', 760000, -8],
  ['lost', 1500000, -18],
  ['lost', 920000, -30],
  ['lost', 2200000, -5],
];

const ACTIVITY_NOTES = {
  call: [
    'Intro call to understand requirements',
    'Discussed pricing and timelines',
    'Follow-up call on budget approval',
    'Checked in on decision status',
  ],
  email: [
    'Sent product brochure and case studies',
    'Shared proposal draft for review',
    'Sent revised quotation',
    'Emailed meeting summary',
  ],
  meeting: [
    'On-site demo with the operations team',
    'Stakeholder alignment meeting',
    'Contract negotiation meeting',
  ],
  note: [
    'Prefers WhatsApp over email',
    'Decision maker is the CFO',
    'Competitor is quoting 10% lower',
    'Budget cycle starts next quarter',
  ],
};

const seed = async () => {
  await connectDB();
  console.log('Clearing existing data…');
  await Promise.all([
    User.deleteMany({}),
    Lead.deleteMany({}),
    Contact.deleteMany({}),
    Deal.deleteMany({}),
    Activity.deleteMany({}),
  ]);

  // Users are created one by one so the bcrypt pre-save hook runs
  const users = [];
  for (const u of USERS) users.push(await User.create({ ...u, password: DEMO_PASSWORD }));
  const execs = [users[1], users[2]];

  const phone = (i) => `+91 9${String(8000000000 + i * 7919317).slice(0, 9)}`;
  const slug = (text) =>
    text
      .toLowerCase()
      .replace(/[^a-z]+/g, '')
      .slice(0, 14);

  const leads = await Lead.insertMany(
    PEOPLE.map(([name, company, source, status], i) => ({
      name,
      company,
      source,
      status,
      email: `${name.split(' ')[0].toLowerCase()}@${slug(company)}.example`,
      phone: phone(i),
      assignedTo: execs[i % 2]._id,
      notes: i % 3 === 0 ? 'Warm lead, prefers a call in the afternoon.' : '',
      createdAt: daysFromNow(-(60 - i * 2)),
    }))
  );

  // 15 contacts: the qualified leads first (linked back to their lead), then others
  const contactSources = [
    ...leads.filter((l) => l.status === 'qualified'),
    ...leads.filter((l) => l.status === 'contacted'),
  ].slice(0, 15);
  const contacts = await Contact.insertMany(
    contactSources.map((lead) => ({
      name: lead.name,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      designation: PEOPLE.find((p) => p[0] === lead.name)[4],
      linkedLead: lead._id,
      owner: lead.assignedTo,
      createdAt: daysFromNow(-20),
    }))
  );

  const deals = await Deal.insertMany(
    DEAL_PLAN.map(([stage, value, closeIn], i) => {
      const contact = contacts[(i * 7) % contacts.length];
      return {
        title: `${contact.company.split(' ')[0]} - ${DEAL_TITLES[i]}`,
        value,
        stage,
        contact: contact._id,
        owner: contact.owner,
        expectedCloseDate: daysFromNow(closeIn),
        createdAt: daysFromNow(-45 + i),
        updatedAt: daysFromNow(-(i % 10)),
      };
    })
  );

  // 25 activities: a mix of overdue, due today, upcoming and completed follow-ups
  const types = ['call', 'email', 'meeting', 'note'];
  const followUps = [
    -4,
    -2,
    -1,
    0,
    0,
    0,
    2,
    5,
    null,
    null,
    null,
    -6,
    -3,
    1,
    3,
    null,
    0,
    -1,
    4,
    null,
    7,
    -2,
    0,
    null,
    6,
  ];
  const activities = followUps.map((offset, i) => {
    const onLead = i % 2 === 0;
    const related = onLead ? leads[(i * 3) % leads.length] : deals[(i * 3) % deals.length];
    const type = types[i % types.length];
    const notes = ACTIVITY_NOTES[type];
    return {
      type,
      description: notes[i % notes.length],
      relatedTo: { kind: onLead ? 'Lead' : 'Deal', item: related._id },
      followUpDate: offset === null ? null : daysFromNow(offset),
      completed: i % 6 === 5, // a few finished follow-ups
      createdBy: onLead ? related.assignedTo : related.owner,
      createdAt: daysFromNow(-(i % 14) - 1),
    };
  });
  await Activity.insertMany(activities);

  console.log('\nSeed complete:');
  console.log(`  users:      ${users.length} (1 admin, 2 sales executives)`);
  console.log(`  leads:      ${leads.length}`);
  console.log(`  contacts:   ${contacts.length}`);
  console.log(`  deals:      ${deals.length}`);
  console.log(`  activities: ${activities.length}`);
  console.log('\nDemo logins (password for all: ' + DEMO_PASSWORD + ')');
  USERS.forEach((u) => console.log(`  ${u.role.padEnd(10)} ${u.email}`));
};

seed()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
