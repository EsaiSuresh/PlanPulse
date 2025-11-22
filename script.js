document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const timeSlotsContainer = document.getElementById('time-slots');
    const taskInput = document.getElementById('task-input');
    const estimatedHours = document.getElementById('estimated-hours');
    const estimatedMinutes = document.getElementById('estimated-minutes');
    const addTaskBtn = document.getElementById('add-task-btn');
    const clearAllBtn = document.getElementById('clear-all');
    const currentDateElement = document.getElementById('current-date');
    const totalTasksElement = document.getElementById('total-tasks');
    const totalEstimatedElement = document.getElementById('total-estimated');
    const totalActualElement = document.getElementById('total-actual');
    const timeDifferenceElement = document.getElementById('time-difference');

    // State
    let tasks = JSON.parse(localStorage.getItem('timeManagementTasks')) || [];
    let timers = {};
    let currentDate = new Date();
    let selectedDate = new Date();

    // Initialize the app
    function init() {
        updateDate();
        renderTimeSlots();
        updateSummary();
        loadTasks();
        renderCalendar();
        setupEventListeners();
    }

    // Update the current date display
    function updateDate() {
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        const fullOptions = { 
            ...options,
            weekday: 'long'
        };
        
        // Update the date display in the trigger
        document.getElementById('current-date').textContent = selectedDate.toLocaleDateString('en-US', options);
        
        // Update the month-year in the calendar
        document.getElementById('month-year').textContent = selectedDate.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
        });
        
        // Update the summary date
        document.getElementById('summary-date').textContent = selectedDate.toLocaleDateString('en-US', fullOptions);
    }

    // Format time in HH:MM AM/PM format
    function formatHour(hour) {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:00 ${period}`;
    }

    // Format minutes to always be two digits
    function formatMinutes(minutes) {
        return minutes < 10 ? `0${minutes}` : minutes;
    }

    // Format time in hours and minutes (e.g., 2h 30m)
    function formatTime(hours, minutes) {
        if (hours === 0 && minutes === 0) return '0m';
        return `${hours > 0 ? `${hours}h ` : ''}${minutes > 0 ? `${minutes}m` : ''}`.trim();
    }

    // Calculate total minutes from hours and minutes
    function toMinutes(hours, minutes) {
        return (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
    }

    // Convert minutes to hours and minutes
    function toHoursAndMinutes(totalMinutes) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return { hours, minutes };
    }

    // Create time slots for the day (9 AM to 5 PM)
    function renderTimeSlots() {
        timeSlotsContainer.innerHTML = '';
        
        for (let hour = 9; hour <= 17; hour++) {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            timeSlot.dataset.hour = hour;
            
            const taskInfo = document.createElement('div');
            taskInfo.className = 'task-info';
            
            const taskText = document.createElement('div');
            taskText.className = 'task-text';
            taskText.textContent = 'No task scheduled';
            
            const taskTime = document.createElement('div');
            taskTime.className = 'task-time';
            
            const estimatedTime = document.createElement('span');
            estimatedTime.className = 'estimated-time';
            estimatedTime.textContent = 'Estimated: 0h 0m';
            
            const timeSpentContainer = document.createElement('div');
            timeSpentContainer.className = 'time-spent';
            
            const timeSpentLabel = document.createElement('span');
            timeSpentLabel.textContent = 'Actual: ';
            
            const timeSpentInput = document.createElement('div');
            timeSpentInput.className = 'time-spent-input';
            timeSpentInput.style.display = 'none';
            
            const hoursInput = document.createElement('input');
            hoursInput.type = 'number';
            hoursInput.min = '0';
            hoursInput.placeholder = 'H';
            hoursInput.className = 'time-input';
            
            const colon = document.createElement('span');
            colon.textContent = ':';
            
            const minutesInput = document.createElement('input');
            minutesInput.type = 'number';
            minutesInput.min = '0';
            minutesInput.max = '59';
            minutesInput.placeholder = 'M';
            minutesInput.className = 'time-input';
            
            const saveTimeBtn = document.createElement('button');
            saveTimeBtn.textContent = 'Save';
            saveTimeBtn.className = 'save-time-btn';
            saveTimeBtn.onclick = () => saveTimeSpent(hour, hoursInput.value, minutesInput.value);
            
            timeSpentInput.appendChild(hoursInput);
            timeSpentInput.appendChild(colon);
            timeSpentInput.appendChild(minutesInput);
            timeSpentInput.appendChild(saveTimeBtn);
            
            const timeSpentDisplay = document.createElement('span');
            timeSpentDisplay.className = 'time-spent-display';
            timeSpentDisplay.textContent = '0h 0m';
            
            timeSpentContainer.appendChild(timeSpentLabel);
            timeSpentContainer.appendChild(timeSpentDisplay);
            
            taskTime.appendChild(estimatedTime);
            taskTime.appendChild(timeSpentContainer);
            taskTime.appendChild(timeSpentInput);
            
            const actions = document.createElement('div');
            actions.className = 'actions';
            
            const completeBtn = document.createElement('button');
            completeBtn.className = 'complete-btn';
            completeBtn.textContent = 'Complete';
            completeBtn.onclick = () => toggleComplete(hour);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.onclick = () => deleteTask(hour);
            
            actions.appendChild(completeBtn);
            actions.appendChild(deleteBtn);
            
            taskInfo.appendChild(taskText);
            taskInfo.appendChild(taskTime);
            
            timeSlot.appendChild(taskInfo);
            timeSlot.appendChild(actions);
            timeSlot.appendChild(timeSpentInput);
            
            timeSlotsContainer.appendChild(timeSlot);
        }
    }

    // Save task to localStorage
    function saveTask(hour, task, estimatedTime) {
        // Create a date string in YYYY-MM-DD format for the selected date
        const dateString = selectedDate.toISOString().split('T')[0];
        const taskId = `${dateString}-${hour}`;
        
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        const taskData = {
            id: taskId,
            date: dateString,
            hour,
            text: task,
            estimatedTime: {
                hours: parseInt(estimatedTime.hours) || 0,
                minutes: parseInt(estimatedTime.minutes) || 0
            },
            actualTime: {
                hours: 0,
                minutes: 0
            },
            completed: false,
            createdAt: new Date().toISOString()
        };

        if (taskIndex !== -1) {
            tasks[taskIndex] = { ...tasks[taskIndex], ...taskData };
        } else {
            tasks.push(taskData);
        }

        localStorage.setItem('timeManagementTasks', JSON.stringify(tasks));
        updateSummary();
    }

    // Save time spent on a task
    function saveTimeSpent(hour, hours, minutes) {
        const dateString = selectedDate.toISOString().split('T')[0];
        const taskIndex = tasks.findIndex(t => t.hour === hour && t.date === dateString);
        if (taskIndex === -1) return;

        tasks[taskIndex].actualTime = {
            hours: parseInt(hours) || 0,
            minutes: parseInt(minutes) || 0
        };

        localStorage.setItem('timeManagementTasks', JSON.stringify(tasks));
        updateTaskDisplay(hour);
        updateSummary();
    }

    // Toggle task completion
    function toggleComplete(hour) {
        const dateString = selectedDate.toISOString().split('T')[0];
        const taskIndex = tasks.findIndex(t => t.hour === hour && t.date === dateString);
        if (taskIndex === -1) return;

        tasks[taskIndex].completed = !tasks[taskIndex].completed;
        localStorage.setItem('timeManagementTasks', JSON.stringify(tasks));
        updateTaskDisplay(hour);
        updateSummary();
    }

    // Delete a task
    function deleteTask(hour) {
        const dateString = selectedDate.toISOString().split('T')[0];
        tasks = tasks.filter(t => !(t.hour === hour && t.date === dateString));
        localStorage.setItem('timeManagementTasks', JSON.stringify(tasks));
        updateTaskDisplay(hour);
        updateSummary();
    }

    // Update the display of a specific task
    function updateTaskDisplay(hour) {
        const timeSlot = document.querySelector(`.time-slot[data-hour="${hour}"]`);
        if (!timeSlot) return;

        const dateString = selectedDate.toISOString().split('T')[0];
        const task = tasks.find(t => t.hour === hour && t.date === dateString);
        const taskText = timeSlot.querySelector('.task-text');
        const estimatedTime = timeSlot.querySelector('.estimated-time');
        const timeSpentDisplay = timeSlot.querySelector('.time-spent-display');
        const timeSpentContainer = timeSlot.querySelector('.time-spent');
        const timeSpentInput = timeSlot.querySelector('.time-spent-input');
        const completeBtn = timeSlot.querySelector('.complete-btn');
        
        if (task) {
            timeSlot.classList.add('has-task');
            taskText.textContent = task.text;
            estimatedTime.textContent = `Estimated: ${formatTime(task.estimatedTime.hours, task.estimatedTime.minutes)}`;
            timeSpentDisplay.textContent = `${formatTime(task.actualTime.hours, task.actualTime.minutes)}`;
            
            if (task.completed) {
                timeSlot.classList.add('completed');
                completeBtn.textContent = 'Undo';
                timeSpentContainer.style.display = 'none';
                timeSpentInput.style.display = 'flex';
            } else {
                timeSlot.classList.remove('completed');
                completeBtn.textContent = 'Complete';
                timeSpentContainer.style.display = 'block';
                timeSpentInput.style.display = 'none';
            }
        } else {
            timeSlot.classList.remove('has-task', 'completed');
            taskText.textContent = 'No task scheduled';
            estimatedTime.textContent = 'Estimated: 0h 0m';
            timeSpentDisplay.textContent = '0h 0m';
            timeSpentContainer.style.display = 'block';
            timeSpentInput.style.display = 'none';
        }
    }

    // Load saved tasks for the selected date
    function loadTasks() {
        const dateString = selectedDate.toISOString().split('T')[0];
        const tasksForDate = tasks.filter(task => task.date === dateString);
        
        // Clear all time slots first
        document.querySelectorAll('.time-slot').forEach(slot => {
            const hour = parseInt(slot.dataset.hour);
            updateTaskDisplay(hour);
        });
        
        // Update display for tasks on the selected date
        tasksForDate.forEach(task => {
            updateTaskDisplay(task.hour);
        });
        
        updateSummary();
    }

    // Update the summary section
    function updateSummary() {
        const dateString = selectedDate.toISOString().split('T')[0];
        const tasksForDate = tasks.filter(task => task.date === dateString);
        const totalTasks = tasksForDate.length;
        let totalEstimatedMinutes = 0;
        let totalActualMinutes = 0;

        tasksForDate.forEach(task => {
            totalEstimatedMinutes += toMinutes(task.estimatedTime.hours, task.estimatedTime.minutes);
            totalActualMinutes += toMinutes(task.actualTime.hours, task.actualTime.minutes);
        });

        const estimated = toHoursAndMinutes(totalEstimatedMinutes);
        const actual = toHoursAndMinutes(totalActualMinutes);
        const difference = toHoursAndMinutes(Math.abs(totalEstimatedMinutes - totalActualMinutes));
        
        const differenceSign = totalEstimatedMinutes >= totalActualMinutes ? '-' : '+';

        totalTasksElement.textContent = totalTasks;
        totalEstimatedElement.textContent = formatTime(estimated.hours, estimated.minutes);
        totalActualElement.textContent = formatTime(actual.hours, actual.minutes);
        timeDifferenceElement.textContent = `${differenceSign}${formatTime(difference.hours, difference.minutes)}`;
        
        // Update color based on time difference
        if (totalEstimatedMinutes > totalActualMinutes) {
            timeDifferenceElement.style.color = '#28a745'; // Green for under-estimated
        } else if (totalEstimatedMinutes < totalActualMinutes) {
            timeDifferenceElement.style.color = '#dc3545'; // Red for over-estimated
        } else {
            timeDifferenceElement.style.color = ''; // Default color if equal
        }
    }

    // Render the calendar
    function renderCalendar() {
        const calendarDays = document.getElementById('calendar-days');
        
        // Clear previous days
        calendarDays.innerHTML = '';
        
        // Get the first day of the month and the last day of the month
        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        
        // Get the day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
        const firstDayIndex = firstDay.getDay();
        
        // Get the last day of the previous month
        const prevLastDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
        
        // Add days from previous month
        for (let i = firstDayIndex; i > 0; i--) {
            const day = document.createElement('div');
            day.className = 'day other-month';
            day.textContent = prevLastDay - i + 1;
            calendarDays.appendChild(day);
        }
        
        // Add days of current month
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const day = document.createElement('div');
            day.className = 'day';
            day.textContent = i;
            
            // Highlight current day (only if the day, month, and year all match today)
            const today = new Date();
            if (i === today.getDate() && 
                currentDate.getMonth() === today.getMonth() && 
                currentDate.getFullYear() === today.getFullYear()) {
                day.classList.add('today');
            }
            
            // Highlight selected day
            if (i === selectedDate.getDate() && 
                currentDate.getMonth() === selectedDate.getMonth() && 
                currentDate.getFullYear() === selectedDate.getFullYear()) {
                day.classList.add('selected');
            }
            
            // Add click event to select day
            day.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Remove selected class from all days
                document.querySelectorAll('.day').forEach(d => d.classList.remove('selected'));
                // Add selected class to clicked day
                day.classList.add('selected');
                
                // Update selected date and load tasks for that date
                selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
                updateDate();
                loadTasks();
                
                // Close the calendar after selecting a date
                const calendar = document.getElementById('calendar-dropdown');
                const arrow = document.getElementById('calendar-arrow');
                if (calendar) {
                    calendar.classList.remove('show');
                    if (arrow) {
                        arrow.style.transform = 'rotate(0)';
                    }
                }
            });
            
            calendarDays.appendChild(day);
        }
        
        // Add days from next month to complete the grid
        const remainingDays = 42 - (firstDayIndex + lastDay.getDate()); // 6 rows x 7 days = 42
        for (let i = 1; i <= remainingDays; i++) {
            const day = document.createElement('div');
            day.className = 'day other-month';
            day.textContent = i;
            calendarDays.appendChild(day);
        }
    }
    
    // Change month
    function changeMonth(offset) {
        currentDate.setMonth(currentDate.getMonth() + offset);
        renderCalendar();
        // Keep the calendar open when changing months
        const calendar = document.getElementById('calendar-dropdown');
        if (!calendar.classList.contains('show')) {
            calendar.classList.add('show');
        }
    }
    
    // Go to today
    function goToToday() {
        currentDate = new Date();
        selectedDate = new Date();
        renderCalendar();
        updateDate();
    }
    
    // Toggle calendar visibility
    function toggleCalendar(event) {
        event.stopPropagation();
        const calendar = document.getElementById('calendar-dropdown');
        const arrow = document.getElementById('calendar-arrow');
        
        // Close all other open calendars first
        document.querySelectorAll('.calendar-dropdown').forEach(cal => {
            if (cal !== calendar) {
                cal.classList.remove('show');
            }
        });
        
        // Toggle current calendar
        calendar.classList.toggle('show');
        
        // Update arrow rotation
        if (calendar.classList.contains('show')) {
            arrow.style.transform = 'rotate(180deg)';
            // Position the calendar below the trigger
            positionCalendar();
        } else {
            arrow.style.transform = 'rotate(0)';
        }
    }
    
    // Position the calendar below the trigger
    function positionCalendar() {
        const trigger = document.getElementById('date-picker-trigger');
        const calendar = document.getElementById('calendar-dropdown');
        
        if (trigger && calendar) {
            const rect = trigger.getBoundingClientRect();
            // Position the calendar below the trigger with a small gap
            calendar.style.top = `${rect.bottom + window.scrollY + 5}px`;
            // Center the calendar relative to the trigger
            calendar.style.left = `${rect.left + (rect.width / 2)}px`;
            calendar.style.transform = 'translateX(-50%)';
        }
    }

    // Close calendar when clicking outside
    function handleClickOutside(event) {
        const calendar = document.getElementById('calendar-dropdown');
        const trigger = document.getElementById('date-picker-trigger');
        
        if (calendar && trigger && 
            !calendar.contains(event.target) && 
            !trigger.contains(event.target)) {
            calendar.classList.remove('show');
            document.getElementById('calendar-arrow').style.transform = 'rotate(0)';
        }
    }

    // Set up event listeners
    function setupEventListeners() {
        // Month navigation
        document.getElementById('prev-month').addEventListener('click', (e) => {
            e.stopPropagation();
            changeMonth(-1);
        });
        
        document.getElementById('next-month').addEventListener('click', (e) => {
            e.stopPropagation();
            changeMonth(1);
        });
        
        document.getElementById('today-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            goToToday();
            // Close the calendar after selecting today
            const calendar = document.getElementById('calendar-dropdown');
            if (calendar) {
                calendar.classList.remove('show');
                document.getElementById('calendar-arrow').style.transform = 'rotate(0)';
            }
        });
        
        // Toggle calendar when clicking the date picker trigger
        const datePickerTrigger = document.getElementById('date-picker-trigger');
        if (datePickerTrigger) {
            datePickerTrigger.addEventListener('click', toggleCalendar);
        }
        
        // Close calendar when clicking outside
        document.addEventListener('click', closeCalendar);
        
        // Prevent calendar from closing when clicking inside it
        const calendar = document.getElementById('calendar-dropdown');
        if (calendar) {
            calendar.addEventListener('click', function(e) {
                e.stopPropagation();
            });
        }
        
        // Update calendar position on window resize
        window.addEventListener('resize', positionCalendar);

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all tabs
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                // Add active class to clicked tab
                btn.classList.add('active');
                
                // Hide all tab content
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.add('hidden');
                });
                
                // Show selected tab content
                const tabId = btn.getAttribute('data-tab');
                document.getElementById(`${tabId}-view`).classList.remove('hidden');
            });
        });
    }
    
    // Event Listeners
    addTaskBtn.addEventListener('click', () => {
        const taskText = taskInput.value.trim();
        const estHours = estimatedHours.value || '0';
        const estMinutes = estimatedMinutes.value || '0';
        
        if (taskText && (estHours !== '0' || estMinutes !== '0')) {
            // Find the first available time slot or use the first one
            let targetHour = 9; // Default to 9 AM
            const now = new Date();
            const currentHour = now.getHours();
            
            // Try to find a time slot that's either current or in the future
            for (let h = currentHour; h <= 17; h++) {
                if (!tasks.some(t => t.hour === h)) {
                    targetHour = h;
                    break;
                }
            }
            
            saveTask(targetHour, taskText, { hours: estHours, minutes: estMinutes });
            updateTaskDisplay(targetHour);
            
            // Reset form
            taskInput.value = '';
            estimatedHours.value = '';
            estimatedMinutes.value = '';
            taskInput.focus();
        } else {
            alert('Please enter a task and estimated time (at least 1 minute)');
        }
    });

    // Allow pressing Enter to add a task
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTaskBtn.click();
        }
    });

    // Clear all tasks
    clearAllBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all tasks?')) {
            tasks = [];
            localStorage.removeItem('timeManagementTasks');
            
            // Reset all time slots
            for (let hour = 9; hour <= 17; hour++) {
                updateTaskDisplay(hour);
            }
            
            updateSummary();
        }
    });

    // Initialize the app
    init();
});