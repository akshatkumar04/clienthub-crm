import { useEffect, useState } from 'react';
import api, { unwrap } from './api/client';
import { useAuth } from './context/AuthContext';

/** Returns `value` after it has stopped changing for `delay` ms (for search boxes). */
export function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Admin-only list of users for owner / assignee dropdowns. Empty for sales execs. */
export function useUsers() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  useEffect(() => {
    if (!isAdmin) return;
    unwrap(api.get('/users'))
      .then(setUsers)
      .catch(() => setUsers([]));
  }, [isAdmin]);
  return users;
}
