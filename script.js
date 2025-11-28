const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSosfBP3StMyRUzwI0tUZPsLjPVH1zePCz8gZbTMOzjOvnonbmNCoy5VT46UxO0qdqb-Wm9EqTpXp8y/pub?gid=2049973263&single=true&output=csv'; // <<< REPLACE THIS!

// --- Map Initialization ---
let map; 

// 1. Data Retrieval and Icon Preloading
function loadData() {
    Papa.parse(SHEET_CSV_URL, {
        download: true,
        header: true,
        complete: function(results) {
            const data = results.data.filter(row => row.AWS_Name);
            if (data.length > 0) {
                // Set the date/time
                const dateElement = document.getElementById('rainfall-date');
                if (data[0].Date) {
                    dateElement.innerHTML = `<br>${data[0].Date}`;
                }

                // Preload custom icons (still necessary if the map uses them)
                const iconPromises = data
                    .filter(item => item.Icon_URL)
                    .map(item => new Promise(resolve => {
                        const img = new Image();
                        img.crossOrigin = 'anonymous'; 
                        img.onload = resolve;
                        img.onerror = resolve; 
                        img.src = item.Icon_URL;
                    }));
                
                // Wait for all icons to load before initializing the map
                Promise.all(iconPromises).then(() => {
                    populateTable(data);
                    initMap(data);
                });

            } else {
                 document.getElementById('rainfall-date').innerHTML = `7-Day Rainfall Accumulation (mm)<br>No Data Available`;
            }
        },
        error: function(err, file, inputElem, reason) {
            console.error("Papa Parse error:", err, reason);
            alert("Failed to load data from Google Sheet.");
        }
    });
}

// 2. Populate Table (Unchanged)
function populateTable(data) {
    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = ''; 

    data.forEach(row => {
        const tr = document.createElement('tr');
        let warningClass = '';
        const warningValue = row.Warning ? row.Warning.trim() : 'N/A'; 
        switch(warningValue) {
            case '1': warningClass = 'warning-1'; break;
            case '2': warningClass = 'warning-2'; break;
            case '3': warningClass = 'warning-3'; break;
            case 'N/A': warningClass = 'warning-na'; break;
            default: warningClass = 'warning-na';
        }

        tr.innerHTML = `
            <td>${row.AWS_Name || ''}</td>
            <td>${row.Municipality || ''}</td>
            <td>${row.Cumulative ? `${row.Cumulative} mm` : ''}</td>
            <td class="${warningClass}">${warningValue}</td>
        `;
        tableBody.appendChild(tr);
    });
}

// Function in script.js
// 3. Map Initialization 
function initMap(data) {
    if (map) { map.remove(); }
    
    map = L.map('advisory-map').setView([12.46110, 124.60521], 10); 

    // Tile Layer setup with crossOrigin
    L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}',{
        maxZoom: 20,
        subdomains:['mt0','mt1','mt2','mt3'],
        attribution: 'Map data &copy; <a href="https://www.google.com/maps">Google</a>, Imagery &copy; <a href="https://www.google.com/maps">Google</a>',
        maxZoom: 18,
        crossOrigin: true
    }).addTo(map);

    const bounds = [];
    data.forEach(item => {
        const lat = parseFloat(item.Lat);
        const lng = parseFloat(item.Lng);
        if (isNaN(lat) || isNaN(lng)) return; 
        
        const center = [lat, lng];
        const radius = 20000; 
        let circleColor = '#555555'; 
        let fillColor = '#555566'; // Using a slightly different dark color for the fill
        const warningValue = item.Warning ? item.Warning.trim() : 'N/A';
        switch(warningValue) {
            case '1': circleColor = '#ffc107'; fillColor = '#ffc107'; break; 
            case '2': circleColor = '#fd7e14'; fillColor = '#fd7e14'; break; 
            case '3': circleColor = '#dc3545'; fillColor = '#dc3545'; break; 
        }

        // Add 20km Buffer (Circle)
        const circle = L.circle(center, {
            color: circleColor,
            fillColor: fillColor,
            fillOpacity: 0.3,
            weight: 2,
            radius: radius,
           dashArray: 5.10
         
        }).addTo(map).bindPopup(`<b>${item.AWS_Name || 'N/A'}</b><br>Warning: ${warningValue}`);

        // === NEW FIX: Bind a permanent tooltip (Label) to the circle ===
        circle.bindTooltip(item.AWS_Name || 'N/A', {
            permanent: true,       // Makes the label always visible
            direction: 'center',   // Centers the label over the circle's center
            className: 'aws-label' // Custom class for styling the label
        }).openTooltip();
        // =============================================================

        bounds.push(circle.getBounds());

        // Add Marker with Custom Icon (Remains unchanged)
        if (item.Icon_URL) {
            const customIcon = L.icon({
                iconUrl: item.Icon_URL,
                iconSize: [36, 36],
                iconAnchor: [18, 36]
            });
            L.marker(center, {icon: customIcon}).addTo(map);
        }
    });

    if (bounds.length > 0) {
        const allBounds = L.featureGroup(bounds).getBounds();
        map.fitBounds(allBounds.pad(0.5));
    }
}
// 4. Download Functionality (REMOVED) - The entire function block is gone.

window.onload = loadData;