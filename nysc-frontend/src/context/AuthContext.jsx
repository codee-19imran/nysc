import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('nysc_token'));
  const [userRole, setUserRole] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Helper to parse JWT payload
  const parseJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    if (token) {
      localStorage.setItem('nysc_token', token);
      const decoded = parseJwt(token);
      if (decoded && decoded.role) {
        setUserRole(decoded.role);
        setUserEmail(decoded.sub || decoded.email); // standard JWT 'sub' claim usually has email/id
      }
    } else {
      localStorage.removeItem('nysc_token');
      setUserRole(null);
      setUserEmail(null);
    }
  }, [token]);

  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      // FastAPI OAuth2PasswordBearer expects form data: username and password
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await response.json();
      setToken(data.access_token);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (fullName, email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: fullName,
          email,
          password,
        }),
      });

      if (!response.ok) {
        throw new Error('Signup failed. Email might already exist.');
      }

      const data = await response.json();
      setToken(data.access_token);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, userRole, userEmail, login, signup, logout, isLoading, error, API_URL }}>
      {children}
    </AuthContext.Provider>
  );
};
