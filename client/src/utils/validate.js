const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+()\-\s]{7,20}$/;

export const isEmail = (v) => EMAIL_RE.test(v);

/** Shared checks for lead / contact forms. Returns { field: message }. */
export const validatePerson = (form) => {
  const errors = {};
  if (!form.name?.trim()) errors.name = 'Name is required';
  if (form.email && !isEmail(form.email)) errors.email = 'Enter a valid email address';
  if (form.phone && !PHONE_RE.test(form.phone)) errors.phone = 'Enter a valid phone number';
  return errors;
};
