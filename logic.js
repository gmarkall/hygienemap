function parseXML(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");
    return extractData(xmlDoc);
}

function extractData(xmlDoc) {
    const items = xmlDoc.getElementsByTagName('establishment');
    const resultArray = [];

    for (let i = 0; i < items.length; i++) {
        const name = items[i].getElementsByTagName('BusinessName')[0].textContent;
        const geocodes = items[i].getElementsByTagName('geocode');
        // console.log(name);
        // console.log(geocodes);
        if (geocodes.length != 1) {
            continue;
        }

        const geocode = geocodes[0]

        const longitudetag = geocode.getElementsByTagName('longitude')
        const latitudetag = geocode.getElementsByTagName('latitude')
        if ((longitudetag.length != 1) || (latitudetag.length != 1)) {
            continue;
        }
        const longitude = parseFloat(longitudetag[0].textContent);
        const latitude = parseFloat(latitudetag[0].textContent);
        const entry = {
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [longitude, latitude]
            },
            'properties': {
                'title': name
            }
        };
        resultArray.push(entry);
    }

    return resultArray;
}

function getEstablishmentData(dataURL) {
    const headers = {
        'x-api-version': '2',
        'Accept': 'application/xml'
    };

    return fetch(dataURL, {
            headers: headers
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not OK');
            }
            return response.text();
        })
        .then(data => parseXML(data))
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
        });
}

function getNearbyData(lng, lat) {
    const dataURL = `https://api.ratings.food.gov.uk/Establishments?longitude=${lng}&latitude=${lat}`
    console.log('Fetching from', dataURL);
    const sourcename = `points${pointsources}`;
    pointsources += 1;
    console.log('Adding source', sourcename);
    getEstablishmentData(dataURL)
        .then(features => {
            map.addSource(sourcename, {
                'type': 'geojson',
                'data': {
                    'type': 'FeatureCollection',
                    'features': features
                }
            });
            console.log("added points");
        })
        .then(layer => {
            console.log("adding layer");
            // Add a symbol layer
            map.addLayer({
                'id': sourcename,
                'type': 'symbol',
                'source': sourcename,
                'layout': {
                    'icon-image': 'custom-marker',
                    // get the title name from the source's "title" property
                    'text-field': ['get', 'title'],
                    'text-font': [
                        'Open Sans Semibold',
                        'Arial Unicode MS Bold'
                    ],
                    'text-offset': [0, 1.25],
                    'text-anchor': 'top'
                }
            });

            // When a click event occurs on a feature in the places layer, open a popup at the
            // location of the feature, with description HTML from its properties.
            map.on('click', sourcename, (e) => {
                // Copy coordinates array.
                const coordinates = e.features[0].geometry.coordinates.slice();
                const description = e.features[0].properties.title;

                // Ensure that if the map is zoomed out such that multiple
                // copies of the feature are visible, the popup appears
                // over the copy being pointed to.
                while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                    coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                }

                new mapboxgl.Popup()
                    .setLngLat(coordinates)
                    .setHTML(description)
                    .addTo(map);
            });

            // Change the cursor to a pointer when the mouse is over the places layer.
            map.on('mouseenter', sourcename, () => {
                map.getCanvas().style.cursor = 'pointer';
            });

            // Change it back to a pointer when it leaves.
            map.on('mouseleave', sourcename, () => {
                map.getCanvas().style.cursor = '';
            });
        });
}

const map = new mapboxgl.Map({
    container: 'map', // container ID
    center: [-0.70140, 53.15791], // starting position [lng, lat]
    zoom: 15 // starting zoom
});

map.on('load', () => {
    // Add an image to use as a custom marker
    map.loadImage(
        'https://docs.mapbox.com/mapbox-gl-js/assets/custom_marker.png',
        (error, image) => {
            if (error) throw error;
            map.addImage('custom-marker', image);
        }
    );

    document.getElementById('searchnearby').addEventListener('click', () => {
        const {
            lng,
            lat
        } = map.getCenter();
        console.log('Button clicked at', lng, ',', lat);
        getNearbyData(lng, lat);
    });

});

pointsources = 0;
