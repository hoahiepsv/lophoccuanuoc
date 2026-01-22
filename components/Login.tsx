
import React, { useState } from 'react';
import { VALID_USERS, COPYRIGHT } from '../constants';
import { AuthUser } from '../types';

interface LoginProps {
  onLogin: (user: AuthUser) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const userMatch = VALID_USERS.find(u => u.username === username && u.password === password);
    if (userMatch) {
      onLogin({ username: userMatch.username, name: userMatch.name });
    } else {
      setError('Thông tin đăng nhập không chính xác!');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-900 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block bg-emerald-100 p-4 rounded-full mb-4">
            <svg className="w-12 h-12 text-emerald-900" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-emerald-900 uppercase">Đăng nhập hệ thống</h1>
          <p className="text-emerald-600">Quản lý lớp học Lê Xuân Nước</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            <input 
              type="password" 
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm italic">{error}</p>}
          <button 
            type="submit"
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-lg shadow-lg transform transition active:scale-95"
          >
            ĐĂNG NHẬP
          </button>
        </form>
        <p className="mt-8 text-center text-[10px] text-gray-400 italic font-medium uppercase tracking-widest">{COPYRIGHT}</p>
      </div>
    </div>
  );
};

export default Login;
