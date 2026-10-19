#!/bin/bash

# Personio Monthly Timecard Filling Script
# This script loads environment variables and runs the Cypress test

set -e  # Exit on any error

# Check if PREVIOUS_MONTH parameter is provided (default: true for previous month)
PREVIOUS_MONTH=${1:-true}

# Check if HEADED parameter is provided (default: headless)
HEADED=${2:-false}

if [ "$PREVIOUS_MONTH" = "true" ] || [ "$PREVIOUS_MONTH" = "1" ]; then
    echo "🚀 Starting Personio Previous Month Timecard Filling..."
    PREVIOUS_MONTH_ENV="true"
else
    echo "🚀 Starting Personio Current Month Timecard Filling..."
    PREVIOUS_MONTH_ENV="false"
fi

if [ "$HEADED" = "true" ] || [ "$HEADED" = "1" ]; then
    echo "🖥️ Running in headed mode (browser window visible)"
    HEADED_FLAG="--headed"
else
    echo "🖥️ Running in headless mode (no browser window)"
    HEADED_FLAG="--headless"
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with the following variables:"
    echo "PERSONIO_USERNAME=your_username"
    echo "PERSONIO_PASSWORD=your_password"
    echo "PERSONIO_EMPLOYEE_ID=your_employee_id"
    echo "PERSONIO_COMPANY_DOMAIN=your_company_domain"
    exit 1
fi

# Load environment variables
echo "📋 Loading environment variables..."
source .env

# Check if required variables are set
if [ -z "$PERSONIO_USERNAME" ] || [ -z "$PERSONIO_PASSWORD" ] || [ -z "$PERSONIO_EMPLOYEE_ID" ] || [ -z "$PERSONIO_COMPANY_DOMAIN" ]; then
    echo "❌ Error: Missing required environment variables!"
    echo "Please ensure all required variables are set in .env file:"
    echo "- PERSONIO_USERNAME"
    echo "- PERSONIO_PASSWORD"
    echo "- PERSONIO_EMPLOYEE_ID"
    echo "- PERSONIO_COMPANY_DOMAIN"
    exit 1
fi

echo "✅ Environment variables loaded successfully"
echo "👤 Username: $PERSONIO_USERNAME"
echo "🏢 Company Domain: $PERSONIO_COMPANY_DOMAIN"
echo "🆔 Employee ID: $PERSONIO_EMPLOYEE_ID"

# Export environment variables for Cypress
export PERSONIO_USERNAME
export PERSONIO_PASSWORD
export PERSONIO_EMPLOYEE_ID
export PERSONIO_COMPANY_DOMAIN
export PREVIOUS_MONTH="$PREVIOUS_MONTH_ENV"

# Run the Cypress test with environment variables
echo "🔄 Running Personio monthly filling test..."
echo "🔍 Debug: Environment variables being passed:"
echo "  PERSONIO_USERNAME: '$PERSONIO_USERNAME'"
echo "  PERSONIO_PASSWORD: '$PERSONIO_PASSWORD'"
echo "  PERSONIO_EMPLOYEE_ID: '$PERSONIO_EMPLOYEE_ID'"
echo "  PERSONIO_COMPANY_DOMAIN: '$PERSONIO_COMPANY_DOMAIN'"
echo "  PREVIOUS_MONTH: '$PREVIOUS_MONTH_ENV'"

if npx cypress run \
    --spec "cypress/e2e/personio-monthly-filling.cy.js" \
    $HEADED_FLAG \
    --browser electron; then
    echo "✅ Personio monthly filling completed!"
else
    echo "❌ Personio monthly filling failed — check cypress/logs/fill-empty-timecards-debug.log"
    exit 1
fi 