// const API_URL = "https://dreamhex-api-847608987786.us-central1.run.app"; 
const API_URL = "http://localhost:8000"; 

export const triggerWarmup = async (userId: string) => {
  try {
    fetch(`${API_URL}/warmup`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    }).catch(() => {});
  } catch (e) {
    // Ignore warmup errors
  }
};

export const getDream = async (dreamId: string) => {
  try {
    const res = await fetch(`${API_URL}/dreams/${dreamId}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res.json();
  } catch (error) {
    console.error("Error fetching dream detail:", error);
    return null;
  }
};

export const fetchDreams = async (userId: string) => {
  try {
    const res = await fetch(`${API_URL}/dreams/list?user_id=${userId}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res.json();
  } catch (error) {
    console.error("Error fetching dreams:", error);
    return [];
  }
};

export const submitDream = async (userId: string, text: string) => {
  try {
    const res = await fetch(`${API_URL}/dreams/report`, {
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
    const res = await fetch(`${API_URL}/dreams/interact`, {
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

// --- NEW FUNCTIONS ---

export const deleteDream = async (dreamId: string, userId: string) => {
  try {
    const res = await fetch(`${API_URL}/dreams/${dreamId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }) 
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res.json();
  } catch (error) {
    console.error("Error deleting dream:", error);
    throw error;
  }
};

export const reprocessDream = async (dreamId: string, userId: string) => {
  try {
    const res = await fetch(`${API_URL}/dreams/reprocess/${dreamId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }) 
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res.json();
  } catch (error) {
    console.error("Error reprocessing dream:", error);
    throw error;
  }
};