import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Inbox } from './pages/Inbox';
import { Entregas } from './pages/Entregas';
import { Estoque } from './pages/Estoque';
import { Eventos } from './pages/Eventos';
import { Comunidade } from './pages/Comunidade';
import { Ajustes } from './pages/Ajustes';
import { Login } from './pages/Login';
import { WhatsAppConnect } from './pages/WhatsAppConnect';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/inbox" replace />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="entregas" element={<Entregas />} />
        <Route path="estoque" element={<Estoque />} />
        <Route path="eventos" element={<Eventos />} />
        <Route path="comunidade" element={<Comunidade />} />
        <Route path="ajustes" element={<Ajustes />} />
        <Route path="whatsapp" element={<WhatsAppConnect />} />
      </Route>
      <Route path="*" element={<Navigate to="/inbox" replace />} />
    </Routes>
  );
}

export default App;