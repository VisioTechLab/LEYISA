import { createContext, useContext } from 'react';
import type { CurrentUser } from '../features/auth/authApi';
export const SessionContext=createContext<CurrentUser|null>(null);
export const useSession=()=>useContext(SessionContext);
