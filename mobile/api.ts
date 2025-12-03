// const API_URL = "https://dreamhex-api-847608987786.us-central1.run.app"; 
const API_URL = "http://localhost:8000"; 

export const fetchDreams = async (userId: string) => {
  try {
    const res = await fetch(`${API_URL}/api/dreams/list?user_id=${userId}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res.json();
  } catch (error) {
    console.error("Error fetching dreams:", error);
    return [];
  }
};

export const submitDream = async (userId: string, text: string) => {
  try {
    const res = await fetch(`${API_URL}/api/dreams/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, report_text: text })
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res.json();
  } catch (error) {
    console.error("Error submitting dream:", error);
    throw error;
  }
};

export const interactEntity = async (userId: string, dreamId: string, stationId: string, command: string) => {
  try {
    const res = await fetch(`${API_URL}/api/dreams/interact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        user_id: userId, 
        dream_id: dreamId, 
        station_id: stationId, 
        user_command: command 
      })
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res.json();
  } catch (error) {
    console.error("Error interacting:", error);
    throw error;
  }
};