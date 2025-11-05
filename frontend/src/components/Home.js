import React, { useEffect, useState } from 'react';
import { fetchSongs } from '../api/api';

const Home = () => {
  const [songs, setSongs] = useState([]); // ensure array by default
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchSongs()
      .then((data) => {
        if (!mounted) return;
        setSongs(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        setError(err?.detail || err?.message || JSON.stringify(err));
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  if (loading) return <div>Loading…</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="home">
      <h2>Playlist songs</h2>
      {Array.isArray(songs) && songs.length > 0 ? (
        <ul>
          {songs.map((s, i) => (
            <li key={s.id || i}>{s.title || s.name || JSON.stringify(s)}</li>
          ))}
        </ul>
      ) : (
        <p>No songs available.</p>
      )}
    </div>
  );
};

export default Home;