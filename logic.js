const map = new mapboxgl.Map({
    container: 'map', // container ID
    center: [-0.70140, 53.15791], // starting position [lng, lat]
    zoom: 15 // starting zoom
});

function parseXML(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "application/xml");
  return extractData(xmlDoc);
}

function extractData(xmlDoc) {
  const items = xmlDoc.getElementsByTagName('EstablishmentDetail');
  const resultArray = [];

  for (let i = 0; i < items.length; i++) {
    const name = items[i].getElementsByTagName('BusinessName')[0].textContent;
    const geocodes = items[i].getElementsByTagName('Geocode');
    // console.log(name);
    // console.log(geocodes);
    if (geocodes.length != 1) {
      continue;
    }

    const geocode = geocodes[0]

    const longitudetag = geocode.getElementsByTagName('Longitude')
    const latitudetag = geocode.getElementsByTagName('Latitude')
    if ((longitudetag.length != 1) || (latitudetag.length != 1)) {
      continue;
    }
    const longitude = parseFloat(longitudetag[0].textContent);
    const latitude = parseFloat(latitudetag[0].textContent);
    const entry = {
        'type': 'Feature',
        'geometry': {
            'type': 'Point',
            'coordinates': [ longitude, latitude ]
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
    return fetch(dataURL)
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

map.on('load', () => {
    // Add an image to use as a custom marker
    map.loadImage(
        'https://docs.mapbox.com/mapbox-gl-js/assets/custom_marker.png',
        (error, image) => {
            if (error) throw error;
            map.addImage('custom-marker', image);
            // Add a GeoJSON source with 2 points
            getEstablishmentData('FHRS221en-GB.xml')
              .then(features => {
                map.addSource('points', {
                    'type': 'geojson',
                    'data': {
                        'type': 'FeatureCollection',
                        'features': features
                    }
                  }
                );
                console.log("added points");
              }
            )
              .then(layer => {
                console.log("adding layer");
                // Add a symbol layer
                map.addLayer({
                    'id': 'points',
                    'type': 'symbol',
                    'source': 'points',
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
              })
            }
    );

    document.getElementById('searchnearby').addEventListener('click', () => {
      const {lng, lat} = map.getCenter();
      console.log('Button clicked at', lng, ',', lat);
    });

});
