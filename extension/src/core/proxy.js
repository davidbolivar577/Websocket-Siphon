/* global Blob */

  (function () {
    const NativeWebSocket = window.WebSocket;

    window.WebSocket = function (url, protocols) {
      console.log(`[Interceptor] Hooked WebSocket connection to: ${url}`);
      const ws = new NativeWebSocket(url, protocols);

      const originalAddEventListener = ws.addEventListener.bind(ws);
      
      ws.addEventListener = function (type, listener, options) {
        if (type === 'message') {
          const wrappedListener = function (event) {
            try {
              let rawData = typeof event.data === 'string' ? event.data.replace(/^[0-9]+/, '') : event.data;
              
              if (rawData.trim() === '') {
                  throw new Error("Empty payload");
              }

              const parsed = JSON.parse(rawData);
              window.postMessage({
                source: 'WS_INTERCEPTOR',
                payload: parsed,
                url: url
              }, '*');
            } catch {
              let dataType = "Other";
              
              if (event.data instanceof Blob || event.data instanceof ArrayBuffer) {
                dataType = "Encoded data (binary)";
              } 
              else if (typeof event.data === 'string') {
                if (event.data.includes('{') && event.data.includes('}')) {
                  dataType = "Suspected JSON";
                  console.log(event.data);
                } 
                else if (/^[A-Za-z0-9+/]+={0,2}$/.test(event.data) && event.data.length > 20) {
                  dataType = "Encoded data (base64)";
                }
              }

              console.warn(`[Interceptor] Ignored non-JSON payload: (${dataType}):`, event.data);
            }
            return listener.call(this, event);
          };
          return originalAddEventListener(type, wrappedListener, options);
        }
        return originalAddEventListener(type, listener, options);
      };

      Object.defineProperty(ws, 'onmessage', {
        set: function (func) {
          if (func) {
            this.addEventListener('message', func);
          }
        }
      });

      return ws; 
    };

    window.WebSocket.prototype = NativeWebSocket.prototype;

    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);
      const url = args[0];
      
      const clone = response.clone();
      
      clone.json().then(data => {
        if (typeof data === 'object' && data !== null) {
          window.postMessage({
            source: 'FETCH_INTERCEPTOR',
            payload: data,
            url: typeof url === 'string' ? url : 'Unknown URL'
          }, '*');
        }
      }).catch(() => {
        // Ignore non-JSON
      });

      return response;
    };
  })();