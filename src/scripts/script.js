document.addEventListener("DOMContentLoaded", function() {
    const passwordModal = new bootstrap.Modal(document.getElementById('passwordModal'));
    passwordModal.show();

    document.getElementById('submitPassword').addEventListener('click', async function() {
        const enteredPassword = document.getElementById('passwordInput').value;
        const passwordError = document.getElementById('passwordError');

        try {
            const response = await fetch(`https://crowdcount.tech/api/check_admin_password?password=${enteredPassword}`);
            const data = await response.json();

            if (data.is_password_correct) {
                sessionStorage.setItem('adminPassword', enteredPassword); // Store the password in sessionStorage
                passwordModal.hide();
                initializeApplication();
            } else {
                passwordError.style.display = 'block';
            }
        } catch (error) {
            console.error('Error:', error);
            passwordError.textContent = 'An error occurred. Please try again.';
            passwordError.style.display = 'block';
        }
    });
});

// Function to retrieve the password from session storage
function getAdminPassword() {
    return sessionStorage.getItem('adminPassword');
}

// Function to initialize the application after password verification
function initializeApplication() {
    // Initialize AOS (Animate on Scroll)
    AOS.init({
        duration: 1000,
        once: true
    });

    function updatePeopleCounter(callback) {
        const counter = document.getElementById('peopleCounter-dashboard');
        const apiUrl = 'https://crowdcount.tech/api/totalcount'; // Use full URL

        console.log('Fetching data from:', apiUrl); // Log the URL

        fetch(apiUrl, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Data received:', data);
            animateCounter(counter, data.total_count, callback);
        })
        .catch(error => {
            console.error('Error fetching total count:', error);
            // Animate to 404 in case of error
            animateCounter(counter, 404, callback);
        });
    }

    function updateOnlineUsersCounter(callback) {
        const counter = document.getElementById('onlineUsersCounter');
        const apiUrl = 'https://crowdcount.tech/api/active_count?password=' + getAdminPassword();

        console.log('Fetching data from:', apiUrl); // Log the URL

        fetch(apiUrl, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Data received:', data);
            animateCounter(counter, data.active_count, callback);
        })
        .catch(error => {
            console.error('Error fetching online users count:', error);
            // Animate to 404 in case of error
            animateCounter(counter, 404, callback);
        });
    }

    function animateCounter(counter, targetCount, callback) {
        let currentCount = parseInt(counter.textContent.replace(/,/g, '')) || 0;
        console.log('Starting animation from', currentCount, 'to', targetCount); // Log animation start

        const duration = 2000; // Duration of the animation in milliseconds
        const frameRate = 50; // Frame rate of the animation in milliseconds
        const totalFrames = duration / frameRate;
        let frame = 0;

        const interval = setInterval(() => {
            frame++;
            const progress = frame / totalFrames;
            currentCount = Math.round(currentCount + (targetCount - currentCount) * progress);
            console.log('Current count at frame', frame, ':', currentCount); // Log current count at each frame

            counter.textContent = currentCount.toLocaleString();

            if (frame >= totalFrames) {
                clearInterval(interval);
                counter.textContent = targetCount.toLocaleString();
                console.log('Animation completed with final count:', targetCount); // Log animation completion
                if (callback) callback();
            }
        }, frameRate);
    }

    function updateActiveAlert(callback) {
        const counter = document.getElementById('activeAlert');
        const apiUrl = 'https://crowdcount.tech/api/check_if_alert';

        console.log('Fetching data from:', apiUrl); // Log the URL

        fetch(apiUrl, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Data received:', data);

            if (typeof data.is_alert === 'boolean') {
                if (data.is_alert) {
                    console.log('Active alert is YES');
                    counter.textContent = "Yes";
                    callback("Yes");
                } else {
                    console.log('Active alert is NO');
                    counter.textContent = "No";
                    callback("No");
                }
            } else {
                console.warn('Unexpected is_alert value:', data.is_alert);
                counter.textContent = "Unknown";
                callback("Unknown");
            }
        })
        .catch(error => {
            console.error('Error fetching active alert:', error);
            counter.textContent = "Error";
            callback("Error");
        });
    }

    function startContinuousUpdate() {
        function update() {
            updatePeopleCounter(() => {
                setTimeout(update, 3000); // Wait 3 seconds before next update
            });
        }

        function updateOnlineUsers() {
            updateOnlineUsersCounter(() => {
                setTimeout(updateOnlineUsers, 5000); // Wait 5 seconds before next update
            });
        }

        function updateAlerts() {
            updateActiveAlert(() => {
                setTimeout(updateAlerts, 5000); // Wait 5 seconds before next update
            });
        }

        update(); // Start the first update for people counter
        updateOnlineUsers(); // Start the first update for online users counter
        updateAlerts(); // Start the first update for alerts
    }

    startContinuousUpdate();

    // Typewriter animation
    const typewriterConfigurations = [
        { elementId: 'CrowdCountAPI', text: 'CrowdCount API', hideCursorAfter: 3800 },
        { elementId: 'CrowdCountABOUT', text: 'About & Contact', hideCursorAfter: 3800 },
        { elementId: 'CrowdCountPRODUCTS', text: 'CrowdCount Products', hideCursorAfter: 3300 },
        { elementId: 'CrowdCountLEGAL', text: 'Legal Information', hideCursorAfter: 3500 },
        { elementId: 'CrowdCountMAP', text: 'CrowdCount Map', hideCursorAfter: 3800 },
        { elementId: 'CrowdCountDEV', text: 'Developer Dashboard', hideCursorAfter: 3300 }
    ];

    typewriterConfigurations.forEach(config => {
        const app = document.getElementById(config.elementId);

        if (app) {
            const typewriter = new Typewriter(app, {
                loop: false,
                delay: 50,
                cursor: '_', // Customize cursor if needed
            });

            typewriter.typeString(config.text)
                .callFunction(() => {
                    // Hide the cursor after typing is complete
                    setTimeout(() => {
                        app.querySelector('.Typewriter__cursor').style.display = 'none';
                    }, config.hideCursorAfter);
                })
                .start();
        }
    });

    function copyToClipboard() {
        const textToCopy = "https://www.crowdcount.tech/api/get_day_data?user_id=EXAMPLE&password=example&date=2024-07-05";
        const tempInput = document.createElement("input");
        document.body.appendChild(tempInput);
        tempInput.value = textToCopy;
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
        
        const button = document.querySelector(".mobile-button");
        const originalText = button.textContent;
        button.textContent = "Link Copied!";
        setTimeout(() => {
            button.textContent = originalText;
        }, 3000); // Change text back after 3 seconds
    }

    document.querySelectorAll('.ripple').forEach(button => {
        button.addEventListener('click', function (e) {
            const rect = this.getBoundingClientRect();
            const ripple = document.createElement('span');

            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            ripple.classList.add('ripple-effect');

            const rippleEffect = this.querySelector('.ripple-effect');
            if (rippleEffect) {
                rippleEffect.remove();
            }

            this.appendChild(ripple);

            // Store the ripple state in session storage
            sessionStorage.setItem('ripple', JSON.stringify({
                href: this.href,
                x: x,
                y: y,
                size: size,
                page: window.location.pathname
            }));
        });
    });

    document.querySelectorAll('.text-box').forEach(box => {
        box.addEventListener('click', function (e) {
            const rect = this.getBoundingClientRect();
            const ripple = document.createElement('span');

            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            ripple.classList.add('ripple-effect');

            const rippleEffect = this.querySelector('.ripple-effect');
            if (rippleEffect) {
                rippleEffect.remove();
            }

            this.appendChild(ripple);

            setTimeout(() => ripple.remove(), 600); // Remove the ripple after the animation
        });
    });

    const token = 'eyJraWQiOiI3MjJWVVE3WUM1IiwidHlwIjoiSldUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiI0NVQ1NlFCMlBZIiwiaWF0IjoxNzIxMzk5MzkzLCJvcmlnaW4iOiJjcm93ZGNvdW50LnRlY2gifQ.ObhQXdcjpuahFJ1ypktveapc5tRbVH6arp7I8sqwU_PKkyIN5jY-DvuLu2c-uo3eL4XnyBvFYazE7xmkkBsjbg';

    mapkit.init({
        authorizationCallback: function(done) {
            done(token);
        }
    });

    // Create a new map with dark mode
    const map = new mapkit.Map("map", {
        center: new mapkit.Coordinate(40.01833, -105.28202), // Center the map on CrowdCount HQ
        colorScheme: mapkit.Map.ColorSchemes.Dark // Enable dark mode
    });

    // Function to fetch current count for a specific user
    async function fetchCurrentCount(userId) {
        try {
            const response = await fetch(`https://crowdcount.tech/api/currentcount?user_id=${userId}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            return data.current_count;
        } catch (error) {
            console.error('Fetch error:', error);
            return 'Server Error';
        }
    }

    // Function to fetch locations from the API
    async function fetchLocations() {
        try {
            const response = await fetch('https://crowdcount.tech/api/get_all_locations');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            return data.locations;
        } catch (error) {
            console.error('Fetch error:', error);
            return [];
        }
    }

    // Initialize the map with locations from the API
    async function initMap() {
        const locations = await fetchLocations();

        const mapLocations = locations.map(location => ({
            coordinate: new mapkit.Coordinate(location[3], location[4]),
            title: location[0],
            userId: location[2]
        }));

        // Add annotations to the map
        mapLocations.forEach(async (location) => {
            const currentCount = await fetchCurrentCount(location.userId);
            const annotation = new mapkit.MarkerAnnotation(location.coordinate, {
                title: location.title,
                subtitle: `Count: ${currentCount}`,
            });
            map.addAnnotation(annotation);
        });

        // Zoom in more using setRegionAnimated
        const newCenter = new mapkit.Coordinate(40.00907, -105.27124);
        const newSpan = new mapkit.CoordinateSpan(0.035, 0.035); // Adjust span to fit all annotations
        const newRegion = new mapkit.CoordinateRegion(newCenter, newSpan);

        // Set the new region with animation
        map.setRegionAnimated(newRegion);
    }

    // Call the initMap function to load the locations and annotations
    initMap();

    // API Call Functions using stored password

    async function addLocation(locationData) {
        locationData.password = getAdminPassword();

        try {
            const response = await fetch('https://crowdcount.tech/api/add_location', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(locationData)
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error);
            }
            return data.message;
        } catch (error) {
            console.error('Error:', error);
            return error.message;
        }
    }

    async function removeLocation(device) {
        const password = getAdminPassword();
        const data = { device, password };

        try {
            const response = await fetch('https://crowdcount.tech/api/remove_location', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            const responseData = await response.json();
            if (!response.ok) {
                throw new Error(responseData.error);
            }
            return responseData.message;
        } catch (error) {
            console.error('Error:', error);
            return error.message;
        }
    }

    async function getAllLocations() {
        try {
            const response = await fetch('https://crowdcount.tech/api/get_all_locations');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            return data.locations;
        } catch (error) {
            console.error('Fetch error:', error);
            return [];
        }
    }

    async function resolveReport(reportId) {
        const password = getAdminPassword();
        const data = { report_id: reportId, password };

        try {
            const response = await fetch('https://crowdcount.tech/api/resolve_report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            const responseData = await response.json();
            if (!response.ok) {
                throw new Error(responseData.error);
            }
            return responseData.message;
        } catch (error) {
            console.error('Error:', error);
            return error.message;
        }
    }

    async function getAllReports() {
        const password = getAdminPassword();

        try {
            const response = await fetch(`https://crowdcount.tech/api/get_all_reports?password=${password}`);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error);
            }
            return data.reports;
        } catch (error) {
            console.error('Error:', error);
            return [];
        }
    }

    async function getReportsForLocation(location) {
        const password = getAdminPassword();

        try {
            const response = await fetch(`https://crowdcount.tech/api/get_reports_for_location?location=${location}&password=${password}`);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error);
            }
            return data.reports;
        } catch (error) {
            console.error('Error:', error);
            return [];
        }
    }

    async function getReportsForUser(userEmail) {
        const password = getAdminPassword();

        try {
            const response = await fetch(`https://crowdcount.tech/api/get_reports_for_user?user_email=${userEmail}&password=${password}`);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error);
            }
            return data.reports;
        } catch (error) {
            console.error('Error:', error);
            return [];
        }
    }

    async function getReportsForStatus(reportStatus) {
        const password = getAdminPassword();

        try {
            const response = await fetch(`https://crowdcount.tech/api/get_reports_for_status?status=${reportStatus}&password=${password}`);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error);
            }
            return data.reports;
        } catch (error) {
            console.error('Error:', error);
            return [];
        }
    }

    async function deleteReport(reportId) {
        const password = getAdminPassword();
        const data = { report_id: reportId, password };

        try {
            const response = await fetch('https://crowdcount.tech/api/delete_report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            const responseData = await response.json();
            if (!response.ok) {
                throw new Error(responseData.error);
            }
            return responseData.message;
        } catch (error) {
            console.error('Error:', error);
            return error.message;
        }
    }

    async function getActiveCount() {
        const password = getAdminPassword();

        try {
            const response = await fetch(`https://crowdcount.tech/api/active_count?password=${password}`);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error);
            }
            return data.active_count;
        } catch (error) {
            console.error('Error:', error);
            return 'Server Error';
        }
    }

    // Example usage of the API functions
    document.getElementById('addLocationButton').addEventListener('click', async function() {
        const color = colorInput.value.toLowerCase();
        if (!validColors[color]) {
            alert('Please enter a valid color: ' + Object.keys(validColors).join(', '));
            return;
        }
        const locationData = {
            name: document.getElementById('locationName').value,
            address: document.getElementById('locationAddress').value,
            device: document.getElementById('locationDevice').value,
            longitude: document.getElementById('locationLongitude').value,
            latitude: document.getElementById('locationLatitude').value,
            color: document.getElementById('locationColor').value,
            icon: document.getElementById('locationIcon').value
        };
        const message = await addLocation(locationData);
        console.log(message);
    });

    document.getElementById('removeLocationButton').addEventListener('click', async function() {
        const device = document.getElementById('removeLocationDevice').value;
        const message = await removeLocation(device);
        console.log(message);
    });

    // Fetch all locations and display them
    getAllLocations().then(locations => {
        const locationsList = document.getElementById('locationsList');
        locationsList.innerHTML = locations.map(location => `<div>${location.name}</div>`).join('');
    });

    // Fetch all reports and display them
    getAllReports().then(reports => {
        const reportsList = document.getElementById('reportsList');
        reportsList.innerHTML = reports.map(report => `<div>${report.date}: ${report.description}</div>`).join('');
    });

    document.getElementById('toggleReports').addEventListener('click', async function() {
        const reportsList = document.getElementById('reportsList');
        const isShowingPending = reportsList.getAttribute('data-showing') === 'pending';

        const reports = await getAllReports();
        const filteredReports = reports.filter(report => report.status === (isShowingPending ? 'resolved' : 'pending'));

        reportsList.setAttribute('data-showing', isShowingPending ? 'resolved' : 'pending');
        reportsList.innerHTML = filteredReports.map(report => `<div>${report.date}: ${report.description}</div>`).join('');
    });

    document.getElementById('resolveReportButton').addEventListener('click', async function() {
        const reportId = document.getElementById('resolveReportId').value;
        const message = await resolveReport(reportId);
        console.log(message);
    });

    document.getElementById('deleteReportButton').addEventListener('click', async function() {
        const reportId = document.getElementById('deleteReportId').value;
        const message = await deleteReport(reportId);
        console.log(message);
    });

    document.getElementById('countReportsButton').addEventListener('click', async function() {
        const locationName = document.getElementById('locationNameForReports').value;
        const reports = await getReportsForLocation(locationName);
        document.getElementById('reportCountResult').textContent = `Reports count: ${reports.length}`;
    });
}

document.getElementById('addAlert').addEventListener('click', async function() {
    const title = document.getElementById('alertTitle').value;
    const body = document.getElementById('alertBody').value;
    const alertType = document.getElementById('alertType').value;
    const expires = document.getElementById('alertExpiry').value;

    const alertData = {
        password: getAdminPassword(),
        title: title,
        body: body,
        expires: expires,
        alert_type: alertType
    };

    try {
        const response = await fetch('https://crowdcount.tech/api/send_alert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(alertData)
        });

        const data = await response.json();

        if (response.ok) {
            alert("Alert sent successfully: " + data.message);
            document.getElementById('addAlertForm').reset(); // Clear the form after successful submission
        } else {
            alert("Error: " + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert("An error occurred while sending the alert. Please try again.");
    }
});

 // Function to retrieve the password from session storage
 function getAdminPassword() {
    return sessionStorage.getItem('adminPassword');
}

// Fetch and display the current alert
async function fetchCurrentAlert() {
    try {
        const response = await fetch('https://crowdcount.tech/api/get_active_alert', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.alert_info && data.alert_info.length > 0) {
            const alertInfo = data.alert_info[0]; // Assuming you only need to display the first alert

            document.querySelector('.alertTitle').textContent = alertInfo.title || 'No active alert';
            document.querySelector('.alertBody').textContent = alertInfo.body || '';
            document.querySelector('.alertType').textContent = alertInfo.alert_type || '';
            document.querySelector('.alertExpiry').textContent = alertInfo.expires || ''; // Ensure `expires` is available in the object
            document.querySelector('.alertID').textContent = alertInfo.alert_id || '';

            // Pre-fill the remove alert ID field
            document.getElementById('removeAlertID').value = alertInfo.alert_id || '';
        } else {
            // Handle case where there's no active alert
            document.querySelector('.alertTitle').textContent = 'No active alert';
            document.querySelector('.alertBody').textContent = '';
            document.querySelector('.alertType').textContent = '';
            document.querySelector('.alertExpiry').textContent = '';
            document.querySelector('.alertID').textContent = '';
            document.getElementById('removeAlertID').value = '';
        }
    } catch (error) {
        console.error('Error fetching current alert:', error);
        alert("An error occurred while fetching the current alert. Please try again.");
    }
}

// Expire (remove) the current alert
document.getElementById('removeAlertButton').addEventListener('click', async function() {
    const alertID = document.getElementById('removeAlertID').value;

    if (!alertID) {
        alert("Please enter an Alert ID.");
        return;
    }

    try {
        const response = await fetch(`https://crowdcount.tech/api/expire_alert?alert_id=${alertID}&password=${getAdminPassword()}`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        if (response.ok) {
            alert("Alert removed successfully: " + data.message);
            fetchCurrentAlert(); // Refresh the displayed alert information
        } else {
            alert("Error: " + data.error);
        }
    } catch (error) {
        console.error('Error expiring alert:', error);
        alert("An error occurred while expiring the alert. Please try again.");
    }
});

// Fetch the current alert when the page loads
document.addEventListener('DOMContentLoaded', function() {
    fetchCurrentAlert();
});

// Fetch and display the list of all locations
async function fetchAndDisplayLocations() {
    try {
        const response = await fetch('https://crowdcount.tech/api/get_all_locations', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.locations && data.locations.length > 0) {
            const locationsList = document.getElementById('locationsList');
            locationsList.innerHTML = ''; // Clear any existing content

            data.locations.forEach(location => {
                // Create a div or any other HTML element to represent a location
                const locationElement = document.createElement('div');
                locationElement.classList.add('location-item');

                // Add location details
                locationElement.innerHTML = `
                    <strong>Name:</strong> ${location[0] || 'Unnamed'}<br>
                    <strong>Address:</strong> ${location[1] || 'N/A'}<br>
                    <strong>Device ID:</strong> ${location[2]}<br>
                    <strong>Coordinates:</strong> (${location[3]}, ${location[4]})<br>
                    <strong>Color:</strong> ${location[5]}<br>
                    <strong>Icon:</strong> ${location[6]}
                `;

                // Append the location element to the list
                locationsList.appendChild(locationElement);
            });
        } else {
            // Handle case where there are no locations
            document.getElementById('locationsList').innerHTML = 'No locations available.';
        }
    } catch (error) {
        console.error('Error fetching locations:', error);
        document.getElementById('locationsList').innerHTML = 'An error occurred while fetching locations.';
    }
}

const validColors = {
    red: 'rgb(255, 59, 48)',
    orange: 'rgb(255, 149, 0)',
    yellow: 'rgb(255, 204, 0)',
    green: 'rgb(52, 199, 89)',
    mint: 'rgb(0, 199, 190)',
    teal: 'rgb(48, 176, 199)',
    cyan: 'rgb(50, 173, 230)',
    blue: 'rgb(0, 122, 255)',
    indigo: 'rgb(88, 86, 214)',
    purple: 'rgb(175, 82, 222)',
    pink: 'rgb(255, 45, 85)',
    brown: 'rgb(162, 132, 94)'
};

const colorInput = document.getElementById('locationColor');

// Validate and change background color based on input
colorInput.addEventListener('input', function() {
    const color = colorInput.value.toLowerCase();
    if (validColors[color]) {
        colorInput.style.backgroundColor = validColors[color];
    } else {
        colorInput.style.backgroundColor = ''; // Reset to default if the color is invalid
    }
});

// Fetch and display the locations when the page loads
document.addEventListener('DOMContentLoaded', fetchAndDisplayLocations);

let showingPending = true; // Track whether we're showing pending or resolved reports

// Function to retrieve the password from session storage
function getAdminPassword() {
    return sessionStorage.getItem('adminPassword');
}

// Fetch and display the list of reports, filtered by status
async function fetchAndDisplayReports() {
    try {
        const response = await fetch(`https://crowdcount.tech/api/get_all_reports?password=${getAdminPassword()}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.reports && data.reports.length > 0) {
            const reportsList = document.getElementById('reportsList');
            reportsList.innerHTML = ''; // Clear any existing content

            // Filter reports based on their status
            const filteredReports = data.reports.filter(report => 
                showingPending ? report.report_status === 'pending' : report.report_status === 'resolved'
            );

            // Sort reports by date, newest first
            filteredReports.sort((a, b) => new Date(b.date) - new Date(a.date));

            // Display each report
            filteredReports.forEach(report => {
                const reportElement = document.createElement('div');
                reportElement.classList.add('report-item');

                reportElement.innerHTML = `
                    <strong>Date:</strong> ${new Date(report.date).toLocaleString()}<br>
                    <strong>Location:</strong> ${report.location || 'N/A'}<br>
                    <strong>Report ID:</strong> ${report.report_id}<br>
                    <strong>Status:</strong> ${report.report_status}<br>
                    <strong>User:</strong> ${report.user_name} (${report.user_email})<br>
                    <strong>Content:</strong> ${report.report_content}<br>
                `;

                reportsList.appendChild(reportElement);
            });

            if (filteredReports.length === 0) {
                reportsList.innerHTML = 'No reports available for the selected status.';
            }
        } else {
            document.getElementById('reportsList').innerHTML = 'No reports available.';
        }
    } catch (error) {
        console.error('Error fetching reports:', error);
        document.getElementById('reportsList').innerHTML = 'An error occurred while fetching reports.';
    }
}

// Toggle between showing pending and resolved reports
document.getElementById('toggleReportsButton').addEventListener('click', function() {
    showingPending = !showingPending;
    fetchAndDisplayReports();
});

// Fetch and display reports when the page loads
document.addEventListener('DOMContentLoaded', fetchAndDisplayReports);