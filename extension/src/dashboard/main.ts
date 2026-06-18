import './style.css'

interface SchemaCluster {
  id: number;
  fingerprint: string[];
  samples: unknown[];
  sources: string[];
  example_url: string;
}

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div style="padding: 20px; font-family: sans-serif;">
    <h1>Schema Interceptor Dashboard</h1>
    <button id="refresh" style="padding: 10px 20px; cursor: pointer; background: #3b82f6; color: white; border: none; border-radius: 4px; font-weight: bold;">
      Refresh Data
    </button>
    <div id="tree-container" style="margin-top: 20px; display: flex; gap: 20px; flex-wrap: wrap;"></div>
  </div>
`

async function fetchAndRenderTree() {
  const container = document.getElementById('tree-container')!;
  container.innerHTML = '<p>Loading...</p>';

  try {
    const response = await fetch('http://localhost:5001/tree');
    const clusters = await response.json();

    container.innerHTML = '';
    
    if(clusters.length === 0) {
        container.innerHTML = '<p>No data intercepted yet. Ensure extension is running and browse a target site!</p>';
        return;
    }

    // Apply the Interface instead of 'any'
    clusters.forEach((cluster: SchemaCluster) => {
      const card = document.createElement('div');
      card.style.border = '1px solid #ccc';
      card.style.padding = '15px';
      card.style.borderRadius = '8px';
      card.style.minWidth = '350px';
      card.style.background = '#fefefe';

      const sourceBadges = cluster.sources.map((src: string) => {
        const color = src === 'WebSocket' ? '#10b981' : '#f59e0b';
        return `<span style="background: ${color}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; margin-right: 5px;">${src}</span>`;
      }).join('');

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0;">Cluster #${cluster.id}</h3>
            <div>${sourceBadges}</div>
        </div>
        <p style="margin-top: 10px;"><strong>Example URL:</strong> <br/><span style="font-size: 12px; color: #666; word-break: break-all;">${cluster.example_url}</span></p>
        <p><strong>Keys Detected:</strong> ${cluster.fingerprint.length}</p>
        <p><strong>Samples Captured:</strong> ${cluster.samples.length}</p>
        <details style="margin-bottom: 15px;">
          <summary style="cursor:pointer; color: #3b82f6; font-weight: bold;">View Schema DNA</summary>
          <pre style="background: #1e293b; color: #10b981; padding: 10px; border-radius: 4px; font-size: 12px; overflow-x: auto; margin-top: 10px;">${cluster.fingerprint.join('\n')}</pre>
        </details>
        <button class="build-btn" data-id="${cluster.id}" style="padding: 8px 16px; cursor: pointer; background: #10b981; color: white; border: none; border-radius: 4px; font-weight: bold; width: 100%;">
          Generate Zod Template
        </button>
      `;
      container.appendChild(card);
    });

  } catch (err) {
    console.error("Tree Fetch Error:", err); // Actually use the error variable!
    container.innerHTML = '<p style="color:red; font-weight: bold;">Failed to connect to Python server. Ensure it is running on port 5001.</p>';
  }
}

document.getElementById('refresh')!.addEventListener('click', fetchAndRenderTree);
fetchAndRenderTree();