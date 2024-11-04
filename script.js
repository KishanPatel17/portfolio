const searchBox = document.getElementById("routeInput");
const searchButton = document.getElementById("searchButton");

// Function to fetch and parse XML data from the given URL
async function getData() {
  const url = "https://webservices.umoiq.com/service/publicXMLFeed?command=vehicleLocations&a=ttc";
  const response = await fetch(url);

  // Check if the response is OK (status 200-299)
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const text = await response.text();
  const parser = new DOMParser();
  return parser.parseFromString(text, 'application/xml');
}

// Function to find the location of a bus given its route number
async function findBusLocation(routeNumber, map) {
  try {
    // Fetch and parse the XML data
    const xmlData = await getData();
    const vehicles = xmlData.getElementsByTagName('vehicle');

    // Loop through each vehicle to find the one with the matching route number
    let lat, lon;
    for (let vehicle of vehicles) {
      if (vehicle.getAttribute('routeTag') === routeNumber) {
        let busString = vehicle.getAttribute('dirTag');
        let directionString = await getDirection(routeNumber, busString);
        lat = vehicle.getAttribute('lat');
        lon = vehicle.getAttribute('lon');
        console.log("latitude = " + lat + ", longitude = " + lon + " direction: " + directionString);

        var myIcon = L.icon({
          iconUrl: './images/bus.png',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        var marker = L.marker([lat, lon], {icon: myIcon}).addTo(map);
        //bindPopup(marker);
        marker.bindPopup(routeNumber + " " + directionString);
      }
    }

  } catch (error) {
    console.error('Error fetching data:', error);
  }

  searchBox.value = "";

}

// Function to fetch direction data from a JSON file
async function getDirectionData() {
  try {
      const response = await fetch('./busDirections.json');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      return data;
  } catch (error) {
      console.error('Error fetching data:', error);
  }
}

async function getDirection(routeNumber, busString) {

  const splitBusString = busString.split('_');
  const directionCode = splitBusString[1];
  const actualBusName = splitBusString[2];
  console.log('direction code = ' + directionCode + ' and actual bus name: ' + actualBusName);


  // Fetch direction data from a JSON file
  const directionData = await getDirectionData();
  if (!directionData) {
    console.error('No data fetched');
    return;
  }
  
  // Determine the direction:
  let direction;
  if (directionData.horizontalBusses.some(bus => bus.routeNumber.toString() === routeNumber)) {
    console.log("horizontal");
    if (directionCode === "1") {
      direction = "West";
    } else {
      direction = "East";
    }

  } else if (directionData.verticalBusses.some(bus => bus.routeNumber.toString() === routeNumber)) {
    console.log("vertical");
    if (directionCode === "1") {
      direction = "North";
    } else {
      direction = "South";
    }

  } else {
    console.log('Bus not found');
    return 'error';
  }

  return direction;
}

let map = null;
// Start waiting for the first input
handleNewInput();

function createMap() {
  var map = L.map('map').setView([43.7214208, -79.424743], 11);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  console.log("created map");

  return map;
}

function waitForNewInput() {
  return new Promise((resolve) => {
    searchButton.addEventListener('click', () => {
      resolve('New input received');
      console.log("new input");
    }); // Ensure the event listener is only called once

    searchBox.addEventListener("keydown", (event) => {
      if (event.key === 'Enter') {
        resolve('New input received');
        console.log("enter pressed");
      }
    });
  });
}

function resetMap() {
  if (map) {
    map.remove();
    document.getElementById('map').innerHTML = ''; // Clear the map div
    console.log("reset map")
  }
  console.log("returning");
  return createMap(); // Create a new map
}

function handleNewInput() {
  waitForNewInput().then(() => {
    console.log("done waiting for new input");
    map = resetMap(map);
    findBusLocation(searchBox.value, map);
    handleNewInput(); // Call the function again to wait for the next input
  });
}

