export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://stevens-gym-wqqz.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  try {
    const response = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=15', {
      headers: { Authorization: authHeader },
    });

    const data = await response.json();
    if (!response.ok) return res.status(400).json({ error: data.message || 'Strava error' });

    const runs = data
      .filter(a => a.type === 'Run' || a.type === 'VirtualRun')
      .map(a => ({
        id: a.id,
        name: a.name,
        date: a.start_date_local.split('T')[0],
        distance: (a.distance / 1000).toFixed(2),
        moving_time: a.moving_time,
        elapsed_time: a.elapsed_time,
        total_elevation_gain: a.total_elevation_gain,
        average_heartrate: a.average_heartrate ? Math.round(a.average_heartrate) : null,
        max_heartrate: a.max_heartrate ? Math.round(a.max_heartrate) : null,
        average_speed: a.average_speed,
      }));

    return res.status(200).json(runs);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
