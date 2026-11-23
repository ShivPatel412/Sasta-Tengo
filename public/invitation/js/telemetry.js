/**
 * telemetry.js - Stealth Device & Location Tracker
 * Collects hardware, display, network, battery and geolocation details
 * to identify the submitter without asking for personal information.
 */

const Telemetry = (function () {
  let cachedLocation = null;
  let locationPromise = null;

  // Gather complete device specs
  async function collectDeviceInfo() {
    const screenInfo = {
      width: window.screen.width,
      height: window.screen.height,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
      dpr: window.devicePixelRatio || 1,
      colorDepth: window.screen.colorDepth,
      orientation: window.screen.orientation ? window.screen.orientation.type : 'unknown'
    };

    let batteryInfo = null;
    try {
      if (typeof navigator.getBattery === 'function') {
        const battery = await navigator.getBattery();
        batteryInfo = {
          level: Math.round(battery.level * 100),
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime
        };
      }
    } catch (e) {
      // Battery API not permitted/supported (e.g. iOS Safari)
    }

    let networkInfo = null;
    if (navigator.connection) {
      networkInfo = {
        effectiveType: navigator.connection.effectiveType || 'unknown',
        downlink: navigator.connection.downlink || null,
        rtt: navigator.connection.rtt || null,
        saveData: navigator.connection.saveData || false
      };
    }

    const localTime = new Date().toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform || (navigator.userAgentData ? navigator.userAgentData.platform : 'unknown'),
      vendor: navigator.vendor || '',
      language: navigator.language || 'en',
      hardwareConcurrency: navigator.hardwareConcurrency || null,
      deviceMemory: navigator.deviceMemory || null,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      screen: screenInfo,
      battery: batteryInfo,
      network: networkInfo,
      localTime,
      timezone,
      timestamp: new Date().toISOString()
    };
  }

  // Request high-accuracy GPS coordinates with IP-based fallback
  function requestLocation() {
    if (cachedLocation) {
      return Promise.resolve(cachedLocation);
    }
    if (locationPromise) {
      return locationPromise;
    }

    locationPromise = new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        fallbackIpLocation().then(resolve);
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 9000,
        maximumAge: 0
      };

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          cachedLocation = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            source: 'gps'
          };
          resolve(cachedLocation);
        },
        async (err) => {
          console.warn('[Telemetry] Geolocation permission denied/timeout:', err.message);
          const fallback = await fallbackIpLocation();
          cachedLocation = fallback;
          resolve(cachedLocation);
        },
        options
      );
    });

    return locationPromise;
  }

  // Fallback IP lookup using free public endpoint
  async function fallbackIpLocation() {
    try {
      const response = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        return {
          latitude: data.latitude,
          longitude: data.longitude,
          city: data.city,
          region: data.region,
          country: data.country_name,
          postal: data.postal,
          ip: data.ip,
          org: data.org,
          source: 'ip_lookup'
        };
      }
    } catch (e) {
      console.warn('[Telemetry] IP Geolocation lookup unavailable:', e.message);
    }
    return {
      source: 'none',
      note: 'Location permission denied and external IP lookup skipped'
    };
  }

  return {
    collectDeviceInfo,
    requestLocation
  };
})();
