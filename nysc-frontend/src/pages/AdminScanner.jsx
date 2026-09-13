import { useNavigate } from 'react-router-dom';
import { auth as apiAuth } from '../lib/api';
import { isAdminRole } from '../lib/roles';
import QRScanner from '../components/QRScanner';

export default function AdminScanner() {
  const navigate = useNavigate();
  
  const user = apiAuth.getUser();
  if (!user || !isAdminRole(user.role)) {
    navigate('/login');
    return null;
  }

  return (
    <QRScanner
      onBack={() => navigate('/admin')}
      showStats={true}
      title="Admin Scanner"
    />
  );
}
