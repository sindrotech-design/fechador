import { useEffect, useState } from 'react';

export function WhatsAppConnect() {
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQR = async () => {
    try {
      const res = await fetch('/api/whatsapp/qr-image');
      if (res.ok) {
        const blob = await res.blob();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        setQrBase64(base64);
        setError(null);
      } else if (res.status === 404) {
        setQrBase64(null);
        setError('Aguardando QR code...');
      } else {
        setError('Erro ao buscar QR code');
      }
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/whatsapp/status');
      const data = await res.json();
      setConnected(data.connected);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchQR();
    checkStatus();

    const interval = setInterval(() => {
      if (!connected) {
        fetchQR();
        checkStatus();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [connected]);

  if (connected) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>✅ WhatsApp Conectado</h2>
        <p>O bot está funcionando.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', textAlign: 'center', maxWidth: '400px', margin: '0 auto' }}>
      <h2>📱 Conectar WhatsApp</h2>
      <p>Escaneie o QR code com seu WhatsApp:</p>
      
      {loading && <p>Carregando...</p>}
      
      {error && !qrBase64 && (
        <div style={{ color: '#666', margin: '1rem 0' }}>{error}</div>
      )}
      
      {qrBase64 && (
        <div style={{ margin: '1rem 0' }}>
          <img src={qrBase64} alt="QR Code" style={{ width: '300px', height: '300px' }} />
        </div>
      )}
      
      {!qrBase64 && !loading && !error && (
        <div style={{ color: '#666' }}>Gerando QR code...</div>
      )}
      
      <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#888' }}>
        Atualiza automaticamente a cada 3s
      </div>
      
      <button 
        onClick={fetchQR}
        disabled={loading}
        style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}
      >
        Atualizar Agora
      </button>
    </div>
  );
}