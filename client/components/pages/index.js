const data = {
    "workspace": {
        "namespace": "DigitalEmergence"
    },
    "projects": {
        "selectedProject": "autobots",
        "allProjects": [
            "autobots",
            "decepticons"
        ],
        "data": {
            "autobots": {
                "domains": {
                    "localhost": {
                        "application": "app.prod"
                    },
                    "www.autobots.com": {
                        "application": "app.prod"
                    },
                    "staging.autobots.com": {
                        "application": "app.staging"
                    }
                },
                "apps": {
                    "app.prod": {
                        "packages": {
                            "optimus": {
                                "ref": "v1.0.0",
                                "isCheckedOut": true
                            },
                            "bumblebee": {
                                "ref": "v1.0.0",
                                "isCheckedOut": true
                            }
                        },
                        "envVariables": {
                            "NODE_ENV": "production",
                            "bruh": "fewc"
                        }
                    },
                    "app.staging": {
                        "packages": {
                            "optimus": {
                                "ref": "main",
                                "isCheckedOut": false
                            },
                            "bumblebee": {
                                "ref": "main",
                                "isCheckedOut": false
                            }
                        },
                        "envVariables": {
                            "API_URL": "https://staging-api.autobots.com",
                            "DEBUG_MODE": "true",
                            "NODE_ENV": "development",
                            "FEATURE_FLAGS": "new-ui,beta-features"
                        }
                    }
                }
            }
        }
    },
    "workflows": {
        "syncAndReload": {
            "title": "Sync and Reload",
            "description": "Sync a package's branch with the trunk branch and reload the server",
            "userInputs": {
                "packageName": {
                    "value": "",
                    "options": "selectedProjectPackages"
                },
                "targetBranch": {
                    "value": "yaseen"
                },
                "trunkBranch": {
                    "value": "main"
                }
            }
        },
        "createNewProject": {
            "title": "Create New Project",
            "description": "Create a new project to the workspace",
            "userInputs": {
                "projectName": {
                    "value": ""
                },
                "publicOrPrivate": {
                    "value": "public"
                }
            }
        },
        "createNewApp": {
            "title": "Create New App",
            "description": "Create a new app within the selected project",
            "userInputs": {
                "appName": {
                    "value": ""
                },
                "projectName": {
                    "value": ""
                },
                "copyFromApp": {
                    "value": ""
                }
            }
        },
        "createNewPackage": {
            "title": "Create New Package",
            "description": "Create a new package within the selected project",
            "userInputs": {
                "packageName": {
                    "value": ""
                },
                "appName": {
                    "value": ""
                },
                "projectName": {
                    "value": ""
                }
            }
        },
        "installElementJS": {
            "title": "Install ElementJS",
            "description": "Install ElementJS in the selected package",
            "userInputs": {
                "projectName": {
                    "value": ""
                },
                "appName": {
                    "value": ""
                },
                "packageName": {
                    "value": ""
                }
            }
        }
    },
    "settings": {
        "autoResetOnSave": true
    }
}

// Main JavaScript file for JSphere Console UI with WebSocket support

// WebSocket connection
let socket;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 2000; // 2 seconds

// Store GitHub state data
let githubStateData = null;

// Track the currently loaded project
let loadedProject = null;

// Status indicator elements
const statusIndicator = document.getElementById('status-indicator');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');

// Connect to WebSocket server
function connectWebSocket() {
    // Close existing socket if any
    if (socket) {
        socket.close();
    }
    
    // Create new WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    socket = new WebSocket(wsUrl);
    
    // Update status to connecting
    updateConnectionStatus('connecting');
    
    // WebSocket event handlers
    socket.onopen = () => {
        console.log('WebSocket connected');
        updateConnectionStatus('connected');
        reconnectAttempts = 0; // Reset reconnect attempts on successful connection
    };
    
    socket.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            handleWebSocketMessage(message);
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    };
    
    socket.onclose = () => {
        console.log('WebSocket disconnected');
        updateConnectionStatus('disconnected');
        
        // Attempt to reconnect
        if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
            setTimeout(connectWebSocket, reconnectDelay);
        } else {
            console.error('Max reconnect attempts reached');
        }
    };
    
    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateConnectionStatus('disconnected');
    };
}

// Update connection status indicator
function updateConnectionStatus(status) {
    statusDot.className = 'status-dot';
    statusIndicator.classList.add('visible');
    
    switch (status) {
        case 'connected':
            statusDot.classList.add('connected');
            statusText.textContent = 'Connected';
            // Hide the indicator after 3 seconds
            setTimeout(() => {
                statusIndicator.classList.remove('visible');
            }, 3000);
            break;
        case 'connecting':
            statusDot.classList.add('connecting');
            statusText.textContent = 'Connecting...';
            break;
        case 'disconnected':
            statusDot.classList.add('disconnected');
            statusText.textContent = 'Disconnected';
            break;
    }
}

// Store auth keys from .env
let serverAuthKeys = [];

// Handle WebSocket messages
function handleWebSocketMessage(message) {
    console.log('Received WebSocket message:', message);
    
    switch (message.type) {
        case 'init':
            // Store auth keys from .env
            if (message.env && message.env.authKeys) {
                serverAuthKeys = message.env.authKeys;
                console.log('Loaded auth keys:', serverAuthKeys);
            }
            // Store GitHub state data
            if (message.githubState) {
                githubStateData = message.githubState;
                console.log('Loaded GitHub state data');
            }
            // Update UI with new data
            updateUI(message.data);
            break;
        case 'update':
            // Update GitHub state data if provided
            if (message.githubState) {
                githubStateData = message.githubState;
                console.log('Updated GitHub state data');
            }
            // Update UI with new data
            updateUI(message.data);
            break;
        case 'settingUpdated':
            // Show confirmation
            showNotification(`Setting "${message.key}" updated successfully`);
            break;
        case 'projectCheckedOut':
            // Show confirmation
            showNotification(`Project "${message.project}" checked out successfully`);
            break;
        case 'workflowExecuted':
            // Show workflow execution result
            if (message.success) {
                showNotification(`Workflow "${message.workflowId}" executed successfully`);
            } else {
                showNotification(`Workflow "${message.workflowId}" failed: ${message.error}`, 'error');
            }
            break;
        case 'envVariableUpdated':
            // Show confirmation
            showNotification(`Environment variable "${message.key}" updated successfully`);
            break;
        case 'envVariableDeleted':
            // Show confirmation
            showNotification(`Environment variable "${message.key}" deleted successfully`);
            break;
        case 'error':
            console.error('Server error:', message.message);
            showNotification(`Error: ${message.message}`, 'error');
            break;
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // You could implement a more sophisticated notification system here
    console.log(`Notification (${type}): ${message}`);
    
    // For now, we'll use the status indicator
    statusText.textContent = message;
    statusDot.className = 'status-dot';
    
    if (type === 'error') {
        statusDot.classList.add('disconnected');
    } else {
        statusDot.classList.add('connected');
    }
    
    statusIndicator.classList.add('visible');
    
    // Hide after 3 seconds
    setTimeout(() => {
        statusIndicator.classList.remove('visible');
    }, 3000);
}

// Update settings in the JSON file via WebSocket
function updateSetting(key, value) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'updateSetting',
            key: key,
            value: value
        }));
    } else {
        console.error('WebSocket not connected');
        showNotification('WebSocket not connected', 'error');
    }
}

// Alternative method to update settings via REST API
async function updateSettingViaAPI(key, value) {
    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ [key]: value })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`Setting "${key}" updated successfully`);
        } else {
            throw new Error(result.error || 'Unknown error');
        }
    } catch (error) {
        console.error('Error updating setting:', error);
        showNotification(`Error updating setting: ${error.message}`, 'error');
    }
}

// Load the JSON data
async function loadJSphereData() {
    try {
        const response = await fetch('jsphere.console.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error loading JSphere data:', error);
        document.body.innerHTML = `<div class="error-message">Error loading JSphere data: ${error.message}</div>`;
    }
}

// Initialize the UI with the loaded data
async function initializeUI() {
    // Connect to WebSocket for real-time updates
    connectWebSocket();
    
    // Load initial data
    // const data = await loadJSphereData();
    if (!data) return;
    
    // Update UI with the data
    updateUI(data);
    
    // Setup expand/collapse functionality
    setupExpandCollapse();
    
    // Setup settings toggle handlers
    setupSettingsHandlers();
}

// Function to load a project
function loadProject(projectName) {
    console.log(`Loading project: ${projectName}`);
    
    // Update the loaded project
    loadedProject = projectName;
    
    // Send load request to server via WebSocket
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'loadProject',
            project: projectName
        }));
        
        // Show notification
        showNotification(`Project loaded: ${projectName}`);
    } else {
        // Fallback to REST API (not implemented yet)
        showNotification('WebSocket not connected', 'error');
    }
    
    // Update the UI to reflect the loaded project
    updateProjectLoadIndicators();
}

// Update project load indicators
function updateProjectLoadIndicators() {
    // Remove all existing load indicators
    document.querySelectorAll('.project-load-indicator').forEach(indicator => {
        indicator.remove();
    });
    
    // If no project is loaded, return early
    if (!loadedProject) return;
    
    // Find the loaded project item and add the indicator
    const projectItems = document.querySelectorAll('.list-item');
    projectItems.forEach(item => {
        const projectNameSpan = item.querySelector('.project-name');
        if (projectNameSpan && projectNameSpan.textContent === loadedProject) {
            // Create the load indicator
            const loadIndicator = document.createElement('span');
            loadIndicator.className = 'project-load-indicator';
            loadIndicator.title = 'Currently loaded project';
            
            // Insert before the project name span
            item.insertBefore(loadIndicator, projectNameSpan);
        }
    });
}

// Function to checkout a project
function checkoutProject(projectName) {
    console.log(`Checking out project: ${projectName}`);
    
    // Send checkout request to server via WebSocket
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'checkoutProject',
            project: projectName
        }));
        
        // Show notification
        showNotification(`Checking out project: ${projectName}...`);
    } else {
        // Fallback to REST API (not implemented yet)
        showNotification('WebSocket not connected', 'error');
    }
}

// Update the UI with new data
function updateUI(data) {
    // Store data globally for access in other functions
    window.jsphereData = data;
    
    // Clear existing content
    document.getElementById('all-projects').innerHTML = '';
    document.getElementById('domains-container').innerHTML = '';
    document.getElementById('apps-container').innerHTML = '';
    document.getElementById('workflows-container').innerHTML = '';
    
    // Remove any existing checkout banners
    const existingBanners = document.querySelectorAll('.checkout-banner');
    existingBanners.forEach(banner => banner.remove());
    
    // Populate workspace info
    document.getElementById('workspace-namespace').textContent = data.workspace.namespace;

    // Populate projects section
    const selectedProject = data.projects.selectedProject;
    
    // Update projects section info
    const projectsInfo = document.getElementById('projects-info');
    if (projectsInfo) {
        projectsInfo.textContent = selectedProject ? `(${selectedProject})` : '(None)';
    }
    
    // Populate projects list
    const allProjectsList = document.getElementById('all-projects');
    data.projects.allProjects.forEach(project => {
        const li = document.createElement('li');
        li.className = 'list-item';
        if (project === selectedProject) {
            li.classList.add('selected');
        }
        
        // Add load indicator if this is the loaded project (before the project name)
        if (project === loadedProject) {
            const loadIndicator = document.createElement('span');
            loadIndicator.className = 'project-load-indicator';
            loadIndicator.title = 'Currently loaded project';
            li.appendChild(loadIndicator);
        }
        
        // Create a span for the project name to allow for proper layout with checkout button
        const projectNameSpan = document.createElement('span');
        projectNameSpan.className = 'project-name';
        projectNameSpan.textContent = project;
        li.appendChild(projectNameSpan);
        
        // Add project checkout button if not already checked out
        const isCheckedOut = !!data.projects.data[project];
        
        // Create button container for better alignment
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'project-buttons';
        
        // Add Load button for all projects
        const loadBtn = document.createElement('button');
        loadBtn.className = 'load-btn';
        loadBtn.textContent = 'Load';
        loadBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent project selection
            loadProject(project);
        });
        buttonContainer.appendChild(loadBtn);
        
        // Add checkout button if not already checked out
        if (!isCheckedOut && githubStateData && githubStateData.projectRepos[`.${project}`]) {
            const checkoutBtn = document.createElement('button');
            checkoutBtn.className = 'checkout-btn';
            checkoutBtn.textContent = 'Checkout';
            checkoutBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent project selection
                checkoutProject(project);
            });
            buttonContainer.appendChild(checkoutBtn);
        }
        
        li.appendChild(buttonContainer);
        
        // Add click event to select project
        li.addEventListener('click', () => {
            selectProject(project, data);
        });
        
        allProjectsList.appendChild(li);
    });

    // Early return if no project is selected
    if (!selectedProject) {
        // Clear section info counts
        const domainsInfo = document.getElementById('domains-info');
        if (domainsInfo) {
            domainsInfo.textContent = '(0)';
        }
        
        const appsInfo = document.getElementById('apps-info');
        if (appsInfo) {
            appsInfo.textContent = '(0)';
        }
        
        // Show message in domains and apps sections
        const noProjectMessage = document.createElement('div');
        noProjectMessage.className = 'no-project-message';
        noProjectMessage.textContent = 'Select a project to view domains and apps';
        
        document.getElementById('domains-container').appendChild(noProjectMessage.cloneNode(true));
        document.getElementById('apps-container').appendChild(noProjectMessage.cloneNode(true));
        
        return; // Exit early
    }

    // Get the selected project's data
    const projectData = data.projects.data[selectedProject];
    
    // Check if project is checked out
    const isProjectCheckedOut = !!projectData;
    
    // Get GitHub state data for the selected project
    let githubProjectData = null;
    if (githubStateData) {
        // Project names in GitHub state have a leading dot
        const projectKey = `.${selectedProject}`;
        githubProjectData = githubStateData.projectRepos[projectKey];
    }
    
    // If no GitHub data is available for this project, show an error
    if (!githubProjectData && !isProjectCheckedOut) {
        const domainsInfo = document.getElementById('domains-info');
        if (domainsInfo) {
            domainsInfo.textContent = '(0)';
        }
        
        const appsInfo = document.getElementById('apps-info');
        if (appsInfo) {
            appsInfo.textContent = '(0)';
        }
        
        // Show error message
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = `No data available for project "${selectedProject}"`;
        
        document.getElementById('domains-container').appendChild(errorMessage.cloneNode(true));
        document.getElementById('apps-container').appendChild(errorMessage.cloneNode(true));
        
        return; // Exit early
    }
    
    if (isProjectCheckedOut && projectData) {
        // Project is checked out - show actual data from jsphere.console.json
        
        // Update domains count
        const domainsCount = Object.keys(projectData.domains).length;
        const domainsInfo = document.getElementById('domains-info');
        if (domainsInfo) {
            domainsInfo.textContent = `(${domainsCount})`;
        }
        
        // Update apps count
        const appsCount = Object.keys(projectData.apps).length;
        const appsInfo = document.getElementById('apps-info');
        if (appsInfo) {
            appsInfo.textContent = `(${appsCount})`;
        }
        
        // Populate domains section for the selected project
        const domainsContainer = document.getElementById('domains-container');
        Object.entries(projectData.domains).forEach(([domainName, domainData]) => {
            const domainCard = createDomainCard(domainName, domainData, true);
            domainsContainer.appendChild(domainCard);
        });

        // Populate apps section for the selected project
        const appsContainer = document.getElementById('apps-container');
        Object.entries(projectData.apps).forEach(([appName, appData]) => {
            const appCard = createAppCard(appName, appData, true);
            appsContainer.appendChild(appCard);
        });
    } else if (githubProjectData) {
        // Project is not checked out - show locked data from GitHub state
        
        // Update domains count
        const domainsCount = Object.keys(githubProjectData.domains).length;
        const domainsInfo = document.getElementById('domains-info');
        if (domainsInfo) {
            domainsInfo.textContent = `(${domainsCount}) - Locked`;
        }
        
        // Update apps count
        const appsCount = Object.keys(githubProjectData.apps).length;
        const appsInfo = document.getElementById('apps-info');
        if (appsInfo) {
            appsInfo.textContent = `(${appsCount}) - Locked`;
        }
        
        // Create checkout banner for domains section
        const domainsBanner = document.createElement('div');
        domainsBanner.className = 'checkout-banner';
        domainsBanner.innerHTML = `
            <div class="checkout-message">Project not checked out. Checkout to interact with domains.</div>
            <button class="checkout-project-btn">Checkout Project</button>
        `;
        
        // Add click event to domains checkout button
        domainsBanner.querySelector('.checkout-project-btn').addEventListener('click', () => {
            checkoutProject(selectedProject);
        });
        
        // Create checkout banner for apps section
        const appsBanner = document.createElement('div');
        appsBanner.className = 'checkout-banner';
        appsBanner.innerHTML = `
            <div class="checkout-message">Project not checked out. Checkout to interact with apps.</div>
            <button class="checkout-project-btn">Checkout Project</button>
        `;
        
        // Add click event to apps checkout button
        appsBanner.querySelector('.checkout-project-btn').addEventListener('click', () => {
            checkoutProject(selectedProject);
        });
        
        // Add banners to their respective sections
        const domainsContent = document.getElementById('domains-content');
        const appsContent = document.getElementById('apps-content');
        const domainsContainer = document.getElementById('domains-container');
        const appsContainer = document.getElementById('apps-container');
        
        domainsContent.insertBefore(domainsBanner, domainsContainer);
        appsContent.insertBefore(appsBanner, appsContainer);
        
        // Populate domains section for the selected project from GitHub state
        Object.entries(githubProjectData.domains).forEach(([domainName, domainData]) => {
            const domainCard = createDomainCard(domainName, domainData, false);
            domainsContainer.appendChild(domainCard);
        });

        // Populate apps section for the selected project from GitHub state
        Object.entries(githubProjectData.apps).forEach(([appName, appData]) => {
            const appCard = createAppCard(appName, appData, false);
            appsContainer.appendChild(appCard);
        });
    }

    // Populate workflows section
    const workflowsContainer = document.getElementById('workflows-container');
    Object.entries(data.workflows).forEach(([workflowId, workflowData]) => {
        const workflowCard = createWorkflowCard(workflowId, workflowData, getPackagesForSelectedProject(data));
        workflowsContainer.appendChild(workflowCard);
    });
    
    // Update settings toggles
    if (data.settings) {
        const autoResetToggle = document.getElementById('auto-reset-toggle');
        if (autoResetToggle) {
            autoResetToggle.checked = !!data.settings.autoResetOnSave;
        }
    }
}

// Function to handle project selection
function selectProject(projectName, data) {
    // Update the selected project in the data
    data.projects.selectedProject = projectName;
    
    // Send update to server via WebSocket
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'updateProject',
            project: projectName
        }));
    } else {
        // Fallback to REST API
        updateProjectViaAPI(projectName);
    }
    
    // Update UI with the new selected project
    updateUI(data);
    
    // Show notification
    showNotification(`Project switched to: ${projectName}`);
}

// Update project via REST API
async function updateProjectViaAPI(projectName) {
    try {
        const response = await fetch('/api/project', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ selectedProject: projectName })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Unknown error');
        }
    } catch (error) {
        console.error('Error updating project:', error);
        showNotification(`Error updating project: ${error.message}`, 'error');
    }
}

// Get all packages for the selected project
function getPackagesForSelectedProject(data) {
    const packages = [];
    const selectedProject = data.projects.selectedProject;
    const projectData = data.projects.data[selectedProject];
    
    if (projectData) {
        // Collect all packages from all apps in the selected project
        Object.values(projectData.apps).forEach(app => {
            Object.keys(app.packages).forEach(packageName => {
                if (!packages.includes(packageName)) {
                    packages.push(packageName);
                }
            });
        });
    }
    
    return packages;
}

// Get all apps for the selected project
function getAppsForSelectedProject(data) {
    const apps = [];
    const selectedProject = data.projects.selectedProject;
    const projectData = data.projects.data[selectedProject];
    
    if (projectData) {
        // Collect all apps in the selected project
        Object.keys(projectData.apps).forEach(appName => {
            if (!apps.includes(appName)) {
                apps.push(appName);
            }
        });
    }
    
    return apps;
}

// Get checked out projects
function getCheckedOutProjects(data) {
    return Object.keys(data.projects.data || {});
}

// Get the localhost app for the selected project
function getLocalhostAppForSelectedProject(data) {
    const selectedProject = data.projects.selectedProject;
    const projectData = data.projects.data[selectedProject];
    
    if (projectData && projectData.domains && projectData.domains.localhost) {
        return projectData.domains.localhost.application;
    }
    
    return null;
}

// Update dropdown options dynamically
function updateCopyFromAppDropdown(workflowId, projectName) {
    const copyFromSelect = document.getElementById(`workflow-${workflowId}-copyFromApp`);
    if (!copyFromSelect) return;
    
    // Clear existing options except the first one
    copyFromSelect.innerHTML = '<option value="">-- None --</option>';
    
    // Add apps from selected project
    if (projectName && window.jsphereData.projects.data[projectName]) {
        const apps = Object.keys(window.jsphereData.projects.data[projectName].apps || {});
        apps.forEach(appName => {
            const option = document.createElement('option');
            option.value = appName;
            option.textContent = appName;
            copyFromSelect.appendChild(option);
        });
    }
}

function updateAppDropdown(workflowId, projectName) {
    const appSelect = document.getElementById(`workflow-${workflowId}-appName`);
    if (!appSelect) return;
    
    // Clear existing options
    appSelect.innerHTML = '';
    
    // Add apps from selected project
    if (projectName && window.jsphereData.projects.data[projectName]) {
        const apps = Object.keys(window.jsphereData.projects.data[projectName].apps || {});
        apps.forEach(appName => {
            const option = document.createElement('option');
            option.value = appName;
            option.textContent = appName;
            appSelect.appendChild(option);
        });
    }
}

function updatePackageDropdown(workflowId, projectName, appName) {
    const packageSelect = document.getElementById(`workflow-${workflowId}-packageName`);
    if (!packageSelect) return;
    
    // Clear existing options
    packageSelect.innerHTML = '';
    
    // Add packages from selected app
    if (projectName && appName && 
        window.jsphereData.projects.data[projectName] && 
        window.jsphereData.projects.data[projectName].apps[appName]) {
        const packages = Object.keys(window.jsphereData.projects.data[projectName].apps[appName].packages || {});
        packages.forEach(packageName => {
            const option = document.createElement('option');
            option.value = packageName;
            option.textContent = packageName;
            packageSelect.appendChild(option);
        });
    }
}

// Setup settings handlers
function setupSettingsHandlers() {
    const autoResetToggle = document.getElementById('auto-reset-toggle');
    
    if (autoResetToggle) {
        autoResetToggle.addEventListener('change', () => {
            updateSetting('autoResetOnSave', autoResetToggle.checked);
        });
    }
    
    // Setup reset state button
    const resetStateBtn = document.getElementById('reset-state-btn');
    
    if (resetStateBtn) {
        resetStateBtn.addEventListener('click', () => {
            // Show confirmation dialog
            if (confirm('Are you sure you want to reset the application state? This will clear all project data and cannot be undone.')) {
                resetApplicationState();
            }
        });
    }
    
    // Setup branch history dropdown
    const branchHistorySelect = document.getElementById('branch-history-select');
    
    if (branchHistorySelect) {
        // Populate branch history dropdown with recent branches
        populateBranchHistory(branchHistorySelect);
        
        // Add change event listener
        branchHistorySelect.addEventListener('change', () => {
            if (branchHistorySelect.value) {
                // Handle branch selection
                selectBranch(branchHistorySelect.value);
            }
        });
    }
    
    // Update version information
    updateVersionInfo();
}

// Populate branch history dropdown
function populateBranchHistory(selectElement) {
    // Clear existing options except the first one
    while (selectElement.options.length > 1) {
        selectElement.remove(1);
    }
    
    // Get recent branches from GitHub state
    const recentBranches = getRecentBranches();
    
    // Add options for each branch
    recentBranches.forEach(branch => {
        const option = document.createElement('option');
        option.value = branch;
        option.textContent = branch;
        selectElement.appendChild(option);
    });
}

// Get recent branches from GitHub state
function getRecentBranches() {
    const branches = [];
    const maxBranches = 10;
    
    if (githubStateData && githubStateData.packageRepos) {
        // Collect branches from all package repos
        Object.values(githubStateData.packageRepos).forEach(repo => {
            if (repo.refs) {
                repo.refs.forEach(ref => {
                    if (!branches.includes(ref)) {
                        branches.push(ref);
                    }
                });
            }
        });
    }
    
    // Sort branches and limit to the most recent 10
    return branches.sort().slice(0, maxBranches);
}

// Handle branch selection
function selectBranch(branchName) {
    console.log(`Selected branch: ${branchName}`);
    
    // Send branch selection to server
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'selectBranch',
            branch: branchName
        }));
        
        showNotification(`Selected branch: ${branchName}`);
    } else {
        showNotification('WebSocket not connected', 'error');
    }
}

// Update version information
function updateVersionInfo() {
    // Get version elements
    const jsphereVersionElement = document.getElementById('jsphere-version');
    const elementjsVersionElement = document.getElementById('elementjs-version');
    
    // Get version information from .env or project reference
    const jsphereVersion = getProjectReference() || 'v1.0.0';
    const elementjsVersion = 'v1.0.0'; // This could be fetched from a specific source
    
    // Update version elements
    if (jsphereVersionElement) {
        jsphereVersionElement.textContent = jsphereVersion;
    }
    
    if (elementjsVersionElement) {
        elementjsVersionElement.textContent = elementjsVersion;
    }
}

// Get project reference from .env
function getProjectReference() {
    // This would typically come from the server
    // For now, we'll use the value from the .env file that was loaded
    return window.jsphereData && window.jsphereData.projectReference 
        ? window.jsphereData.projectReference 
        : 'v1.0.0';
}

// Reset application state
function resetApplicationState() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'resetState'
        }));
        
        // Show notification
        showNotification('Resetting application state...');
    } else {
        // Fallback to REST API
        resetStateViaAPI();
    }
}

// Reset state via REST API
async function resetStateViaAPI() {
    try {
        const response = await fetch('/api/reset-state', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Application state reset successfully');
            // Reload the page to reflect the changes
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            throw new Error(result.error || 'Unknown error');
        }
    } catch (error) {
        console.error('Error resetting state:', error);
        showNotification(`Error resetting state: ${error.message}`, 'error');
    }
}

// Create a card for a domain
function createDomainCard(domainName, domainData, isCheckedOut) {
    const card = document.createElement('div');
    card.className = 'card domain-card';
    if (!isCheckedOut) {
        card.classList.add('locked');
    }
    card.dataset.domain = domainName;
    card.dataset.application = domainData.application;

    const header = document.createElement('div');
    header.className = 'card-header';
    
    const title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = domainName;
    
    // Add lock icon for locked domains
    if (!isCheckedOut) {
        const lockIcon = document.createElement('span');
        lockIcon.className = 'lock-icon';
        lockIcon.textContent = '🔒';
        lockIcon.title = 'Project must be checked out to interact';
        header.appendChild(lockIcon);
    }
    
    const content = document.createElement('div');
    content.className = 'card-content';
    
    const appInfo = document.createElement('div');
    appInfo.className = 'info-item';
    appInfo.innerHTML = `<span class="label">Application:</span> <span class="value">${domainData.application}</span>`;
    
    const authInfo = document.createElement('div');
    authInfo.className = 'info-item';
    
    // Create auth key selection only if project is checked out
    if (isCheckedOut && serverAuthKeys.length > 0) {
        authInfo.innerHTML = `<span class="label">Auth Key:</span>`;
        
        const authKeySelect = document.createElement('select');
        authKeySelect.className = 'auth-key-select';
        
        // Add empty option
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = 'Select Auth Key';
        authKeySelect.appendChild(emptyOption);
        
        // Add options from serverAuthKeys
        serverAuthKeys.forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = key;
            if (domainData.authKey === key) {
                option.selected = true;
            }
            authKeySelect.appendChild(option);
        });
        
        // Add change event listener
        authKeySelect.addEventListener('change', () => {
            // Update domain auth key
            domainData.authKey = authKeySelect.value;
            // TODO: Send update to server
            showNotification(`Auth key updated for ${domainName}`);
        });
        
        authInfo.appendChild(authKeySelect);
    } else {
        // For locked domains or when no auth keys are available
        authInfo.innerHTML = `<span class="label">Auth Key:</span> <span class="value">${isCheckedOut && domainData.authKey ? '••••' : 'Not set'}</span>`;
        
        if (!isCheckedOut) {
            const lockMsg = document.createElement('div');
            lockMsg.className = 'lock-message';
            lockMsg.textContent = 'Checkout project to set auth key';
            authInfo.appendChild(lockMsg);
        }
    }
    
    header.appendChild(title);
    content.appendChild(appInfo);
    content.appendChild(authInfo);
    
    // Add domain action button (Reset for localhost, Reload for others)
    if (isCheckedOut) {
        const actionButtonContainer = document.createElement('div');
        actionButtonContainer.className = 'domain-action-container';
        
        const actionButton = document.createElement('button');
        actionButton.className = 'domain-action-btn';
        
        if (domainName === 'localhost') {
            actionButton.textContent = 'Reset';
            actionButton.classList.add('reset-btn');
        } else {
            actionButton.textContent = 'Reload';
            actionButton.classList.add('reload-btn');
        }
        
        // Add click handler
        actionButton.addEventListener('click', () => {
            actionButton.disabled = true;
            const msgType = domainName === 'localhost' ? 'resetDomain' : 'reloadDomain';
            
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: msgType,
                    domain: domainName,
                    application: domainData.application
                }));
                
                showNotification(`${domainName === 'localhost' ? 'Resetting' : 'Reloading'} domain: ${domainName}...`);
            } else {
                showNotification('WebSocket not connected', 'error');
            }
            
            // Re-enable after delay
            setTimeout(() => {
                actionButton.disabled = false;
                showNotification(`${domainName === 'localhost' ? 'Reset' : 'Reload'} completed for ${domainName}`);
            }, 2000);
        });
        
        actionButtonContainer.appendChild(actionButton);
        content.appendChild(actionButtonContainer);
    }
    card.appendChild(header);
    card.appendChild(content);
    
    return card;
}

// Create a card for an app
function createAppCard(appName, appData, isCheckedOut) {
    const card = document.createElement('div');
    card.className = 'card app-card';
    if (!isCheckedOut) {
        card.classList.add('locked');
    }
    card.dataset.app = appName;

    const header = document.createElement('div');
    header.className = 'card-header';
    
    const title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = appName;
    
    // Add lock icon for locked apps
    if (!isCheckedOut) {
        const lockIcon = document.createElement('span');
        lockIcon.className = 'lock-icon';
        lockIcon.textContent = '🔒';
        lockIcon.title = 'Project must be checked out to interact';
        header.appendChild(lockIcon);
    }
    
    // Add Env Variables toggle button
    if (isCheckedOut) {
        const toggleButton = document.createElement('button');
        toggleButton.className = 'env-toggle-btn';
        toggleButton.textContent = 'Env Variables';
        toggleButton.dataset.view = 'app'; // Current view is app
        
        toggleButton.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleAppCardView(card, toggleButton);
        });
        
        header.appendChild(toggleButton);
    }
    
    const content = document.createElement('div');
    content.className = 'card-content';
    
    // Create app content container
    const appContent = document.createElement('div');
    appContent.className = 'app-content active';
    
    const packagesTitle = document.createElement('h4');
    packagesTitle.className = 'card-subtitle';
    packagesTitle.textContent = 'Packages';
    
    const packagesList = document.createElement('div');
    packagesList.className = 'packages-list';
    
    Object.entries(appData.packages).forEach(([packageName, packageData]) => {
        const packageItem = document.createElement('div');
        packageItem.className = 'package-item';
        packageItem.dataset.package = packageName;
        
        const packageHeader = document.createElement('div');
        packageHeader.className = 'package-header';
        
        const packageTitle = document.createElement('span');
        packageTitle.className = 'package-title';
        packageTitle.textContent = packageName;
        
        // Create a button instead of a span for package status
        const packageStatus = document.createElement('button');
        packageStatus.className = `package-status ${packageData.isCheckedOut ? 'checked-out' : 'not-checked-out'}`;
        packageStatus.textContent = packageData.isCheckedOut ? 'Checked Out' : 'Check Out';
        packageStatus.disabled = packageData.isCheckedOut || !isCheckedOut;
        
        // Add click event for checkout only if project is checked out
        if (isCheckedOut && !packageData.isCheckedOut) {
            packageStatus.addEventListener('click', () => {
                // Simulate checkout process
                packageStatus.textContent = 'Checking Out...';
                packageStatus.disabled = true;
                
                // Simulate a delay for the checkout process
                setTimeout(() => {
                    packageData.isCheckedOut = true;
                    packageStatus.textContent = 'Checked Out';
                    packageStatus.className = 'package-status checked-out';
                    showNotification(`Package ${packageName} checked out successfully`);
                }, 1000);
            });
        }
        
        const packageRef = document.createElement('div');
        packageRef.className = 'package-ref';
        packageRef.innerHTML = `<span class="label">Ref:</span> <span class="value">${packageData.ref}</span>`;
        
        // Show ElementJS status if installed
        if (packageData.elementJSInstalled) {
            const elementJSInfo = document.createElement('div');
            elementJSInfo.className = 'package-elementjs';
            elementJSInfo.innerHTML = `<span class="label">ElementJS:</span> <span class="value">${packageData.elementJSVersion}</span>`;
            packageItem.appendChild(elementJSInfo);
        }
        
        packageHeader.appendChild(packageTitle);
        packageHeader.appendChild(packageStatus);
        packageItem.appendChild(packageHeader);
        packageItem.appendChild(packageRef);
        packagesList.appendChild(packageItem);
    });
    
    // Create env variables content container
    const envContent = document.createElement('div');
    envContent.className = 'env-content';
    
    const envTitle = document.createElement('h4');
    envTitle.className = 'card-subtitle';
    envTitle.textContent = 'Environment Variables';
    
    const envList = document.createElement('div');
    envList.className = 'env-list';
    
    // Add sample env variables or load from data
    const envVars = appData.envVariables || {};
    
    // Create env variables list
    Object.entries(envVars).forEach(([key, value]) => {
        const envItem = createEnvVarItem(key, value, appName, isCheckedOut);
        envList.appendChild(envItem);
    });
    
    // Create form to add new env variable
    const addEnvForm = document.createElement('div');
    addEnvForm.className = 'add-env-form';
    
    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.className = 'env-input';
    keyInput.placeholder = 'Variable Name';
    
    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.className = 'env-input';
    valueInput.placeholder = 'Value';
    
    const addButton = document.createElement('button');
    addButton.className = 'add-env-btn';
    addButton.textContent = 'Add';
    addButton.addEventListener('click', () => {
        if (keyInput.value && valueInput.value) {
            // Add new env variable
            const newKey = keyInput.value.trim();
            const newValue = valueInput.value.trim();
            
            // Create new env variable item
            const newEnvItem = createEnvVarItem(newKey, newValue, appName, isCheckedOut);
            envList.appendChild(newEnvItem);
            
            // Update app data
            if (!appData.envVariables) {
                appData.envVariables = {};
            }
            appData.envVariables[newKey] = newValue;
            
            // Send update to server
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'updateEnvVariable',
                    app: appName,
                    key: newKey,
                    value: newValue
                }));
            }
            
            // Clear inputs
            keyInput.value = '';
            valueInput.value = '';
        }
    });
    
    addEnvForm.appendChild(keyInput);
    addEnvForm.appendChild(valueInput);
    addEnvForm.appendChild(addButton);
    
    // Assemble env content
    envContent.appendChild(envTitle);
    envContent.appendChild(envList);
    envContent.appendChild(addEnvForm);
    
    // Assemble app content
    appContent.appendChild(packagesTitle);
    appContent.appendChild(packagesList);
    
    // Add both content containers to the card
    content.appendChild(appContent);
    content.appendChild(envContent);
    
    header.appendChild(title);
    card.appendChild(header);
    card.appendChild(content);
    
    return card;
}

// Get all projects
function getAllProjects(data) {
    return data.projects.allProjects || [];
}

// Get all apps for a specific project
function getAppsForProject(data, projectName) {
    const apps = [];
    
    if (data.projects.data[projectName]) {
        Object.keys(data.projects.data[projectName].apps).forEach(appName => {
            apps.push(appName);
        });
    }
    
    return apps;
}

// Create an environment variable item
function createEnvVarItem(key, value, appName, isCheckedOut) {
    const envItem = document.createElement('div');
    envItem.className = 'env-item';
    
    const keyElement = document.createElement('div');
    keyElement.className = 'env-key';
    keyElement.textContent = key;
    
    // Create editable value element
    const valueContainer = document.createElement('div');
    valueContainer.className = 'env-value-container';
    
    const valueElement = document.createElement('div');
    valueElement.className = 'env-value';
    valueElement.textContent = value;
    valueElement.title = 'Click to edit';
    
    // Create input for editing
    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.className = 'env-value-input';
    valueInput.value = value;
    valueInput.style.display = 'none';
    
    // Add click event to make value editable
    valueElement.addEventListener('click', () => {
        valueElement.style.display = 'none';
        valueInput.style.display = 'block';
        valueInput.focus();
        valueInput.select();
    });
    
    // Handle saving the edited value
    const saveValue = () => {
        const newValue = valueInput.value.trim();
        if (newValue !== value) {
            // Update the display
            valueElement.textContent = newValue;
            
            // Send update to server
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'updateEnvVariable',
                    app: appName,
                    key: key,
                    value: newValue
                }));
                
                showNotification(`Environment variable "${key}" updated`);
            }
            
            // Update local value
            value = newValue;
        }
        
        // Switch back to display mode
        valueInput.style.display = 'none';
        valueElement.style.display = 'block';
    };
    
    // Save on Enter key
    valueInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveValue();
        } else if (e.key === 'Escape') {
            // Cancel editing
            valueInput.value = value;
            valueInput.style.display = 'none';
            valueElement.style.display = 'block';
        }
    });
    
    // Save on blur (when clicking outside)
    valueInput.addEventListener('blur', saveValue);
    
    valueContainer.appendChild(valueElement);
    valueContainer.appendChild(valueInput);
    
    // Create action buttons container
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'env-actions';
    
    // Add edit button
    const editButton = document.createElement('button');
    editButton.className = 'edit-env-btn';
    editButton.textContent = '✎';
    editButton.title = 'Edit variable';
    
    editButton.addEventListener('click', () => {
        valueElement.style.display = 'none';
        valueInput.style.display = 'block';
        valueInput.focus();
        valueInput.select();
    });
    
    // Add delete button
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-env-btn';
    deleteButton.textContent = '×';
    deleteButton.title = 'Delete variable';
    
    deleteButton.addEventListener('click', () => {
        if (confirm(`Are you sure you want to delete the environment variable "${key}"?`)) {
            // Remove from UI
            envItem.remove();
            
            // Send delete request to server
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'deleteEnvVariable',
                    app: appName,
                    key: key
                }));
                
                showNotification(`Environment variable "${key}" deleted`);
            }
        }
    });
    
    actionsContainer.appendChild(editButton);
    actionsContainer.appendChild(deleteButton);
    
    envItem.appendChild(keyElement);
    envItem.appendChild(valueContainer);
    envItem.appendChild(actionsContainer);
    
    return envItem;
}

// Toggle between app content and env variables view
function toggleAppCardView(card, toggleButton) {
    const appContent = card.querySelector('.app-content');
    const envContent = card.querySelector('.env-content');
    
    // Get current view
    const currentView = toggleButton.dataset.view;
    
    if (currentView === 'app') {
        // Switch to env variables view
        appContent.classList.remove('active');
        envContent.classList.add('active');
        toggleButton.textContent = 'App Settings';
        toggleButton.dataset.view = 'env';
    } else {
        // Switch to app view
        envContent.classList.remove('active');
        appContent.classList.add('active');
        toggleButton.textContent = 'Env Variables';
        toggleButton.dataset.view = 'app';
    }
}

// Get all packages for a specific project and app
function getPackagesForProjectApp(data, projectName, appName) {
    const packages = [];
    
    if (data.projects.data[projectName] && 
        data.projects.data[projectName].apps[appName]) {
        Object.keys(data.projects.data[projectName].apps[appName].packages).forEach(packageName => {
            packages.push(packageName);
        });
    }
    
    return packages;
}

// Create a card for a workflow
function createWorkflowCard(workflowId, workflowData, availablePackages = []) {
    const card = document.createElement('div');
    card.className = 'card workflow-card';
    card.dataset.workflow = workflowId;

    const header = document.createElement('div');
    header.className = 'card-header';
    
    // Create expand/collapse button
    const expandBtn = document.createElement('button');
    expandBtn.className = 'expand-btn';
    expandBtn.textContent = '+';  // Start collapsed
    
    const title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = workflowData.title;
    
    // Add title and expand button to header
    header.appendChild(title);
    header.appendChild(expandBtn);
    
    // Add click handlers for toggling
    header.addEventListener('click', (e) => {
        // Don't toggle if clicking the button itself (it has its own handler)
        if (e.target === expandBtn) return;
        toggleWorkflowCard(card);
    });
    
    expandBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent the header click handler from firing
        toggleWorkflowCard(card);
    });
    
    const content = document.createElement('div');
    content.className = 'card-content'; // Start collapsed by default (no 'expanded' class)
    
    const description = document.createElement('div');
    description.className = 'workflow-description';
    description.textContent = workflowData.description;
    
    const inputsContainer = document.createElement('div');
    inputsContainer.className = 'workflow-inputs';
    
    // Handle different workflow types
    if (workflowId === 'createNewProject') {
        content.appendChild(description);
        
        const inputsList = document.createElement('div');
        inputsList.className = 'inputs-list';
        
        // Project Name input
        const projectNameGroup = document.createElement('div');
        projectNameGroup.className = 'input-group';
        
        const projectNameLabel = document.createElement('label');
        projectNameLabel.textContent = 'Project Name';
        projectNameGroup.appendChild(projectNameLabel);
        
        const projectNameInput = document.createElement('input');
        projectNameInput.type = 'text';
        projectNameInput.className = 'workflow-input';
        projectNameInput.value = workflowData.userInputs.projectName.value || '';
        projectNameInput.placeholder = 'Enter project name';
        
        projectNameInput.addEventListener('change', () => {
            updateWorkflowInput(workflowId, 'projectName', projectNameInput.value);
        });
        
        projectNameGroup.appendChild(projectNameInput);
        inputsList.appendChild(projectNameGroup);
        
        // Public/Private dropdown
        const visibilityGroup = document.createElement('div');
        visibilityGroup.className = 'input-group';
        
        const visibilityLabel = document.createElement('label');
        visibilityLabel.textContent = 'Visibility';
        visibilityGroup.appendChild(visibilityLabel);
        
        const visibilitySelect = document.createElement('select');
        visibilitySelect.className = 'workflow-select';
        
        const publicOption = document.createElement('option');
        publicOption.value = 'public';
        publicOption.textContent = 'Public';
        
        const privateOption = document.createElement('option');
        privateOption.value = 'private';
        privateOption.textContent = 'Private';
        
        visibilitySelect.appendChild(publicOption);
        visibilitySelect.appendChild(privateOption);
        
        // Set selected option based on current value
        if (workflowData.userInputs.publicOrPrivate.value === 'private') {
            privateOption.selected = true;
        } else {
            publicOption.selected = true;
        }
        
        visibilitySelect.addEventListener('change', () => {
            updateWorkflowInput(workflowId, 'publicOrPrivate', visibilitySelect.value);
        });
        
        visibilityGroup.appendChild(visibilitySelect);
        inputsList.appendChild(visibilityGroup);
        
        // Add Execute button
        const executeButton = document.createElement('button');
        executeButton.className = 'workflow-execute-btn create-btn';
        executeButton.textContent = 'Create Project';
        executeButton.addEventListener('click', () => {
            if (!projectNameInput.value.trim()) {
                showNotification('Project name is required', 'error');
                return;
            }
            
            executeButton.disabled = true;
            executeButton.textContent = 'Creating...';
            
            // Send execute command
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'executeWorkflow',
                    workflowId: 'createNewProject',
                    inputs: {
                        projectName: projectNameInput.value.trim(),
                        publicOrPrivate: visibilitySelect.value
                    }
                }));
            } else {
                showNotification('WebSocket not connected', 'error');
            }
            
            // Re-enable after delay
            setTimeout(() => {
                executeButton.disabled = false;
                executeButton.textContent = 'Create Project';
            }, 2000);
        });
        
        inputsList.appendChild(executeButton);
        inputsContainer.appendChild(inputsList);
    }
    
    else if (workflowId === 'createNewApp') {
        content.appendChild(description);
        
        const inputsList = document.createElement('div');
        inputsList.className = 'inputs-list';
        
        // Project selection
        const projectGroup = document.createElement('div');
        projectGroup.className = 'input-group';
        
        const projectLabel = document.createElement('label');
        projectLabel.textContent = 'Project';
        projectGroup.appendChild(projectLabel);
        
        const projectSelect = document.createElement('select');
        projectSelect.className = 'workflow-select';
        projectSelect.id = `workflow-${workflowId}-projectName`;
        
        // Add options for each project
        window.jsphereData.projects.allProjects.forEach(projectName => {
            const option = document.createElement('option');
            option.value = projectName;
            option.textContent = projectName;
            if (workflowData.userInputs.projectName.value === projectName) {
                option.selected = true;
            }
            projectSelect.appendChild(option);
        });
        
        projectSelect.addEventListener('change', () => {
            updateWorkflowInput(workflowId, 'projectName', projectSelect.value);
            updateCopyFromAppDropdown(workflowId, projectSelect.value);
        });
        
        projectGroup.appendChild(projectSelect);
        inputsList.appendChild(projectGroup);
        
        // App Name input with prefix
        const appNameGroup = document.createElement('div');
        appNameGroup.className = 'input-group';
        
        const appNameLabel = document.createElement('label');
        appNameLabel.textContent = 'App Name (will be prefixed with "app.")';
        appNameGroup.appendChild(appNameLabel);
        
        const appNameInput = document.createElement('input');
        appNameInput.type = 'text';
        appNameInput.className = 'workflow-input';
        // Remove "app." prefix if it exists for display
        const currentAppName = workflowData.userInputs.appName.value || '';
        appNameInput.value = currentAppName.startsWith('app.') ? currentAppName.substring(4) : currentAppName;
        appNameInput.placeholder = 'Enter app name (without app. prefix)';
        
        appNameInput.addEventListener('change', () => {
            const fullAppName = appNameInput.value.trim() ? `app.${appNameInput.value.trim()}` : '';
            updateWorkflowInput(workflowId, 'appName', fullAppName);
        });
        
        appNameGroup.appendChild(appNameInput);
        inputsList.appendChild(appNameGroup);
        
        // Copy From App dropdown
        const copyFromGroup = document.createElement('div');
        copyFromGroup.className = 'input-group';
        
        const copyFromLabel = document.createElement('label');
        copyFromLabel.textContent = 'Copy From App (Optional)';
        copyFromGroup.appendChild(copyFromLabel);
        
        const copyFromSelect = document.createElement('select');
        copyFromSelect.className = 'workflow-select';
        copyFromSelect.id = `workflow-${workflowId}-copyFromApp`;
        
        // Add empty option
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '-- None --';
        copyFromSelect.appendChild(emptyOption);
        
        // Populate with apps from selected project
        const selectedProject = projectSelect.value;
        if (selectedProject && window.jsphereData.projects.data[selectedProject]) {
            const apps = Object.keys(window.jsphereData.projects.data[selectedProject].apps || {});
            apps.forEach(appName => {
                const option = document.createElement('option');
                option.value = appName;
                option.textContent = appName;
                if (workflowData.userInputs.copyFromApp.value === appName) {
                    option.selected = true;
                }
                copyFromSelect.appendChild(option);
            });
        }
        
        copyFromSelect.addEventListener('change', () => {
            updateWorkflowInput(workflowId, 'copyFromApp', copyFromSelect.value);
        });
        
        copyFromGroup.appendChild(copyFromSelect);
        inputsList.appendChild(copyFromGroup);
        
        // Add Execute button
        const executeButton = document.createElement('button');
        executeButton.className = 'workflow-execute-btn create-btn';
        executeButton.textContent = 'Create App';
        executeButton.addEventListener('click', () => {
            if (!appNameInput.value.trim()) {
                showNotification('App name is required', 'error');
                return;
            }
            
            executeButton.disabled = true;
            executeButton.textContent = 'Creating...';
            
            // Send execute command
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'executeWorkflow',
                    workflowId: 'createNewApp',
                    inputs: {
                        projectName: projectSelect.value,
                        appName: `app.${appNameInput.value.trim()}`,
                        copyFromApp: copyFromSelect.value
                    }
                }));
            } else {
                showNotification('WebSocket not connected', 'error');
            }
            
            // Re-enable after delay
            setTimeout(() => {
                executeButton.disabled = false;
                executeButton.textContent = 'Create App';
            }, 2000);
        });
        
        inputsList.appendChild(executeButton);
        inputsContainer.appendChild(inputsList);
    }
    
    else if (workflowId === 'createNewPackage') {
        content.appendChild(description);
        
        const inputsList = document.createElement('div');
        inputsList.className = 'inputs-list';
        
        // Project selection
        const projectGroup = document.createElement('div');
        projectGroup.className = 'input-group';
        
        const projectLabel = document.createElement('label');
        projectLabel.textContent = 'Project';
        projectGroup.appendChild(projectLabel);
        
        const projectSelect = document.createElement('select');
        projectSelect.className = 'workflow-select';
        projectSelect.id = `workflow-${workflowId}-projectName`;
        
        // Add options for each project
        window.jsphereData.projects.allProjects.forEach(projectName => {
            const option = document.createElement('option');
            option.value = projectName;
            option.textContent = projectName;
            if (workflowData.userInputs.projectName.value === projectName) {
                option.selected = true;
            }
            projectSelect.appendChild(option);
        });
        
        projectSelect.addEventListener('change', () => {
            updateWorkflowInput(workflowId, 'projectName', projectSelect.value);
            updateAppDropdown(workflowId, projectSelect.value);
        });
        
        projectGroup.appendChild(projectSelect);
        inputsList.appendChild(projectGroup);
        
        // App selection
        const appGroup = document.createElement('div');
        appGroup.className = 'input-group';
        
        const appLabel = document.createElement('label');
        appLabel.textContent = 'App';
        appGroup.appendChild(appLabel);
        
        const appSelect = document.createElement('select');
        appSelect.className = 'workflow-select';
        appSelect.id = `workflow-${workflowId}-appName`;
        
        // Populate with apps from selected project
        const selectedProject = projectSelect.value;
        if (selectedProject && window.jsphereData.projects.data[selectedProject]) {
            const apps = Object.keys(window.jsphereData.projects.data[selectedProject].apps || {});
            apps.forEach(appName => {
                const option = document.createElement('option');
                option.value = appName;
                option.textContent = appName;
                if (workflowData.userInputs.appName.value === appName) {
                    option.selected = true;
                }
                appSelect.appendChild(option);
            });
        }
        
        appSelect.addEventListener('change', () => {
            updateWorkflowInput(workflowId, 'appName', appSelect.value);
        });
        
        appGroup.appendChild(appSelect);
        inputsList.appendChild(appGroup);
        
        // Package Name input
        const packageNameGroup = document.createElement('div');
        packageNameGroup.className = 'input-group';
        
        const packageNameLabel = document.createElement('label');
        packageNameLabel.textContent = 'Package Name';
        packageNameGroup.appendChild(packageNameLabel);
        
        const packageNameInput = document.createElement('input');
        packageNameInput.type = 'text';
        packageNameInput.className = 'workflow-input';
        packageNameInput.value = workflowData.userInputs.packageName.value || '';
        packageNameInput.placeholder = 'Enter package name';
        
        packageNameInput.addEventListener('change', () => {
            updateWorkflowInput(workflowId, 'packageName', packageNameInput.value.trim());
        });
        
        packageNameGroup.appendChild(packageNameInput);
        inputsList.appendChild(packageNameGroup);
        
        // Add Execute button
        const executeButton = document.createElement('button');
        executeButton.className = 'workflow-execute-btn create-btn';
        executeButton.textContent = 'Create Package';
        executeButton.addEventListener('click', () => {
            if (!packageNameInput.value.trim()) {
                showNotification('Package name is required', 'error');
                return;
            }
            
            executeButton.disabled = true;
            executeButton.textContent = 'Creating...';
            
            // Send execute command
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'executeWorkflow',
                    workflowId: 'createNewPackage',
                    inputs: {
                        projectName: projectSelect.value,
                        appName: appSelect.value,
                        packageName: packageNameInput.value.trim()
                    }
                }));
            } else {
                showNotification('WebSocket not connected', 'error');
            }
            
            // Re-enable after delay
            setTimeout(() => {
                executeButton.disabled = false;
                executeButton.textContent = 'Create Package';
            }, 2000);
        });
        
        inputsList.appendChild(executeButton);
        inputsContainer.appendChild(inputsList);
    }
    
    else if (workflowId === 'installElementJS') {
        content.appendChild(description);
        
        const inputsList = document.createElement('div');
        inputsList.className = 'inputs-list';
        
        // Project selection (only checked out projects)
        const projectGroup = document.createElement('div');
        projectGroup.className = 'input-group';
        
        const projectLabel = document.createElement('label');
        projectLabel.textContent = 'Project (Checked Out Only)';
        projectGroup.appendChild(projectLabel);
        
        const projectSelect = document.createElement('select');
        projectSelect.className = 'workflow-select';
        projectSelect.id = `workflow-${workflowId}-projectName`;
        
        // Add options for each checked out project
        const checkedOutProjects = getCheckedOutProjects(window.jsphereData);
        checkedOutProjects.forEach(projectName => {
            const option = document.createElement('option');
            option.value = projectName;
            option.textContent = projectName;
            if (workflowData.userInputs.projectName.value === projectName) {
                option.selected = true;
            }
            projectSelect.appendChild(option);
        });
        
        projectSelect.addEventListener('change', () => {
            updateWorkflowInput(workflowId, 'projectName', projectSelect.value);
            updateAppDropdown(workflowId, projectSelect.value);
            // Clear package dropdown since app has changed
            const packageSelect = document.getElementById(`workflow-${workflowId}-packageName`);
            if (packageSelect) {
                packageSelect.innerHTML = '';
            }
        });
        
        projectGroup.appendChild(projectSelect);
        inputsList.appendChild(projectGroup);
        
        // App selection
        const appGroup = document.createElement('div');
        appGroup.className = 'input-group';
        
        const appLabel = document.createElement('label');
        appLabel.textContent = 'App';
        appGroup.appendChild(appLabel);
        
        const appSelect = document.createElement('select');
        appSelect.className = 'workflow-select';
        appSelect.id = `workflow-${workflowId}-appName`;
        
        // Populate with apps from selected project
        const selectedProject = projectSelect.value;
        if (selectedProject && window.jsphereData.projects.data[selectedProject]) {
            const apps = Object.keys(window.jsphereData.projects.data[selectedProject].apps || {});
            apps.forEach(appName => {
                const option = document.createElement('option');
                option.value = appName;
                option.textContent = appName;
                if (workflowData.userInputs.appName.value === appName) {
                    option.selected = true;
                }
                appSelect.appendChild(option);
            });
        }
        
        appSelect.addEventListener('change', () => {
            updateWorkflowInput(workflowId, 'appName', appSelect.value);
            updatePackageDropdown(workflowId, projectSelect.value, appSelect.value);
        });
        
        appGroup.appendChild(appSelect);
        inputsList.appendChild(appGroup);
        
        // Package selection
        const packageGroup = document.createElement('div');
        packageGroup.className = 'input-group';
        
        const packageLabel = document.createElement('label');
        packageLabel.textContent = 'Package';
        packageGroup.appendChild(packageLabel);
        
        const packageSelect = document.createElement('select');
        packageSelect.className = 'workflow-select';
        packageSelect.id = `workflow-${workflowId}-packageName`;
        
        // Populate with packages from selected app
        if (selectedProject && 
            window.jsphereData.projects.data[selectedProject] && 
            appSelect.value &&
            window.jsphereData.projects.data[selectedProject].apps[appSelect.value]) {
            const packages = Object.keys(window.jsphereData.projects.data[selectedProject].apps[appSelect.value].packages || {});
            packages.forEach(packageName => {
                const option = document.createElement('option');
                option.value = packageName;
                option.textContent = packageName;
                if (workflowData.userInputs.packageName.value === packageName) {
                    option.selected = true;
                }
                packageSelect.appendChild(option);
            });
        }
        
        packageSelect.addEventListener('change', () => {
            updateWorkflowInput(workflowId, 'packageName', packageSelect.value);
        });
        
        packageGroup.appendChild(packageSelect);
        inputsList.appendChild(packageGroup);
        
        // Add Execute button
        const executeButton = document.createElement('button');
        executeButton.className = 'workflow-execute-btn install-btn';
        executeButton.textContent = 'Install ElementJS';
        executeButton.addEventListener('click', () => {
            if (!packageSelect.value) {
                showNotification('Please select a package', 'error');
                return;
            }
            
            executeButton.disabled = true;
            executeButton.textContent = 'Installing...';
            
            // Send execute command
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'executeWorkflow',
                    workflowId: 'installElementJS',
                    inputs: {
                        projectName: projectSelect.value,
                        appName: appSelect.value,
                        packageName: packageSelect.value
                    }
                }));
            } else {
                showNotification('WebSocket not connected', 'error');
            }
            
            // Re-enable after delay
            setTimeout(() => {
                executeButton.disabled = false;
                executeButton.textContent = 'Install ElementJS';
            }, 2000);
        });
        
        inputsList.appendChild(executeButton);
        inputsContainer.appendChild(inputsList);
    }
    
    // Special handling for Reset Localhost workflow
    else if (workflowId === 'resetDomain') {
        // Add description above app-info for resetDomain workflow
        content.appendChild(description);
        
        const appInfo = document.createElement('div');
        appInfo.className = 'app-info';
        
        // Get the localhost app for the selected project
        const localhostApp = getLocalhostAppForSelectedProject(window.jsphereData);
        
        // Show the mapped app
        const appDisplay = document.createElement('div');
        appDisplay.className = 'app-display';
        appDisplay.innerHTML = `
            <span class="label">Localhost App:</span>
            <span class="value">${localhostApp || 'No app available'}</span>
        `;
        
        // Add reset button
        const resetButton = document.createElement('button');
        resetButton.className = 'reset-button';
        resetButton.textContent = 'Reset';
        resetButton.addEventListener('click', () => {
            resetButton.disabled = true;
            resetButton.textContent = 'Resetting...';
            
            // Send reset command
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'executeWorkflow',
                    workflowId: 'resetDomain'
                }));
            } else {
                showNotification('WebSocket not connected', 'error');
            }
            
            // Re-enable button after delay
            setTimeout(() => {
                resetButton.disabled = false;
                resetButton.textContent = 'Reset';
                showNotification('Localhost reset completed');
            }, 2000);
        });
        
        appInfo.appendChild(appDisplay);
        appInfo.appendChild(resetButton);
        content.appendChild(appInfo);
    }
    
    // Handle existing workflows (syncAndReload)
    else if (workflowData.userInputs && Object.keys(workflowData.userInputs).length > 0) {
        // Only add "User Inputs" title for workflows other than resetDomain
        if (workflowId !== 'resetDomain') {
            const inputsTitle = document.createElement('h4');
            inputsTitle.className = 'card-subtitle';
            inputsTitle.textContent = 'User Inputs';
            inputsContainer.appendChild(inputsTitle);
        }
        
        const inputsList = document.createElement('div');
        inputsList.className = 'inputs-list';
        
        // Handle package selection
        if (workflowData.userInputs.packageName && workflowData.userInputs.packageName.options === 'selectedProjectPackages') {
            const inputItem = document.createElement('div');
            inputItem.className = 'input-item';
            
            // Create a select dropdown for packages
            const selectContainer = document.createElement('div');
            selectContainer.className = 'select-container';
            selectContainer.innerHTML = `<span class="label">Package Name:</span>`;
            
            const select = document.createElement('select');
            select.className = 'package-select';
            select.id = `workflow-${workflowId}-packageName`;
            
            // Add options for each package
            availablePackages.forEach(packageName => {
                const option = document.createElement('option');
                option.value = packageName;
                option.textContent = packageName;
                if (workflowData.userInputs.packageName.value === packageName) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
            
            // Add change event listener
            select.addEventListener('change', () => {
                updateWorkflowInput(workflowId, 'packageName', select.value);
            });
            
            selectContainer.appendChild(select);
            inputItem.appendChild(selectContainer);
            inputsList.appendChild(inputItem);
        }
        
        // Handle branch inputs with text fields
        if (workflowId === 'syncAndReload') {
            const branchInputs = document.createElement('div');
            branchInputs.className = 'branch-inputs';
            
            // Target Branch input
            const targetBranchGroup = document.createElement('div');
            targetBranchGroup.className = 'input-group';
            
            const targetBranchLabel = document.createElement('label');
            targetBranchLabel.textContent = 'Target Branch';
            targetBranchGroup.appendChild(targetBranchLabel);
            
            const targetBranchInput = document.createElement('input');
            targetBranchInput.type = 'text';
            targetBranchInput.className = 'branch-input';
            targetBranchInput.value = workflowData.userInputs.targetBranch.value || '';
            targetBranchInput.placeholder = 'Enter target branch name';
            
            targetBranchInput.addEventListener('change', () => {
                updateWorkflowInput(workflowId, 'targetBranch', targetBranchInput.value);
            });
            
            targetBranchGroup.appendChild(targetBranchInput);
            branchInputs.appendChild(targetBranchGroup);
            
            // Trunk Branch input
            const trunkBranchGroup = document.createElement('div');
            trunkBranchGroup.className = 'input-group';
            
            const trunkBranchLabel = document.createElement('label');
            trunkBranchLabel.textContent = 'Trunk Branch';
            trunkBranchGroup.appendChild(trunkBranchLabel);
            
            const trunkBranchInput = document.createElement('input');
            trunkBranchInput.type = 'text';
            trunkBranchInput.className = 'branch-input';
            trunkBranchInput.value = workflowData.userInputs.trunkBranch.value || '';
            trunkBranchInput.placeholder = 'Enter trunk branch name';
            
            trunkBranchInput.addEventListener('change', () => {
                updateWorkflowInput(workflowId, 'trunkBranch', trunkBranchInput.value);
            });
            
            trunkBranchGroup.appendChild(trunkBranchInput);
            branchInputs.appendChild(trunkBranchGroup);
            
            inputsList.appendChild(branchInputs);
            
            // Add Execute button for Sync and Reload workflow
            const executeButton = document.createElement('button');
            executeButton.className = 'workflow-execute-btn';
            executeButton.textContent = 'Execute';
            executeButton.addEventListener('click', () => {
                executeButton.disabled = true;
                executeButton.textContent = 'Executing...';
                
                // Send execute command
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: 'executeWorkflow',
                        workflowId: 'syncAndReload'
                    }));
                } else {
                    showNotification('WebSocket not connected', 'error');
                }
                
                // Re-enable button after delay
                setTimeout(() => {
                    executeButton.disabled = false;
                    executeButton.textContent = 'Execute';
                    showNotification('Sync and Reload completed');
                }, 2000);
            });
            
            inputsList.appendChild(executeButton);
        }
        
        inputsContainer.appendChild(inputsList);
    }
    
    // Title is already appended to header above
    // Only add description here for workflows other than resetDomain and new workflows
    // (resetDomain and new workflows descriptions are already added above)
    if (workflowId !== 'resetDomain' && 
        workflowId !== 'createNewProject' && 
        workflowId !== 'createNewApp' && 
        workflowId !== 'createNewPackage' && 
        workflowId !== 'installElementJS') {
        content.appendChild(description);
    }
    content.appendChild(inputsContainer);
    card.appendChild(header);
    card.appendChild(content);
    
    return card;
}

// Update workflow input
function updateWorkflowInput(workflowId, inputName, value) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'updateWorkflowInput',
            workflowId: workflowId,
            inputName: inputName,
            value: value
        }));
    } else {
        // Fallback to REST API
        updateWorkflowInputViaAPI(workflowId, inputName, value);
    }
}

// Update workflow input via REST API
async function updateWorkflowInputViaAPI(workflowId, inputName, value) {
    try {
        const response = await fetch('/api/workflow/input', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                workflowId: workflowId,
                inputName: inputName,
                value: value
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`Workflow input updated: ${inputName} = ${value}`);
        } else {
            throw new Error(result.error || 'Unknown error');
        }
    } catch (error) {
        console.error('Error updating workflow input:', error);
        showNotification(`Error updating workflow input: ${error.message}`, 'error');
    }
}

// Setup expand/collapse functionality for sections
function setupExpandCollapse() {
    const sections = [
        { id: 'settings', defaultExpanded: false },
        { id: 'projects', defaultExpanded: false },
        { id: 'domains', defaultExpanded: false },
        { id: 'apps', defaultExpanded: false },
        { id: 'workflows', defaultExpanded: false }
    ];
    
    sections.forEach(section => {
        const header = document.querySelector(`.${section.id}-section .section-header`);
        const button = document.getElementById(`expand-${section.id}`);
        const content = document.getElementById(`${section.id}-content`);
        
        // Always start collapsed, ignore localStorage
        button.textContent = '+';
        content.classList.remove('expanded');
        
        // Clear any existing localStorage value
        localStorage.removeItem(`${section.id}-expanded`);
        
        // Make the entire header clickable
        header.addEventListener('click', (e) => {
            // Don't toggle if clicking the button itself (it has its own handler)
            if (e.target === button) return;
            
            toggleSection(section.id);
        });
        
        // Button click handler
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent the header click handler from firing
            toggleSection(section.id);
        });
    });
}

// Toggle section expanded/collapsed state
function toggleSection(sectionId) {
    const button = document.getElementById(`expand-${sectionId}`);
    const content = document.getElementById(`${sectionId}-content`);
    const isExpanded = content.classList.contains('expanded');
    
    if (isExpanded) {
        content.classList.remove('expanded');
        button.textContent = '+';
    } else {
        content.classList.add('expanded');
        button.textContent = '-';
    }
    
    // Save state to localStorage
    localStorage.setItem(`${sectionId}-expanded`, !isExpanded);
}

// Toggle workflow card expanded/collapsed state
function toggleWorkflowCard(card) {
    const content = card.querySelector('.card-content');
    const button = card.querySelector('.expand-btn');
    const isExpanded = content.classList.contains('expanded');
    
    if (isExpanded) {
        content.classList.remove('expanded');
        button.textContent = '+';
    } else {
        content.classList.add('expanded');
        button.textContent = '-';
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    // Any resize handlers can go here
});

// Initialize the UI when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeUI);