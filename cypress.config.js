const { defineConfig } = require('cypress')
require('dotenv').config()

module.exports = defineConfig({
  e2e: {
    baseUrl: 'https://www.personio.de',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    // Ensure proper headless execution
    chromeWebSecurity: false,
    experimentalModifyObstructiveThirdPartyCode: false,
    // Try to avoid bot detection
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    setupNodeEvents(on, config) {
      const fs = require('fs')
      const path = require('path')
      const logFile = path.join(__dirname, 'cypress/logs/fill-empty-timecards-debug.log')

      on('task', {
        getEnvVars() {
          return {
            companyDomain: process.env.PERSONIO_COMPANY_DOMAIN || '',
            username: process.env.PERSONIO_USERNAME || '',
            password: process.env.PERSONIO_PASSWORD || '',
            employeeId: process.env.PERSONIO_EMPLOYEE_ID || '',
            previousMonth: process.env.PREVIOUS_MONTH === 'true',
          }
        },
        logToFile(message) {
          const line = `${new Date().toISOString()}: ${message}\n`
          fs.mkdirSync(path.dirname(logFile), { recursive: true })
          fs.appendFileSync(logFile, line)
          // Also mirror to the terminal so headless runs are debuggable
          console.log(message)
          return null
        },
        clearLogFile() {
          fs.mkdirSync(path.dirname(logFile), { recursive: true })
          fs.writeFileSync(logFile, '')
          return null
        },
      })
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.name === 'chrome') {
          // Add arguments to make it look more like a real browser
          launchOptions.args.push('--disable-blink-features=AutomationControlled')
          launchOptions.args.push('--disable-features=VizDisplayCompositor')
          launchOptions.args.push('--disable-web-security')
          launchOptions.args.push('--disable-features=TranslateUI')
          launchOptions.args.push('--disable-ipc-flooding-protection')
          // Remove automation indicators
          launchOptions.args.push('--exclude-switches=enable-automation')
          launchOptions.args.push('--disable-extensions-except')
          launchOptions.args.push('--disable-plugins-except')
        }
        return launchOptions
      })
    },
  },
}) 