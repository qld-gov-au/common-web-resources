/**
 * Function utilises the Haversine formula to calculate the distance between two geographical coordinates.
 * @param {Array | Object} coord1 - The first coordinate. Can be an array [latitude, longitude] or an object with {lat, lon} properties.
 * @param {Array | Object} coord2 - The second coordinate. Can be an array [latitude, longitude] or an object with {lat, lon} properties.
 * @returns {number} - The distance between the two coordinates in kilometers
 */

const R = 6371; // Radius of the earth in km

function haversineDistance(coord1, coord2) {
    const lat1 = Array.isArray(coord1) ? coord1[0] : coord1.lat;
    const lon1 = Array.isArray(coord1) ? coord1[1] : coord1.lon;
    const lat2 = Array.isArray(coord2) ? coord2[0] : coord2.lat;
    const lon2 = Array.isArray(coord2) ? coord2[1] : coord2.lon;

    // Distance between the coordinates
    const distanceLat = (lat2 - lat1) * Math.PI / 180;
    const distanceLon = (lon2 - lon1) * Math.PI / 180;

    // Convert to radians
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
  
    // Apply Haversine formula
    const a = Math.sin(distanceLat / 2) * Math.sin(distanceLat / 2) +
            Math.sin(distanceLon / 2) * Math.sin(distanceLon / 2) * 
            Math.cos(lat1Rad) * Math.cos(lat2Rad);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // Calculate the distance in km
    return R * c;
}


/**
 * Get lat lon of a given suburb and postcode using CKAN API.
 * This function is specific to Queensland, Australia
 * The resource_id is specific to the dataset used in the CKAN API
 * @param {*} suburb 
 * @param {*} postcode 
 * @returns 
 */
async function getLatLonCKAN(suburb, postcode) {
    const urlDataQld = 'https://www.data.qld.gov.au/api/3/action/datastore_search';
    const resourceId = '53537486-245a-4e4a-b7cd-7b2bdacdd896';
    let filters = {
        state: 'QLD',
    }
    if (suburb) {
        filters.locality = suburb.toUpperCase();
    }
    if (postcode) {
        filters.postcode = postcode.toUpperCase();
    }
    const apiUrl = `${urlDataQld}?resource_id=${resourceId}&filters=${JSON.stringify(filters)}&limit=1`;
    
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error('Response was not OK');
        }

        const data = await response.json();

        if (data.result.records[0] === undefined || data.result.records.length === 0) {
            console.error('No records found for the given suburb and postcode');
            return null;
        }
        return { lat: data.result.records[0].latitude, lon: data.result.records[0].longitude };
    }
    catch (error) {
        console.error('Error fetching location:', error);
        return null;
    }
}



// Function to get lat lon of a given address using Nominatim Open Street Map API
async function getLatLon(locationSearch) {
    const params = {
        countrycodes: 'au',
        viewbox: '137.995,-28.157,153.552,-10.684', // QLD
        bounded: 1,
        limit: 1,
        format: 'json'
    };
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationSearch)}&format=${params.format}&limit=${params.limit}&countrycodes=${params.countrycodes}&viewbox=${params.viewbox}&bounded=${params.bounded}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        return data[0] ? { lat: data[0].lat, lon: data[0].lon } : null;

    } catch (error) {
        console.error('Error fetching location:', error);
        return null;
    }
}