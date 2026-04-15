// In a React component or hook
import { useState } from 'react';

function ActivateButton() {
  const [status, setStatus] = useState('');

  const handleActivate = async () => {
    try {
      const response = await fetch('/api/ext/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key: 'value' }), // send actual payload if needed
      });

      if (!response.ok) {
        // Handles 4xx or 5xx errors from the server
        const text = await response.text();
        console.error('Server error:', text);
        setStatus(`Error: ${response.status} ${text}`);
        return;
      }

      const data = await response.json(); // Parse JSON response
      console.log('Success:', data);
      setStatus('Activated successfully!');
    } catch (err) {
      console.error('Network or JS error:', err);
      setStatus('Activation failed (network or JS error)');
    }
  };

  return (
    <div>
      <button onClick={handleActivate}>Activate</button>
      <p>{status}</p>
    </div>
  );
}

export default ActivateButton;