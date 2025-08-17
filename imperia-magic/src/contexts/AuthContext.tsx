import React, { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  licenseCode: string;
  remoteToken?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, licenseCode: string) => Promise<boolean>;
  logout: () => void;
  generateRemoteToken: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('imperiaUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const isAuthenticated = !!user;

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simuliere Login - später durch echte API ersetzen
    const users = JSON.parse(localStorage.getItem('imperiaUsers') || '[]');
    const foundUser = users.find((u: any) => u.email === email && u.password === password);
    
    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem('imperiaUser', JSON.stringify(userWithoutPassword));
      return true;
    }
    return false;
  };

  const register = async (email: string, password: string, licenseCode: string): Promise<boolean> => {
    // Simuliere Registrierung - später durch echte API ersetzen
    const users = JSON.parse(localStorage.getItem('imperiaUsers') || '[]');
    
    // Prüfe ob Lizenzcode gültig ist (hier nur Demo-Codes)
    const validLicenses = ['MAGIC-2024-DEMO', 'IMPERIA-PRO-123', 'ZAUBER-PREMIUM'];
    if (!validLicenses.includes(licenseCode)) {
      return false;
    }
    
    // Prüfe ob Email bereits existiert
    if (users.find((u: any) => u.email === email)) {
      return false;
    }
    
    const newUser = {
      id: Date.now().toString(),
      email,
      password,
      licenseCode,
      remoteToken: generateRemoteToken()
    };
    
    users.push(newUser);
    localStorage.setItem('imperiaUsers', JSON.stringify(users));
    
    const { password: _, ...userWithoutPassword } = newUser;
    setUser(userWithoutPassword);
    localStorage.setItem('imperiaUser', JSON.stringify(userWithoutPassword));
    
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('imperiaUser');
  };

  const generateRemoteToken = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, register, logout, generateRemoteToken }}>
      {children}
    </AuthContext.Provider>
  );
};