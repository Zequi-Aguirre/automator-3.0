import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/login'); // Replace '/login' with your actual login route
  };

  return (
      <div style={styles.container}>
        <button style={styles.button} onClick={handleLoginClick}>
          Go to Login
        </button>
      </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh', // Full viewport height
    backgroundColor: '#f5f5f5', // Optional background color
  },
  button: {
    padding: '10px 20px',
    fontSize: '16px',
    cursor: 'pointer',
    borderRadius: '5px',
    border: '1px solid #ccc',
    backgroundColor: '#007bff',
    color: '#fff',
  },
};

export default Home;