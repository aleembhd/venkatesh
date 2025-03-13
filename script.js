// Add Firebase configuration at the top of the file
const firebaseConfig = {
    apiKey: "AIzaSyCLrrkbXcW-exG8_n4kOEmzA-SETMWqo-0",
    authDomain: "feedbackapp-5904d.firebaseapp.com",
    databaseURL: "https://feedbackapp-5904d-default-rtdb.firebaseio.com",
    projectId: "feedbackapp-5904d",
    storageBucket: "feedbackapp-5904d.firebasestorage.app",
    messagingSenderId: "620175464767",
    appId: "1:620175464767:web:8054286a27a26210619b8a",
    measurementId: "G-QH8JN7TE0J"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// At the top of script.js, after Firebase initialization
firebase.database().enablePersistence()
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('Browser doesn\'t support persistence');
    }
});

// Set initial data fetch to keep data fresh
firebase.database().goOnline();

let callData = {
    details: []
};

// Add this new function to filter today's calls
function isTodayCall(dateTimeStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Parse the dateTime string (format: "DD/MM/YY HH:mm")
    const [datePart] = dateTimeStr.split(' ');
    const [day, month, year] = datePart.split('/');
    const callDate = new Date(2000 + parseInt(year), parseInt(month) - 1, parseInt(day));
    callDate.setHours(0, 0, 0, 0);
    
    return callDate.getTime() === today.getTime();
}

// Add this new function for fetching call logs
function initializeCallLogFetching() {
    const adminEmail = localStorage.getItem('adminEmail');
    if (!adminEmail) {
        console.error('No admin email found in localStorage');
        return;
    }

    const adminNumber = adminEmail.match(/\d+/);
    if (!adminNumber) {
        console.error('Could not extract number from admin email:', adminEmail);
        return;
    }

    const telecallerName = `telecaller${adminNumber[0]}`;
    const telecallerRef = database.ref(telecallerName);

    // First, get cached data (this will be very fast)
    telecallerRef.once('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            processAndUpdateUI(data);
        }
    });

    // Then set up real-time listener for updates
    telecallerRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            processAndUpdateUI(data);
        }
    });
}

// Add this new helper function
function processAndUpdateUI(data) {
    const allCalls = Object.entries(data).map(([key, value]) => ({
        ...value,
        id: key
    }));

    // Update summary counts immediately
    const summary = {
        total: allCalls.length,
        interested: allCalls.filter(call => call.status === 'Interested').length,
        notInterested: allCalls.filter(call => call.status === 'Not Interested').length,
        callback: allCalls.filter(call => call.status === 'Callback').length,
        unanswered: allCalls.filter(call => call.status === 'Unanswered').length
    };

    // Update UI with counts
    document.getElementById('totalCallsSummary').textContent = summary.total;
    document.getElementById('interestedCallsSummary').textContent = summary.interested;
    document.getElementById('notInterestedCallsSummary').textContent = summary.notInterested;
    document.getElementById('callBackCallsSummary').textContent = summary.callback;
    document.getElementById('unansweredCallsSummary').textContent = summary.unanswered;

    // Store the full data for later use
    window.callData = {
        details: allCalls,
        summary: summary
    };

    // Update progress bar
    updateProgressBar(summary.total);
}

// Call the initialization function when the page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeCallLogFetching();
    
    const adminEmail = localStorage.getItem('adminEmail');
    console.log('Admin email captured in script.js:', adminEmail);

    let associatedTelecallerEmail;

    if (adminEmail) {
        const adminNumber = adminEmail.match(/\d+/)[0];
        associatedTelecallerEmail = `telecaller${adminNumber}@gmail.com`;
    }

    console.log('Associated Telecaller Email in script.js:', associatedTelecallerEmail);

    if (associatedTelecallerEmail) {
        // Call the function to load data for the associated telecaller
        loadCallDataForTelecaller(associatedTelecallerEmail);
    } else {
        console.error('No associated telecaller email found');
    }

    // ... (rest of your existing DOMContentLoaded code)

    // Event listeners for buttons
    document.getElementById('todayBtn').addEventListener('click', openTodayDashboard);
    document.getElementById('weekReportBtn').addEventListener('click', openWeeklyReport);
    document.getElementById('monthlyBtn').addEventListener('click', openMonthlyDashboard);
    document.getElementById('settingsBtn').addEventListener('click', function() {
        alert('Settings clicked');
    });

    // Add this code for the dialpad trigger
    const dialpadTrigger = document.getElementById('dialpadTrigger');
    if (dialpadTrigger) {
        dialpadTrigger.addEventListener('click', openDialpad);
    } else {
        console.error("Dialpad trigger button not found");
    }

    const clearDataBtn = document.getElementById('clearDataBtn');
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', clearAllData);
    } else {
        console.error("Clear Data button not found");
    }

    // Add event listeners for summary cards
    const totalCallsCard = document.getElementById('totalCallsCard');
    const notInterestedCard = document.querySelector('.summary-card.notinterestedcard');
    const unansweredCard = document.querySelector('.summary-card.unanswredcalls');
    const callBackCard = document.querySelector('.summary-card.callbackcard');
    const interestedCard = document.querySelector('.summary-card.interestedcard');
    const callDetailsCard = document.getElementById('callDetailsCard');

    totalCallsCard.addEventListener('click', () => toggleCallDetails('Total'));
    notInterestedCard.addEventListener('click', () => toggleCallDetails('Not Interested'));
    unansweredCard.addEventListener('click', () => toggleCallDetails('Unanswered'));
    callBackCard.addEventListener('click', () => toggleCallDetails('Callback'));
    interestedCard.addEventListener('click', () => toggleCallDetails('Interested'));

    function toggleCallDetails(status) {
        if (callDetailsCard.style.display === 'none' || callDetailsCard.dataset.currentStatus !== status) {
            showCallDetails(status);
        } else {
            callDetailsCard.style.display = 'none';
        }
    }

    function showCallDetails(status) {
        const callDetailsBody = document.getElementById('callDetailsBody');
        callDetailsBody.innerHTML = '';

        let filteredCalls = callData.details;
        if (status !== 'Total') {
            filteredCalls = callData.details.filter(call => call.status === status);
        }

        filteredCalls.forEach(call => {
            const row = document.createElement('tr');
            const callDate = new Date(call.timestamp);
            const date = callDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
            const time = callDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            
            // Extract the last 10 digits of the phone number
            const phoneNumber = call.number.replace(/\D/g, '').slice(-10);
            
            // Define status colors and styles
            const statusStyles = {
                'Interested': 'background-color: #28a745; color: white; padding: 3px 8px; border-radius: 12px;',
                'Not Interested': 'background-color: #dc3545; color: white; padding: 3px 8px; border-radius: 12px;',
                'Callback': 'background-color: #007bff; color: white; padding: 3px 8px; border-radius: 12px;',
                'Unanswered': 'background-color: #ffc107; color: black; padding: 3px 8px; border-radius: 12px;',
                'Not Lift': 'background-color: #6c757d; color: white; padding: 3px 8px; border-radius: 12px;' // New status style
            };
            
            row.innerHTML = `
                <td>${call.number}</td>
                <td><span style="${statusStyles[call.status]}">${call.status}</span></td>
                <td>${call.duration || 'N/A'}</td>
                <td>${date}</td>
                <td>${time}</td>
                ${(status === 'Total' && (call.status === 'Callback' || call.status === 'Interested')) || status === 'Callback' || status === 'Interested' ? `
                <td>
                    <button class="whatsapp-btn" data-number="91${phoneNumber}">WhatsApp</button>
                    <button class="call-btn" data-number="${phoneNumber}">Call</button>
                </td>
                ` : '<td></td>'}
            `;
            callDetailsBody.appendChild(row);
        });

        const callDetailsCard = document.getElementById('callDetailsCard');
        callDetailsCard.style.display = 'block';
        document.querySelector('.call-details-card h2').textContent = `${status} Call Details`;

        // Add event listeners for WhatsApp and Call buttons
        const whatsappButtons = document.querySelectorAll('.whatsapp-btn');
        const callButtons = document.querySelectorAll('.call-btn');

        whatsappButtons.forEach(button => {
            button.addEventListener('click', function() {
                const phoneNumber = this.getAttribute('data-number');
                const preloadedText = "Hello! I'm reaching out regarding our previous conversation about real estate opportunities.";
                const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(preloadedText)}`;
                window.open(whatsappUrl, '_blank');
            });
        });

        callButtons.forEach(button => {
            button.addEventListener('click', function() {
                const phoneNumber = this.getAttribute('data-number');
                window.open(`tel:${phoneNumber}`, '_self');
            });
        });
    }

    // Move this function outside of any other functions
    window.openWhatsApp = function(number) {
        const formattedNumber = number.replace(/\D/g, '');
        const message = encodeURIComponent("Hello, I'm contacting you regarding our previous call.");
        const whatsappUrl = `https://wa.me/91${formattedNumber}?text=${message}`;
        
        // Try to open in a new window first
        const newWindow = window.open(whatsappUrl, '_blank');
        
        // If blocked by popup blocker, try to open in the same window
        if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
            window.location.href = whatsappUrl;
        }
    };

    const printBtn = document.getElementById('printBtn');
    if (printBtn) {
        printBtn.addEventListener('click', printCallDetails);
    } else {
        console.error("Print button not found");
    }

    // Add this function to set up real-time listeners
    function setupRealtimeListeners() {
        const adminEmail = localStorage.getItem('adminEmail');
        let associatedTelecallerEmail;

        if (adminEmail) {
            const adminNumber = adminEmail.match(/\d+/)[0];
            associatedTelecallerEmail = `telecaller${adminNumber}@gmail.com`;
        }

        const callsRef = database.ref('calls');

        callsRef.on('child_added', (snapshot) => {
            const newCall = snapshot.val();
            if (newCall.telecallerEmail === associatedTelecallerEmail) {
                updateDashboardWithNewCall(newCall);
            }
        });

        callsRef.on('child_removed', (snapshot) => {
            const removedCall = snapshot.val();
            if (removedCall.telecallerEmail === associatedTelecallerEmail) {
                updateDashboardWithRemovedCall(removedCall);
            }
        });

        callsRef.on('child_changed', (snapshot) => {
            const updatedCall = snapshot.val();
            if (updatedCall.telecallerEmail === associatedTelecallerEmail) {
                updateDashboardWithUpdatedCall(updatedCall);
            }
        });
    }

    // Call setupRealtimeListeners when the page loads
    setupRealtimeListeners();

    // Add event listener for delete data button
    const deleteDataBtn = document.querySelector('.delete-data-btn');
    if (deleteDataBtn) {
        deleteDataBtn.addEventListener('click', showDeleteConfirmation);
    }
});

function formatTime(time) {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = (hour % 12 || 12).toString();
    return `${formattedHour}:${minutes.slice(0, 2)}${ampm}`;
}

// Add this function to your script.js file
function printCallDetails() {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Call Details Report</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                th {
                    background-color: #f2f2f2;
                }
                h1 {
                    text-align: center;
                }
                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
                @page {
                    size: A4 landscape;
                    margin: 1cm;
                }
            </style>
        </head>
        <body>
            <h1>Call Details Report</h1>
            <table>
                <thead>
                    <tr>
                        <th>Contact</th>
                        <th>Status</th>
                        <th>Duration</th>
                        <th>Date</th>
                        <th>Time</th>
                    </tr>
                </thead>
                <tbody>
                    ${Array.from(document.querySelectorAll('#callDetailsBody tr')).map(row => row.outerHTML).join('')}
                </tbody>
            </table>
            <script>
                window.onload = function() {
                    window.print();
                    window.onafterprint = function() {
                        window.close();
                    };
                };
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// Add this to your existing script.js file

document.addEventListener('DOMContentLoaded', function() {
    const clearDataBtn = document.getElementById('clearDataBtn');
    const printBtn = document.getElementById('printBtn');

    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', function() {
            // Add your clear data functionality here
            console.log('Clear data button clicked');
        });
    }

    if (printBtn) {
        printBtn.addEventListener('click', function() {
            // Add your print functionality here
            console.log('Print button clicked');
        });
    }
});

// Add this function to fetch today's calls
function fetchTodayCalls() {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).getTime();
    
    return database.ref('calls')
        .orderByChild('timestamp')
        .startAt(startOfDay)
        .endAt(endOfDay)
        .once('value')
        .then((snapshot) => {
            const todayCalls = [];
            snapshot.forEach((childSnapshot) => {
                const call = childSnapshot.val();
                if (call.telecallerEmail === associatedTelecallerEmail) {
                    todayCalls.push(call);
                }
            });
            console.log('Fetched today\'s calls:', todayCalls);
            return todayCalls;
        });
}

// Function to update the UI with the call details
function updateCallDetails(call) {
    const callDetailsElement = document.getElementById('callDetails');
    if (!callDetailsElement) {
        console.log('Call details element not found - this is expected if not on the details page');
        return; // Exit gracefully if element doesn't exist
    }

    try {
        const callDate = new Date(call.timestamp);
        const formattedDate = formatDate(callDate);
        const formattedTime = formatTime(callDate);

        const statusClass = getStatusClass(call.status);
        const callHtml = `
            <div class="call-detail ${statusClass}">
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${formattedTime}</p>
                <p><strong>Phone:</strong> ${call.phone}</p>
                <p><strong>Status:</strong> ${call.status}</p>
                <p><strong>Notes:</strong> ${call.notes || 'No notes'}</p>
            </div>
        `;

        callDetailsElement.innerHTML = callHtml;
    } catch (error) {
        console.error('Error updating call details:', error);
    }
}

// Listen for changes in the Firebase Realtime Database
database.ref('calls').on('child_changed', (snapshot) => {
    const call = snapshot.val();
    if (call) {
        console.log('Call data updated:', call);
        updateCallDetails(call);
    }
});

// Initial load of call details
database.ref('calls').once('value', (snapshot) => {
    console.log('Loading initial call details');
    snapshot.forEach((childSnapshot) => {
        const call = childSnapshot.val();
        if (call) {
            updateCallDetails(call);
        }
    });
});

function loadCallDataForTelecaller(telecallerEmail) {
    if (!telecallerEmail) {
        console.error('No telecaller email provided');
        return;
    }

    console.log('Loading data for telecaller:', telecallerEmail);

    // Reference to the calls in Firebase
    const callsRef = database.ref('calls');

    // Create a query to filter by telecaller
    callsRef.orderByChild('telecallerEmail')
        .equalTo(telecallerEmail)
        .once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                console.log('No calls found for telecaller:', telecallerEmail);
                return;
            }

            const calls = [];
            snapshot.forEach(childSnapshot => {
                const call = childSnapshot.val();
                call.id = childSnapshot.key;
                calls.push(call);
            });

            console.log('Processed call data:', calls);

            // Update UI elements if they exist
            const callCountElement = document.getElementById('callCount');
            if (callCountElement) {
                callCountElement.textContent = calls.length;
            }

            // Update the call list if the element exists
            const callListElement = document.getElementById('callList');
            if (callListElement) {
                calls.forEach(call => {
                    const callElement = document.createElement('div');
                    callElement.className = `call-item ${getStatusClass(call.status)}`;
                    callElement.innerHTML = `
                        <p><strong>${formatDate(new Date(call.timestamp))}</strong></p>
                        <p>${call.phone}</p>
                        <p>${call.status}</p>
                    `;
                    callListElement.appendChild(callElement);
                });
            }

            // Trigger any additional UI updates
            updateDashboardUI(calls);
        })
        .catch(error => {
            console.error('Error loading call data:', error);
        });
}

// Update the existing DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
    const adminEmail = localStorage.getItem('adminEmail');
    console.log('Admin email captured:', adminEmail);

    if (adminEmail) {
        const adminNumber = adminEmail.match(/\d+/);
        if (adminNumber) {
            const telecallerEmail = `telecaller${adminNumber[0]}@gmail.com`;
            console.log('Associated telecaller email:', telecallerEmail);
            loadCallDataForTelecaller(telecallerEmail);
        } else {
            console.error('Could not extract number from admin email:', adminEmail);
        }
    } else {
        console.error('No admin email found in localStorage');
    }
});

function updateDashboardUI(data) {
    // Update summary numbers
    updateSummaryNumbers();

    // Update call details table
    const callDetailsBody = document.getElementById('callDetailsBody');
    if (callDetailsBody) {
        callDetailsBody.innerHTML = '';
        data.details.forEach(call => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${call.number}</td>
                <td>${call.status}</td>
                <td>${call.duration || 'N/A'}</td>
                <td>${new Date(call.timestamp).toLocaleDateString()}</td>
                <td>${new Date(call.timestamp).toLocaleTimeString()}</td>
            `;
            callDetailsBody.appendChild(row);
        });
    }
}

// Modify the existing updateSummaryNumbers function if it doesn't exist
function updateSummaryNumbers() {
    const calls = window.callData.details || [];
    
    // Log the processed calls to verify their structure
    console.log('Processed calls:', calls);

    // Calculate counts with case-insensitive status comparison
    const summary = {
        total: calls.length,
        interested: calls.filter(call => call.status && call.status.toLowerCase() === 'interested').length,
        notInterested: calls.filter(call => call.status && call.status.toLowerCase() === 'not interested').length,
        callback: calls.filter(call => call.status && call.status.toLowerCase() === 'callback').length,
        unanswered: calls.filter(call => call.status && call.status.toLowerCase() === 'unanswered').length
    };

    // Log the calculated summary
    console.log('Calculated summary:', summary);

    // Update UI elements
    document.getElementById('totalCallsSummary').textContent = summary.total;
    document.getElementById('interestedCallsSummary').textContent = summary.interested;
    document.getElementById('notInterestedCallsSummary').textContent = summary.notInterested;
    document.getElementById('callBackCallsSummary').textContent = summary.callback;
    document.getElementById('unansweredCallsSummary').textContent = summary.unanswered;
}

// Function to add a new call to the dashboard
function addCallToDashboard(call) {
    // Ensure the dateTime is in the correct format
    if (!call.dateTime) {
        const now = new Date();
        call.dateTime = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear().toString().slice(-2)} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
    }
    
    // Add a timestamp for sorting
    call.timestamp = firebase.database.ServerValue.TIMESTAMP;
    
    // Check if the number already exists in the database
    database.ref('calls').orderByChild('number').equalTo(call.number).once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                let existingCallKey = null;
                let existingCall = null;
                snapshot.forEach((childSnapshot) => {
                    existingCallKey = childSnapshot.key;
                    existingCall = childSnapshot.val();
                });

                if (existingCall.status === 'Not Interested' && call.status !== 'Not Interested') {
                    // Remove the existing 'Not Interested' entry
                    database.ref('calls').child(existingCallKey).remove()
                        .then(() => {
                            console.log('Existing Not Interested call removed');
                            // Add the new call with updated status
                            addNewCallEntry(call);
                        })
                        .catch((error) => {
                            console.error('Error removing existing Not Interested call:', error);
                        });
                } else {
                    // If it's not moving from 'Not Interested' to another status, add as a new entry
                    addNewCallEntry(call);
                }
            } else {
                // Number doesn't exist, add as a new entry
                addNewCallEntry(call);
            }
        })
        .catch((error) => {
            console.error('Error checking for existing call:', error);
        });
}

// Helper function to add a new call entry
function addNewCallEntry(call) {
    const newCallRef = database.ref('calls').push();
    newCallRef.set(call)
        .then(() => {
            console.log('New call added successfully');
            updateDashboard();
        })
        .catch((error) => {
            console.error('Error adding new call:', error);
        });
}

// Function to format date to DD/MM/YY
function formatDate(dateString) {
    const [date, time] = dateString.split(' ');
    const [day, month, year] = date.split('/');
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year.slice(-2)} ${time}`;
}

// Function to update summary numbers
function updateSummaryNumbers() {
    const calls = window.callData.details || [];
    
    // Log the processed calls to verify their structure
    console.log('Processed calls:', calls);

    // Calculate counts with case-insensitive status comparison
    const summary = {
        total: calls.length,
        interested: calls.filter(call => call.status && call.status.toLowerCase() === 'interested').length,
        notInterested: calls.filter(call => call.status && call.status.toLowerCase() === 'not interested').length,
        callback: calls.filter(call => call.status && call.status.toLowerCase() === 'callback').length,
        unanswered: calls.filter(call => call.status && call.status.toLowerCase() === 'unanswered').length
    };
    
    // Log the calculated summary
    console.log('Calculated summary:', summary);

    // Update UI elements
    document.getElementById('totalCallsSummary').textContent = summary.total;
    document.getElementById('interestedCallsSummary').textContent = summary.interested;
    document.getElementById('notInterestedCallsSummary').textContent = summary.notInterested;
    document.getElementById('callBackCallsSummary').textContent = summary.callback;
    document.getElementById('unansweredCallsSummary').textContent = summary.unanswered;
}

// Load existing calls from Firebase
function loadExistingCalls() {
    updateDashboard();
}

// Clear data based on the current status
function clearAllData() {
    const currentStatus = document.querySelector('.call-details-card').dataset.currentStatus;
    let confirmMessage = "Are you sure you want to clear all data? This action cannot be undone.";
    
    if (currentStatus !== 'Total') {
        confirmMessage = `Are you sure you want to clear all ${currentStatus} calls? This action cannot be undone.`;
    }

    if (confirm(confirmMessage)) {
        if (currentStatus === 'Total') {
            database.ref('calls').remove()
                .then(() => {
                    console.log('All data has been cleared from Firebase');
                    updateDashboard();
                })
                .catch((error) => {
                    console.error('Error clearing data:', error);
                });
        } else {
            database.ref('calls').orderByChild('status').equalTo(currentStatus).once('value', snapshot => {
                const updates = {};
                snapshot.forEach(child => {
                    updates[child.key] = null;
                });
                database.ref('calls').update(updates)
                    .then(() => {
                        console.log(`All ${currentStatus} calls have been cleared from Firebase`);
                        updateDashboard();
                    })
                    .catch((error) => {
                        console.error('Error clearing data:', error);
                    });
            });
        }
    }
}

// Listen for messages from the dialpad
window.addEventListener('message', function(event) {
    // Ignore messages from React DevTools and Wappalyzer
    if (event.data && (
        (event.data.source && event.data.source === 'react-devtools-content-script') ||
        event.data.wappalyzer
    )) {
        return; // Ignore these messages completely
    }

    // Only process call-related messages
    if (event.data && event.data.type) {
        switch (event.data.type) {
            case 'newCall':
                console.log('New call received:', event.data.call);
                addCallToDashboard(event.data.call);
                break;
            case 'callUpdated':
                console.log('Call updated:', event.data.call);
                updateCallDetails(event.data.call);
                break;
            case 'callRemoved':
                console.log('Call removed:', event.data.call);
                updateDashboardWithRemovedCall(event.data.call);
                break;
        }
    }
});

// Function to open dialpad
function openDialpad() {
    window.open('dialpad.html', 'dialpad', 'width=300,height=400');
}

// Function to open Today's dashboard in a new window
function openTodayDashboard() {
    const todayWindow = window.open('today_calls.html', '_blank', 'width=800,height=600');
    todayWindow.addEventListener('load', function() {
        fetchTodayCalls().then(todayCalls => {
            todayWindow.postMessage({ type: 'todayCallsData', calls: todayCalls }, '*');
        }).catch(error => {
            console.error("Error fetching today's calls:", error);
        });
    });
}

// Function to open Weekly Report in a new window
function openWeeklyReport() {
    window.open('weekly_report.html', '_blank', 'width=800,height=600');
}

// Function to open Monthly dashboard in a new window
function openMonthlyDashboard() {
    window.open('monthly_calls.html', '_blank', 'width=800,height=600');
}

function getStatusClass(status) {
    switch (status) {
        case 'Interested':
            return 'status-interested';
        case 'Not Interested':
            return 'status-not-interested';
        case 'Unanswered':
            return 'status-unanswered';
        case 'Callback':
            return 'status-callback';
        default:
            return '';
    }
}

function updateDashboardWithNewCall(newCall) {
    // Remove any existing call with the same number
    callData.details = callData.details.filter(call => call.number !== newCall.number);
    // Add the new call
    callData.details.push(newCall);
    updateDashboardUI(callData);
}

function updateDashboardWithRemovedCall(removedCall) {
    callData.details = callData.details.filter(call => call.number !== removedCall.number);
    updateDashboardUI(callData);
}

function updateDashboardWithUpdatedCall(updatedCall) {
    // Remove any existing call with the same number
    callData.details = callData.details.filter(call => call.number !== updatedCall.number);
    // Add the updated call
    callData.details.push(updatedCall);
    updateDashboardUI(callData);
}

function updateDashboardUI(data) {
    // Update summary numbers
    document.getElementById('totalCallsSummary').textContent = data.details.length;
    document.getElementById('notInterestedCallsSummary').textContent = data.details.filter(call => call.status === 'Not Interested').length;
    document.getElementById('unansweredCallsSummary').textContent = data.details.filter(call => call.status === 'Unanswered').length;
    document.getElementById('callBackCallsSummary').textContent = data.details.filter(call => call.status === 'Callback').length;
    document.getElementById('interestedCallsSummary').textContent = data.details.filter(call => call.status === 'Interested').length;

    // Update call details table if it's visible
    const callDetailsCard = document.getElementById('callDetailsCard');
    if (callDetailsCard.style.display !== 'none') {
        const currentStatus = callDetailsCard.getAttribute('data-status');
        showCallDetails(currentStatus);
    }
}

// Function to filter calls by selected date
function filterCallsByDate(selectedDate, calls) {
    return calls.filter(call => {
        const callDate = call.dateTime.split(' ')[0]; // Extract date part from dateTime
        return callDate === selectedDate;
    });
}

// Function to handle calendar date submission
function handleCalendarSubmit(event) {
    event.preventDefault();
    const selectedDate = document.getElementById('calendarDate').value;
    if (!selectedDate) return;

    // Format date to match the database format (DD/MM/YY)
    const formattedDate = formatDate(selectedDate);
    
    // Get telecaller email from localStorage
    const telecallerEmail = localStorage.getItem('telecallerEmail');
    if (!telecallerEmail) {
        console.error('Telecaller email not found');
        return;
    }

    // Reference to the telecaller's calls
    const callsRef = database.ref('calls');
    
    callsRef.orderByChild('telecallerEmail').equalTo(telecallerEmail).once('value')
        .then((snapshot) => {
            const allCalls = [];
            snapshot.forEach((childSnapshot) => {
                const call = childSnapshot.val();
                allCalls.push(call);
            });

            // Filter calls for selected date
            const filteredCalls = filterCallsByDate(formattedDate, allCalls);
            
            // Update the dashboard with filtered calls
            updateTodayDashboard({ details: filteredCalls });
            console.log('Filtered calls for date:', formattedDate, filteredCalls);
        })
        .catch((error) => {
            console.error('Error fetching calls:', error);
        });
}

// Add event listener when document is loaded
document.addEventListener('DOMContentLoaded', function() {
    const clearDataBtn = document.getElementById('clearDataBtn');
    const printBtn = document.getElementById('printBtn');

    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', function() {
            // Add your clear data functionality here
            console.log('Clear data button clicked');
        });
    }

    if (printBtn) {
        printBtn.addEventListener('click', function() {
            // Add your print functionality here
            console.log('Print button clicked');
        });
    }

    // Add event listener for calendar form submission
    const calendarForm = document.getElementById('calendarForm');
    if (calendarForm) {
        calendarForm.addEventListener('submit', handleCalendarSubmit);
    }
});

// Add this function to script.js
function showDeleteConfirmation() {
    const selectedTelecaller = localStorage.getItem('selectedTelecaller');
    const telecallerName = selectedTelecaller.split('@')[0];
    const database = firebase.database();
    const telecallerRef = database.ref(telecallerName);

    telecallerRef.once('value')
        .then(snapshot => {
            let notInterestedCount = 0;
            let unansweredCount = 0;
            const callsToDelete = [];

            snapshot.forEach(childSnapshot => {
                const call = childSnapshot.val();
                if (call.status === 'Not Interested' || call.status === 'Not interested') {
                    notInterestedCount++;
                    callsToDelete.push(childSnapshot.key);
                } else if (call.status === 'Unanswered') {
                    unansweredCount++;
                    callsToDelete.push(childSnapshot.key);
                }
            });

            const totalToDelete = notInterestedCount + unansweredCount;
            
            const confirmMessage = `
                Summary of calls to be deleted for ${telecallerName}:
                
                • Not Interested Calls: ${notInterestedCount}
                • Unanswered Calls: ${unansweredCount}
                ─────────────────────────
                Total calls to delete: ${totalToDelete}

                Note: Interested and Callback calls will be preserved.
                
                Do you want to proceed with deletion?`;

            if (confirm(confirmMessage)) {
                // Create batch update object
                const updates = {};
                callsToDelete.forEach(key => {
                    updates[key] = null;
                });

                // Perform the batch delete
                telecallerRef.update(updates)
                    .then(() => {
                        alert(`Successfully deleted:
                        • ${notInterestedCount} Not Interested calls
                        • ${unansweredCount} Unanswered calls`);
                        // Refresh the data display
                        initializeCallLogFetching();
                    })
                    .catch(error => {
                        console.error('Error deleting calls:', error);
                        alert('An error occurred while deleting calls. Please try again.');
                    });
            }
        })
        .catch(error => {
            console.error('Error fetching call data:', error);
            alert('Error fetching call data. Please try again.');
        });
}           