import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Agent } from '@/types';

interface AuthContextValue {
  agent: Agent | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name: string, phone: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Восстановление сессии из localStorage при старте
  useEffect(() => {
    const savedSession = localStorage.getItem('erp_agent_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setAgent(parsed);
      } catch (e) {
        console.error('Ошибка восстановления сессии', e);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    if (!window.api || !window.api.login) {
      return { success: false, error: 'Мост к локальной БД (window.api) недоступен.' };
    }

    const response = await window.api.login(email, password);
    if (response.success && response.data) {
      const agentData: Agent = {
        id: response.data.id,
        name: response.data.name,
        phone: response.data.phone || '',
        login: response.data.email,
        role: response.data.role,
      };
      
      setAgent(agentData);
      localStorage.setItem('erp_agent_session', JSON.stringify(agentData));
      return { success: true };
    }
    return { success: false, error: response.error };
  };

  const signup = async (email: string, password: string, name: string, phone: string) => {
    if (!window.api || !window.api.signup) {
      return { success: false, error: 'Мост к локальной БД (window.api) недоступен.' };
    }

    const response = await window.api.signup(email, password, name, phone);
    if (response.success && response.data) {
      const agentData: Agent = {
        id: response.data.id,
        name: response.data.name,
        phone: response.data.phone || '',
        login: response.data.email,
        role: response.data.role,
      };

      setAgent(agentData);
      localStorage.setItem('erp_agent_session', JSON.stringify(agentData));
      return { success: true };
    }
    return { success: false, error: response.error };
  };

  const logout = async () => {
    setAgent(null);
    localStorage.removeItem('erp_agent_session');
  };

  return (
    <AuthContext.Provider
      value={{
        agent,
        isAuthenticated: agent !== null,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
