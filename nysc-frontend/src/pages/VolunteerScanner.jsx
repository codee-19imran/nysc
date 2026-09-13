import { useNavigate } from 'react-router-dom';
import { auth as apiAuth } from '../lib/api';
import QRScanner from '../components/QRScanner';

export default function VolunteerScanner() {
  const navigate = useNavigate();
  
  const user = apiAuth.getUser();
  if (!user || !['volunteer', 'committee_member'].includes(user.role)) {
    navigate('/login');
    return null;
  }

  return (
    <QRScanner
      onBack={() => navigate('/volunteer/dashboard')}
      showStats={true}
      title="Volunteer Scanner"
    />
  );
}
