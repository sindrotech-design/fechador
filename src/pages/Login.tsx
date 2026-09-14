import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

export function Login() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Simple password check (in production, use proper auth)
  const VALID_PASSWORD = 'sindrotech2024';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === VALID_PASSWORD) {
      localStorage.setItem('fechador_auth', 'true');
      navigate('/inbox');
    } else {
      setError('Senha incorreta');
    }
  };

  // Check if already authenticated
  if (localStorage.getItem('fechador_auth') === 'true') {
    return <Navigate to="/inbox" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-surface rounded-lg shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🤖</div>
          <h1 className="text-2xl font-bold">Fechador Lia</h1>
          <p className="text-gray-500 mt-1">Painel de vendas SindroTech</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Senha de acesso</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Digite a senha"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 transition"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Senha padrão: <code className="bg-gray-100 px-1 rounded">sindrotech2024</code></p>
        </div>
      </div>
    </div>
  );
}