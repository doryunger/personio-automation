# Personio Monthly Timecard Filling Automation

This project automates the filling of empty timecards in Personio with realistic work data.

## Features

- ✅ **Random Start Times**: Generates start times between 7:45 AM and 9:05 AM
- ✅ **Realistic Work Hours**: Calculates end times 8.5-9.5 hours after start time
- ✅ **Smart Filtering**: Skips weekends, holidays, full-day time off, and future dates
- ✅ **Partial Time Off Handling**: Automatically adjusts work hours for partial time off (e.g., half-day vacation, partial holidays)
- ✅ **Secure Credentials**: Uses environment variables for sensitive data
- ✅ **UUID Generation**: Properly generates UUIDs for timecard and period IDs
- ✅ **API Integration**: Uses Personio's REST API for reliable updates

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the project root:
```bash
# Personio Credentials
PERSONIO_USERNAME=your_email@company.com
PERSONIO_PASSWORD=your_password
PERSONIO_EMPLOYEE_ID=your_employee_id
PERSONIO_COMPANY_DOMAIN=your-company-domain
```

### 3. Make Script Executable
```bash
chmod +x run-personio-filling.sh
```

## Usage

**Default Behavior**: The script runs in **previous month mode** and **headless mode** by default, making it perfect for automated execution.

### Run the Automation

**Previous Month, Headless (Default):**
```bash
./run-personio-filling.sh
```

**Current Month, Headless:**
```bash
./run-personio-filling.sh false
```

**Previous Month, Headed (with browser window):**
```bash
./run-personio-filling.sh true true
```

**Current Month, Headed (with browser window):**
```bash
./run-personio-filling.sh false true
```

### Run Manually with Cypress

**Current Month, Headless:**
```bash
npx cypress run --spec "cypress/e2e/personio-monthly-filling.cy.js" --env PREVIOUS_MONTH=false --headless
```

**Previous Month, Headed:**
```bash
npx cypress run --spec "cypress/e2e/personio-monthly-filling.cy.js" --env PREVIOUS_MONTH=true --headed
```

## How It Works

1. **Login**: Authenticates with Personio using credentials from `.env`
2. **Target Month**: Determines which month to process:
   - **Previous Month** (default): Processes the previous month's timecards (useful for catching missed days)
   - **Current Month**: Processes the current month's timecards
3. **Fetch Timecards**: Retrieves timecard data for the target month
4. **Filter Empty**: Identifies empty timecards (no periods) that are:
   - Not off days (weekends/holidays marked by Personio)
   - Not full-day time off (sickness, vacation, holidays with 8 hours/480 minutes)
   - For current month: Today or in the past (no future updates)
   - For previous month: All days can be filled (no date restrictions)
5. **Handle Partial Time Off**: For timecards with partial time off (1-479 minutes):
   - Calculates remaining work hours: `8 hours (480 min) - time off duration`
   - Example: If 4 hours (240 min) are taken off, fills remaining 4 hours (240 min)
   - Ensures total work + time off doesn't exceed 8 hours
6. **Generate Data**: Creates realistic work periods with:
   - Random start times (7:45-9:05)
   - Calculated end times:
     - **Normal days**: 8.5-9.5 hours after start time
     - **Partial time off days**: Adjusted to match remaining work hours
   - Proper UUIDs for timecard and period IDs
7. **Update API**: Uses PUT requests to update timecards via Personio API

### Previous Month Mode
Use the `PREVIOUS_MONTH` parameter to fill timecards for the previous month. This is useful when:
- You missed filling some days in the previous month
- You want to ensure all timecards are complete before the month closes
- The system shows the current month by default, but you need to fill previous month data

**Important**: When `PREVIOUS_MONTH=true`, the script will **only** process timecards from the previous month and will **not** touch any current month timecards, even if they are empty.

### Time Off Handling

The script intelligently handles different types of time off:

- **Full-Day Time Off** (8 hours/480 minutes or null duration):
  - Skipped entirely - no work hours are filled
  - Examples: Full-day vacation, full-day sickness, full-day holidays

- **Partial Time Off** (1-479 minutes):
  - Work hours are still filled, but adjusted to match remaining time
  - Formula: `Work Duration = 480 minutes - Time Off Duration`
  - Examples:
    - 4 hours (240 min) off → fills remaining 4 hours (240 min)
    - 2 hours (120 min) off → fills remaining 6 hours (360 min)
    - Half-day holiday → fills remaining half day

This ensures that the total of work hours + time off never exceeds the standard 8-hour work day.

## Security

- ✅ Credentials stored in `.env` file (not in code)
- ✅ `.env` file added to `.gitignore`
- ✅ Environment variables passed securely to Cypress

## Files

- `cypress/e2e/personio-monthly-filling.cy.js` - Main automation script
- `run-personio-filling.sh` - Bash script to run with environment variables
- `.env` - Environment variables (create this file)
- `cypress/logs/` - Debug logs for troubleshooting

## Troubleshooting

Check the debug logs in `cypress/logs/personio-monthly-filling-debug.log` for detailed information about the automation process.

## Automated Scheduling

### Cron Job Setup
The script is configured to run automatically on the first day of each month at 9:30 AM with the `PREVIOUS_MONTH` flag enabled.

**Cron Job Details:**
```bash
30 9 1 * * cd /home/dory/git/personio-automation && ./run-personio-filling.sh >> logs/personio-cron.log 2>&1
```

**What this does:**
- Runs at 9:30 AM on the 1st day of each month
- Automatically fills the previous month's timecards (using default `PREVIOUS_MONTH=true`)
- Runs in headless mode (no browser window, perfect for automated execution)
- Changes to the project directory before running
- Logs output to `logs/personio-cron.log`
- Works reliably for all months (including February with 28/29 days)

**To check if the cron job is active:**
```bash
crontab -l
```

**To view the logs:**
```bash
tail -f logs/personio-cron.log
```

**To test the cron logic:**
```bash
./test-cron-logic.sh
```

## Requirements

- Node.js 18+
- Cypress 14+
- Valid Personio account with API access 